from __future__ import annotations

from flask import Blueprint, jsonify

from ..database import get_db


health_bp = Blueprint("health", __name__, url_prefix="/api/health-contacts")


@health_bp.get("")
def list_health_contacts():
    rows = get_db().execute(
        """
        SELECT * FROM health_contacts
        ORDER BY CASE type
            WHEN 'Emergency' THEN 0
            WHEN 'Nurse advice' THEN 1
            WHEN 'Clinic' THEN 2
            WHEN 'Clinic location' THEN 3
            WHEN 'Mental health crisis' THEN 4
            ELSE 5
        END, contact_id
        """
    ).fetchall()
    return jsonify(
        {
            "contacts": [
                {
                    "contactId": row["contact_id"],
                    "name": row["name"],
                    "type": row["type"],
                    "phoneOrContact": row["phone_or_contact"],
                    "whenToUse": row["when_to_use"],
                    "verified": bool(row["verified"]),
                }
                for row in rows
            ],
            "medicalDisclaimer": "RU Relief does not diagnose conditions or provide dosing advice.",
        }
    )
