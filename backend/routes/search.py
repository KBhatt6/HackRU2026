from __future__ import annotations

from flask import Blueprint, abort, jsonify, request

from ..database import get_db
from ..models import SearchResult
from ..ranking import (
    calculate_score,
    confidence_sort_priority,
    effective_confidence,
    open_state,
    reservation_state,
    route_estimate,
)
from .common import read_settings, request_time


search_bp = Blueprint("search", __name__, url_prefix="/api/search")


@search_bp.get("")
def search_inventory():
    query = request.args.get("query", request.args.get("q", "")).strip()
    product_id = request.args.get("product_id")
    campus_zone = request.args.get("campus_zone")
    category = request.args.get("category")
    include_unstocked = request.args.get("include_unstocked", "false").lower() == "true"

    if not any((query, product_id, category)):
        abort(400, description="Provide query, product_id, or category.")

    try:
        latitude = float(request.args["latitude"]) if "latitude" in request.args else None
        longitude = float(request.args["longitude"]) if "longitude" in request.args else None
    except ValueError:
        abort(400, description="latitude and longitude must be numbers.")

    database = get_db()
    settings = read_settings()
    now = request_time(settings)

    sql = """
        SELECT
            i.*, p.product_name, p.category, p.simple_definition,
            p.typical_use, p.label_caution,
            l.location_name, l.campus_zone, l.site_description,
            l.latitude, l.longitude, l.meal_swipe_eligible_today,
            l.ru_express_accepted_today,
            h.opens_minute, h.closes_minute, h.hours_known
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        JOIN locations l ON l.location_id = i.location_id
        LEFT JOIN location_hours h
          ON h.location_id = l.location_id AND h.day_of_week = ?
        WHERE 1 = 1
    """
    params: list = [now.weekday()]
    if not include_unstocked:
        sql += " AND i.proposed_to_stock = 1"
    if product_id:
        sql += " AND p.product_id = ?"
        params.append(product_id)
    if category:
        sql += " AND p.category = ?"
        params.append(category)
    if query:
        sql += " AND (p.product_name LIKE ? OR p.category LIKE ? OR p.active_ingredient_or_type LIKE ?)"
        wildcard = f"%{query}%"
        params.extend([wildcard, wildcard, wildcard])
    if campus_zone:
        sql += " AND l.campus_zone = ?"
        params.append(campus_zone)

    rows = database.execute(sql, params).fetchall()
    results: list[SearchResult] = []
    for row in rows:
        confidence, age = effective_confidence(
            row["reported_confidence"], row["last_verified"], now, settings
        )
        is_open, closes_at, closing_soon = open_state(
            row["opens_minute"], row["closes_minute"], bool(row["hours_known"]), now
        )
        distance_km, travel_minutes = route_estimate(
            latitude, longitude, row["latitude"], row["longitude"], settings
        )
        reserve_state = reservation_state(
            row["availability_status"], confidence, bool(row["proposed_to_stock"])
        )
        if not bool(row["reservation_supported"] if "reservation_supported" in row.keys() else 1):
            reserve_state = "No"
        score = calculate_score(
            row["availability_status"], confidence, is_open, travel_minutes, settings
        )
        results.append(
            SearchResult(
                inventoryId=row["inventory_id"],
                productId=row["product_id"],
                productName=row["product_name"],
                category=row["category"],
                simpleDefinition=row["simple_definition"],
                typicalUse=row["typical_use"],
                labelCaution=row["label_caution"],
                locationId=row["location_id"],
                locationName=row["location_name"],
                campusZone=row["campus_zone"],
                siteDescription=row["site_description"],
                latitude=row["latitude"],
                longitude=row["longitude"],
                availability=row["availability_status"],
                quantityBand=row["quantity_band"],
                confidence=confidence,
                minutesSinceVerified=age,
                lastVerified=row["last_verified"],
                isOpen=is_open,
                closesAt=closes_at,
                closingSoon=closing_soon,
                distanceKm=distance_km,
                travelMinutes=travel_minutes,
                reservationState=reserve_state,
                reservationMinutes=row["reservation_minutes"],
                retailSwipeStatus=row["retail_swipe_status"],
                paymentOptions=row["payment_options"],
                mealSwipeEligibleForFoodToday=bool(row["meal_swipe_eligible_today"]),
                ruExpressAcceptedToday=bool(row["ru_express_accepted_today"]),
                quantityLimit=row["quantity_limit"],
                score=score,
            )
        )

    results.sort(
        key=lambda item: (
            item.isOpen is True,
            item.availability not in {"Out of stock", "Temporarily unavailable", "Not stocked in proposal"},
            confidence_sort_priority(item.confidence),
            item.score,
        ),
        reverse=True,
    )
    return jsonify(
        {
            "query": {
                "text": query or None,
                "productId": product_id,
                "category": category,
                "campusZone": campus_zone,
                "at": now.isoformat(),
            },
            "results": [item.to_dict() for item in results],
            "count": len(results),
            "prototypeDisclosure": (
                "Medicine stock and health-item retail swipe acceptance are simulated/proposed, not current Rutgers services."
            ),
        }
    )
