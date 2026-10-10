from __future__ import annotations

from flask import Blueprint, abort, jsonify, request

from ..database import get_db


locations_bp = Blueprint("locations", __name__, url_prefix="/api/locations")


def location_json(row, hours=None) -> dict:
    result = {
        "locationId": row["location_id"],
        "locationName": row["location_name"],
        "campusZone": row["campus_zone"],
        "siteDescription": row["site_description"],
        "latitude": row["latitude"],
        "longitude": row["longitude"],
        "coordinateNote": row["coordinate_note"],
        "locationType": row["location_type"],
        "mealSwipeEligibleForFoodToday": bool(row["meal_swipe_eligible_today"]),
        "ruExpressAcceptedToday": bool(row["ru_express_accepted_today"]),
        "swipeNotes": row["swipe_notes"],
        "hoursBasis": row["hours_basis"],
        "proposedHealthSection": row["proposed_health_section"],
        "reservationSupported": bool(row["reservation_supported"]),
        "staffVerificationSupported": bool(row["staff_verification_supported"]),
        "studentVerificationSupported": bool(row["student_verification_supported"]),
        "productTier": row["product_tier"],
        "verified": bool(row["location_verified"]),
        "verificationNotes": row["verification_notes"],
    }
    if hours is not None:
        result["hours"] = [
            {
                "dayOfWeek": hour["day_of_week"],
                "opensMinute": hour["opens_minute"],
                "closesMinute": hour["closes_minute"],
                "hoursKnown": bool(hour["hours_known"]),
            }
            for hour in hours
        ]
    return result


@locations_bp.get("")
def list_locations():
    zone = request.args.get("campus_zone")
    if zone:
        rows = get_db().execute(
            "SELECT * FROM locations WHERE campus_zone = ? ORDER BY location_name", (zone,)
        ).fetchall()
    else:
        rows = get_db().execute("SELECT * FROM locations ORDER BY campus_zone, location_name").fetchall()
    return jsonify({"locations": [location_json(row) for row in rows], "count": len(rows)})


@locations_bp.get("/<location_id>")
def get_location(location_id: str):
    database = get_db()
    row = database.execute("SELECT * FROM locations WHERE location_id = ?", (location_id,)).fetchone()
    if row is None:
        abort(404, description="Location not found.")
    hours = database.execute(
        "SELECT * FROM location_hours WHERE location_id = ? ORDER BY day_of_week", (location_id,)
    ).fetchall()
    result = location_json(row, hours)
    inventory = database.execute(
        """
        SELECT i.inventory_id, i.availability_status, i.quantity_band,
               i.reported_confidence, i.last_verified, i.proposed_to_stock,
               p.product_id, p.product_name, p.category
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        WHERE i.location_id = ? AND i.proposed_to_stock = 1
        ORDER BY p.category, p.product_name
        """,
        (location_id,),
    ).fetchall()
    result["inventory"] = [
        {
            "inventoryId": item["inventory_id"],
            "productId": item["product_id"],
            "productName": item["product_name"],
            "category": item["category"],
            "availability": item["availability_status"],
            "quantityBand": item["quantity_band"],
            "reportedConfidence": item["reported_confidence"],
            "lastVerified": item["last_verified"],
        }
        for item in inventory
    ]
    return jsonify(result)

