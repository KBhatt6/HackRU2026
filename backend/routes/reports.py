from __future__ import annotations

import secrets
from datetime import timedelta

from flask import Blueprint, abort, jsonify

from ..database import get_db
from ..ranking import haversine_km
from .common import read_settings, request_time, require_json


reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")

ALLOWED_ROLES = {"Rutgers staff", "Authorized student", "Student (basic)"}
ALLOWED_STATUSES = {"Available", "Low stock", "Out of stock", "Unknown", "Temporarily unavailable"}


def update_inventory_from_report(database, report_id: str) -> None:
    report = database.execute(
        "SELECT * FROM verification_reports WHERE report_id = ?", (report_id,)
    ).fetchone()
    if report is None:
        return
    if report["reporter_role"] == "Rutgers staff":
        confidence = "Staff verified"
    elif report["reporter_role"] == "Authorized student":
        confidence = "Verified student report"
    else:
        matching = database.execute(
            """
            SELECT COUNT(*)
            FROM verification_reports
            WHERE inventory_id = ? AND reported_status = ?
              AND reporter_role = 'Student (basic)'
              AND verification_outcome = 'Counted (basic student report)'
              AND expires_at >= ?
            """,
            (report["inventory_id"], report["reported_status"], report["reported_at"]),
        ).fetchone()[0]
        confidence = "Verified student report"

    status = report["reported_status"]
    quantity_band = {
        "Available": "Good supply",
        "Low stock": "Few left",
        "Out of stock": "None",
        "Unknown": "Unknown",
        "Temporarily unavailable": "Unavailable",
    }[status]
    capacity = 2 if status == "Available" else 1 if status == "Low stock" else 0
    database.execute(
        """
        UPDATE inventory
        SET availability_status = ?, quantity_band = ?, reported_confidence = ?,
            last_verified = ?, allocatable_units_internal = ?, updated_at = ?
        WHERE inventory_id = ?
        """,
        (
            status,
            quantity_band,
            confidence,
            report["reported_at"],
            capacity,
            report["reported_at"],
            report["inventory_id"],
        ),
    )


@reports_bp.post("")
def create_report():
    payload = require_json(("inventoryId", "reporterRole", "reporterToken", "reportedStatus"))
    role = payload["reporterRole"]
    status = payload["reportedStatus"]
    if role not in ALLOWED_ROLES:
        abort(400, description="Unsupported reporterRole.")
    if status not in ALLOWED_STATUSES:
        abort(400, description="Unsupported reportedStatus.")

    database = get_db()
    inventory = database.execute(
        """
        SELECT i.inventory_id, l.latitude, l.longitude
        FROM inventory i JOIN locations l ON l.location_id = i.location_id
        WHERE i.inventory_id = ?
        """,
        (payload["inventoryId"],),
    ).fetchone()
    if inventory is None:
        abort(404, description="Inventory record not found.")

    settings = read_settings()
    now = request_time(settings)
    radius = float(settings.get("geofence_radius_m", 150))
    distance_m = None
    geofence_result = "n/a (staff)"
    if role != "Rutgers staff":
        if payload.get("latitude") is None or payload.get("longitude") is None:
            abort(400, description="Student reports require latitude and longitude for the one-time geofence check.")
        if inventory["latitude"] is None or inventory["longitude"] is None:
            abort(409, description="This location has no verified coordinates, so student reporting is unavailable.")
        distance_m = round(
            haversine_km(
                float(payload["latitude"]),
                float(payload["longitude"]),
                inventory["latitude"],
                inventory["longitude"],
            )
            * 1000,
            1,
        )
        geofence_result = "Pass" if distance_m <= radius else "Fail"

    photo_attached = bool(payload.get("photoAttached", False))
    if role == "Rutgers staff":
        outcome = "Accepted (staff)"
        photo_review = "n/a"
        validity = int(settings.get("staff_report_validity_min", 240))
    elif geofence_result == "Fail":
        outcome = "Rejected (outside geofence)"
        photo_review = "Pending" if photo_attached else "n/a"
        validity = int(settings.get("student_report_validity_min", 60))
    elif role == "Authorized student":
        if not photo_attached:
            abort(400, description="Authorized-student verification requires a photo.")
        outcome = "Pending photo review"
        photo_review = "Pending"
        validity = int(settings.get("student_report_validity_min", 60))
    else:
        outcome = "Counted (basic student report)"
        photo_review = "n/a"
        validity = int(settings.get("student_report_validity_min", 60))

    report_id = f"R-{secrets.token_hex(4).upper()}"
    expires_at = now + timedelta(minutes=validity)
    database.execute(
        """
        INSERT INTO verification_reports(
            report_id, inventory_id, reporter_role, reporter_token,
            reported_status, reported_at, geofence_distance_m,
            geofence_radius_m, geofence_result, photo_attached,
            photo_review, verification_outcome, validity_minutes, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            report_id,
            payload["inventoryId"],
            role,
            payload["reporterToken"],
            status,
            now.isoformat(),
            distance_m,
            radius,
            geofence_result,
            int(photo_attached),
            photo_review,
            outcome,
            validity,
            expires_at.isoformat(),
        ),
    )
    if outcome in {"Accepted (staff)", "Counted (basic student report)"}:
        update_inventory_from_report(database, report_id)
    database.commit()
    return (
        jsonify(
            {
                "reportId": report_id,
                "verificationOutcome": outcome,
                "geofenceResult": geofence_result,
                "geofenceDistanceMeters": distance_m,
                "expiresAt": expires_at.isoformat(),
                "privacy": "Raw coordinates and photo bytes were not stored by this endpoint.",
            }
        ),
        201,
    )
