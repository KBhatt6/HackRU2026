from __future__ import annotations

from datetime import datetime

from flask import Blueprint, abort, jsonify

from ..database import get_db
from .common import read_settings, request_time, require_json, require_staff
from .reports import update_inventory_from_report


admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/summary")
@require_staff
def admin_summary():
    database = get_db()
    settings = read_settings()
    now = request_time(settings)

    stock_rows = database.execute(
        """
        SELECT l.campus_zone, i.availability_status, COUNT(*) AS records
        FROM inventory i JOIN locations l ON l.location_id = i.location_id
        WHERE i.proposed_to_stock = 1
        GROUP BY l.campus_zone, i.availability_status
        ORDER BY l.campus_zone, i.availability_status
        """
    ).fetchall()
    stock_by_zone: dict[str, dict[str, int]] = {}
    for row in stock_rows:
        stock_by_zone.setdefault(row["campus_zone"], {})[row["availability_status"]] = row["records"]

    alerts = database.execute(
        """
        SELECT l.location_id, l.location_name,
               SUM(CASE WHEN i.availability_status = 'Out of stock' THEN 1 ELSE 0 END) AS out_of_stock,
               SUM(CASE WHEN i.availability_status = 'Low stock' THEN 1 ELSE 0 END) AS low_stock
        FROM locations l JOIN inventory i ON i.location_id = l.location_id
        WHERE i.proposed_to_stock = 1
        GROUP BY l.location_id, l.location_name
        ORDER BY (out_of_stock + low_stock) DESC, l.location_name
        """
    ).fetchall()

    reservation_rows = database.execute("SELECT status, expires_at FROM reservations").fetchall()
    reservation_counts: dict[str, int] = {}
    for row in reservation_rows:
        status = row["status"]
        if status == "Active" and row["expires_at"] <= now.isoformat():
            status = "Expired (auto)"
        reservation_counts[status] = reservation_counts.get(status, 0) + 1

    pending_reports = database.execute(
        "SELECT COUNT(*) FROM verification_reports WHERE verification_outcome = 'Pending photo review'"
    ).fetchone()[0]
    stale_inventory = database.execute(
        """
        SELECT COUNT(*) FROM inventory
        WHERE proposed_to_stock = 1
          AND last_verified IS NOT NULL
          AND (
            (reported_confidence = 'Staff verified' AND
             (julianday(?) - julianday(last_verified)) * 1440 > ?)
            OR
            (reported_confidence = 'Verified student report' AND
             (julianday(?) - julianday(last_verified)) * 1440 > ?)
          )
        """,
        (
            now.isoformat(),
            int(settings.get("staff_report_validity_min", 240)),
            now.isoformat(),
            int(settings.get("student_report_validity_min", 60)),
        ),
    ).fetchone()[0]

    return jsonify(
        {
            "at": now.isoformat(),
            "stockByCampusZone": stock_by_zone,
            "restockAlerts": [
                {
                    "locationId": row["location_id"],
                    "locationName": row["location_name"],
                    "outOfStock": row["out_of_stock"],
                    "lowStock": row["low_stock"],
                    "totalAlerts": row["out_of_stock"] + row["low_stock"],
                }
                for row in alerts
            ],
            "staleInventoryRecords": stale_inventory,
            "pendingPhotoReviews": pending_reports,
            "reservations": reservation_counts,
        }
    )


@admin_bp.get("/reports/pending")
@require_staff
def pending_reports():
    rows = get_db().execute(
        """
        SELECT r.report_id, r.inventory_id, r.reporter_role, r.reported_status,
               r.reported_at, r.geofence_distance_m, r.geofence_result,
               r.photo_attached, r.photo_review,
               l.location_name, p.product_name
        FROM verification_reports r
        JOIN inventory i ON i.inventory_id = r.inventory_id
        JOIN locations l ON l.location_id = i.location_id
        JOIN products p ON p.product_id = i.product_id
        WHERE r.verification_outcome = 'Pending photo review'
        ORDER BY r.reported_at
        """
    ).fetchall()
    return jsonify(
        {
            "reports": [
                {
                    "reportId": row["report_id"],
                    "inventoryId": row["inventory_id"],
                    "locationName": row["location_name"],
                    "productName": row["product_name"],
                    "reporterRole": row["reporter_role"],
                    "reportedStatus": row["reported_status"],
                    "reportedAt": row["reported_at"],
                    "geofenceDistanceMeters": row["geofence_distance_m"],
                    "geofenceResult": row["geofence_result"],
                    "photoAttached": bool(row["photo_attached"]),
                    "photoReview": row["photo_review"],
                }
                for row in rows
            ]
        }
    )


@admin_bp.post("/reports/<report_id>/approve")
@require_staff
def approve_report(report_id: str):
    payload = require_json(("reviewedByToken",))
    database = get_db()
    settings = read_settings()
    now = request_time(settings)
    report = database.execute(
        "SELECT * FROM verification_reports WHERE report_id = ?", (report_id,)
    ).fetchone()
    if report is None:
        abort(404, description="Report not found.")
    if report["verification_outcome"] != "Pending photo review":
        abort(409, description="Only a pending report can be approved.")
    database.execute(
        """
        UPDATE verification_reports
        SET photo_review = 'Approved',
            verification_outcome = 'Accepted (photo + location verified)',
            reviewed_at = ?, reviewed_by_token = ?
        WHERE report_id = ?
        """,
        (now.isoformat(), payload["reviewedByToken"], report_id),
    )
    update_inventory_from_report(database, report_id)
    database.commit()
    return jsonify({"reportId": report_id, "verificationOutcome": "Accepted (photo + location verified)"})


@admin_bp.post("/reports/<report_id>/reject")
@require_staff
def reject_report(report_id: str):
    payload = require_json(("reviewedByToken",))
    database = get_db()
    settings = read_settings()
    now = request_time(settings)
    report = database.execute(
        "SELECT * FROM verification_reports WHERE report_id = ?", (report_id,)
    ).fetchone()
    if report is None:
        abort(404, description="Report not found.")
    if report["verification_outcome"] != "Pending photo review":
        abort(409, description="Only a pending report can be rejected.")
    database.execute(
        """
        UPDATE verification_reports
        SET photo_review = 'Rejected', verification_outcome = 'Rejected (photo review)',
            reviewed_at = ?, reviewed_by_token = ?
        WHERE report_id = ?
        """,
        (now.isoformat(), payload["reviewedByToken"], report_id),
    )
    database.commit()
    return jsonify({"reportId": report_id, "verificationOutcome": "Rejected (photo review)"})


@admin_bp.patch("/inventory/<inventory_id>")
@require_staff
def update_inventory(inventory_id: str):
    payload = require_json(("availabilityStatus",))
    status = payload["availabilityStatus"]
    allowed = {"Available", "Low stock", "Out of stock", "Unknown", "Temporarily unavailable"}
    if status not in allowed:
        abort(400, description="Unsupported availabilityStatus.")
    quantity_band = {
        "Available": "Good supply",
        "Low stock": "Few left",
        "Out of stock": "None",
        "Unknown": "Unknown",
        "Temporarily unavailable": "Unavailable",
    }[status]
    capacity = 2 if status == "Available" else 1 if status == "Low stock" else 0
    database = get_db()
    settings = read_settings()
    now = request_time(settings)
    cursor = database.execute(
        """
        UPDATE inventory
        SET availability_status = ?, quantity_band = ?, reported_confidence = 'Staff verified',
            last_verified = ?, allocatable_units_internal = ?, updated_at = ?
        WHERE inventory_id = ?
        """,
        (status, quantity_band, now.isoformat(), capacity, now.isoformat(), inventory_id),
    )
    if cursor.rowcount == 0:
        abort(404, description="Inventory record not found.")
    database.commit()
    return jsonify(
        {
            "inventoryId": inventory_id,
            "availabilityStatus": status,
            "quantityBand": quantity_band,
            "confidence": "Staff verified",
            "lastVerified": now.isoformat(),
        }
    )


@admin_bp.post("/reservations/<reservation_id>/collect")
@require_staff
def collect_reservation(reservation_id: str):
    payload = require_json(("pickupCode",))
    import hashlib

    database = get_db()
    settings = read_settings()
    now = request_time(settings)
    row = database.execute(
        "SELECT * FROM reservations WHERE reservation_id = ?", (reservation_id,)
    ).fetchone()
    if row is None:
        abort(404, description="Reservation not found.")
    if row["status"] != "Active" or row["expires_at"] <= now.isoformat():
        abort(409, description="The reservation is not active.")
    supplied_hash = hashlib.sha256(payload["pickupCode"].encode("utf-8")).hexdigest()
    if supplied_hash != row["pickup_code_hash"]:
        abort(403, description="Pickup code is incorrect.")
    database.execute(
        "UPDATE reservations SET status = 'Collected', collected_at = ? WHERE reservation_id = ?",
        (now.isoformat(), reservation_id),
    )
    database.commit()
    return jsonify({"reservationId": reservation_id, "status": "Collected", "collectedAt": now.isoformat()})
