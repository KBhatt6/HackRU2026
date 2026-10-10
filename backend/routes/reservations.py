from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

from flask import Blueprint, abort, jsonify, request

from ..database import get_db, immediate_transaction
from ..ranking import effective_confidence
from .common import read_settings, request_time, require_json


reservations_bp = Blueprint("reservations", __name__, url_prefix="/api/reservations")


def effective_status(row, now) -> str:
    if row["status"] == "Active" and row["expires_at"] <= now.isoformat():
        return "Expired (auto)"
    return row["status"]


def reservation_json(row, now) -> dict:
    status = effective_status(row, now)
    remaining = None
    if status == "Active":
        from ..ranking import parse_datetime

        remaining = max(0, int((parse_datetime(row["expires_at"]) - now).total_seconds() // 60))
    return {
        "reservationId": row["reservation_id"],
        "inventoryId": row["inventory_id"],
        "locationName": row["location_name"] if "location_name" in row.keys() else None,
        "productName": row["product_name"] if "product_name" in row.keys() else None,
        "createdAt": row["created_at"],
        "expiresAt": row["expires_at"],
        "status": status,
        "minutesRemaining": remaining,
        "pickupMethod": row["pickup_method"],
        "paymentMethod": row["payment_method"],
        "quantity": row["quantity"],
        "pickupCodeLast4": row["pickup_code_last4"],
        "collectedAt": row["collected_at"],
    }


@reservations_bp.post("")
def create_reservation():
    payload = require_json(
        ("inventoryId", "reservedByToken", "pickupMethod", "paymentMethod")
    )
    quantity = int(payload.get("quantity", 1))
    if quantity != 1:
        abort(400, description="The prototype permits one reserved unit per request.")

    database = get_db()
    settings = read_settings()
    now = request_time(settings)
    pickup_code = f"RU-{secrets.token_hex(3).upper()}"
    reservation_id = f"RES-{secrets.token_hex(4).upper()}"

    with immediate_transaction(database):
        inventory = database.execute(
            """
            SELECT i.*, l.reservation_supported
            FROM inventory i JOIN locations l ON l.location_id = i.location_id
            WHERE i.inventory_id = ?
            """,
            (payload["inventoryId"],),
        ).fetchone()
        if inventory is None:
            abort(404, description="Inventory record not found.")
        confidence, _ = effective_confidence(
            inventory["reported_confidence"], inventory["last_verified"], now, settings
        )
        can_reserve = (
            bool(inventory["proposed_to_stock"])
            and bool(inventory["reservation_supported"])
            and inventory["availability_status"] in {"Available", "Low stock"}
            and confidence != "Stale report"
        )
        if not can_reserve:
            abort(409, description="This item cannot currently be reserved.")

        active_quantity = database.execute(
            """
            SELECT COALESCE(SUM(quantity), 0)
            FROM reservations
            WHERE inventory_id = ? AND status = 'Active' AND expires_at > ?
            """,
            (payload["inventoryId"], now.isoformat()),
        ).fetchone()[0]
        capacity = inventory["allocatable_units_internal"]
        accepted = active_quantity + quantity <= capacity
        status = "Active" if accepted else "Declined (first come, first served)"
        duration = int(inventory["reservation_minutes"] or settings.get("reservation_minutes", 75))
        expires_at = now + timedelta(minutes=duration)
        database.execute(
            """
            INSERT INTO reservations(
                reservation_id, inventory_id, reserved_by_token, created_at,
                expires_at, status, pickup_method, payment_method, quantity,
                pickup_code_hash, pickup_code_last4
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                reservation_id,
                payload["inventoryId"],
                payload["reservedByToken"],
                now.isoformat(),
                expires_at.isoformat(),
                status,
                payload["pickupMethod"],
                payload["paymentMethod"],
                quantity,
                hashlib.sha256(pickup_code.encode("utf-8")).hexdigest() if accepted else None,
                pickup_code[-4:] if accepted else None,
            ),
        )

    response = {
        "reservationId": reservation_id,
        "inventoryId": payload["inventoryId"],
        "status": status,
        "expiresAt": expires_at.isoformat(),
        "pickupCode": pickup_code if accepted else None,
        "message": (
            "Reserved. Show the pickup code at the location."
            if accepted
            else "The available hold capacity was already claimed."
        ),
    }
    return jsonify(response), 201 if accepted else 409


@reservations_bp.get("/<reservation_id>")
def get_reservation(reservation_id: str):
    database = get_db()
    settings = read_settings()
    now = request_time(settings)
    row = database.execute(
        """
        SELECT r.*, l.location_name, p.product_name
        FROM reservations r
        JOIN inventory i ON i.inventory_id = r.inventory_id
        JOIN locations l ON l.location_id = i.location_id
        JOIN products p ON p.product_id = i.product_id
        WHERE r.reservation_id = ?
        """,
        (reservation_id,),
    ).fetchone()
    if row is None:
        abort(404, description="Reservation not found.")
    return jsonify(reservation_json(row, now))


@reservations_bp.post("/<reservation_id>/cancel")
def cancel_reservation(reservation_id: str):
    payload = require_json(("reservedByToken",))
    database = get_db()
    settings = read_settings()
    now = request_time(settings)
    row = database.execute(
        "SELECT * FROM reservations WHERE reservation_id = ?", (reservation_id,)
    ).fetchone()
    if row is None:
        abort(404, description="Reservation not found.")
    if row["reserved_by_token"] != payload["reservedByToken"]:
        abort(403, description="The reservation token does not match.")
    if effective_status(row, now) != "Active":
        abort(409, description="Only an active reservation can be cancelled.")
    database.execute(
        "UPDATE reservations SET status = 'Cancelled', cancelled_at = ? WHERE reservation_id = ?",
        (now.isoformat(), reservation_id),
    )
    database.commit()
    return jsonify({"reservationId": reservation_id, "status": "Cancelled"})
