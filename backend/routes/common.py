from __future__ import annotations

from datetime import datetime
from functools import wraps
from typing import Any, Optional
from zoneinfo import ZoneInfo

from flask import abort, request

from ..database import get_db


EASTERN = ZoneInfo("America/New_York")


def read_settings() -> dict[str, Any]:
    rows = get_db().execute("SELECT key, value, value_type FROM settings").fetchall()
    settings: dict[str, Any] = {}
    for row in rows:
        value: Any = row["value"]
        if row["value_type"] == "integer":
            value = int(float(value))
        elif row["value_type"] == "number":
            value = float(value)
        elif row["value_type"] == "boolean":
            value = value == "1"
        settings[row["key"]] = value
    return settings


def request_time(settings: Optional[dict[str, Any]] = None) -> datetime:
    requested = request.args.get("at")
    if requested:
        try:
            result = datetime.fromisoformat(requested.replace("Z", "+00:00"))
        except ValueError:
            abort(400, description="The at parameter must be an ISO-8601 datetime.")
        if result.tzinfo is None:
            result = result.replace(tzinfo=EASTERN)
        return result.astimezone(EASTERN)
    return datetime.now(EASTERN)


def require_json(required_fields: tuple[str, ...] = ()) -> dict[str, Any]:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        abort(400, description="A JSON request body is required.")
    missing = [field for field in required_fields if payload.get(field) in (None, "")]
    if missing:
        abort(400, description=f"Missing required fields: {', '.join(missing)}")
    return payload


def require_staff(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if request.headers.get("X-Demo-Role", "").lower() not in {"staff", "admin"}:
            abort(403, description="This prototype endpoint requires the X-Demo-Role: staff header.")
        return view(*args, **kwargs)

    return wrapped
