from __future__ import annotations

from flask import Blueprint, abort, jsonify, request

from ..database import get_db


products_bp = Blueprint("products", __name__, url_prefix="/api/products")


def product_json(row) -> dict:
    return {
        "productId": row["product_id"],
        "productName": row["product_name"],
        "category": row["category"],
        "activeIngredientOrType": row["active_ingredient_or_type"],
        "simpleDefinition": row["simple_definition"],
        "typicalUse": row["typical_use"],
        "labelCaution": row["label_caution"],
        "productTier": row["product_tier"],
        "quantityLimit": row["quantity_limit_per_transaction"],
        "requiresStaffAssistance": bool(row["requires_staff_assistance"]),
        "retailSwipeStatus": row["retail_swipe_status"],
    }


@products_bp.get("")
def list_products():
    category = request.args.get("category")
    search = request.args.get("q", "").strip()
    sql = "SELECT * FROM products WHERE 1 = 1"
    params: list[str] = []
    if category:
        sql += " AND category = ?"
        params.append(category)
    if search:
        sql += " AND (product_name LIKE ? OR category LIKE ? OR active_ingredient_or_type LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard])
    sql += " ORDER BY category, product_name"
    rows = get_db().execute(sql, params).fetchall()
    return jsonify({"products": [product_json(row) for row in rows], "count": len(rows)})


@products_bp.get("/<product_id>")
def get_product(product_id: str):
    database = get_db()
    row = database.execute("SELECT * FROM products WHERE product_id = ?", (product_id,)).fetchone()
    if row is None:
        abort(404, description="Product not found.")
    result = product_json(row)
    locations = database.execute(
        """
        SELECT i.inventory_id, i.availability_status, i.quantity_band,
               i.reported_confidence, i.last_verified, i.proposed_to_stock,
               l.location_id, l.location_name, l.campus_zone
        FROM inventory i
        JOIN locations l ON l.location_id = i.location_id
        WHERE i.product_id = ?
        ORDER BY l.campus_zone, l.location_name
        """,
        (product_id,),
    ).fetchall()
    result["locations"] = [
        {
            "inventoryId": item["inventory_id"],
            "locationId": item["location_id"],
            "locationName": item["location_name"],
            "campusZone": item["campus_zone"],
            "proposedToStock": bool(item["proposed_to_stock"]),
            "availability": item["availability_status"],
            "quantityBand": item["quantity_band"],
            "reportedConfidence": item["reported_confidence"],
            "lastVerified": item["last_verified"],
        }
        for item in locations
    ]
    return jsonify(result)

