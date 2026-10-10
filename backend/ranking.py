from __future__ import annotations

from datetime import datetime
from math import asin, cos, radians, sin, sqrt
from typing import Any, Mapping, Optional, Tuple, Union
from zoneinfo import ZoneInfo


EASTERN = ZoneInfo("America/New_York")

AVAILABILITY_SCORES = {
    "Available": 1.0,
    "Low stock": 0.65,
    "Unknown": 0.25,
    "Out of stock": 0.0,
    "Temporarily unavailable": 0.0,
    "Not stocked in proposal": 0.0,
}

CONFIDENCE_SCORES = {
    "Staff verified": 1.0,
    "Authorized student verified": 0.85,
    "Multiple student reports": 0.75,
    "Single student report": 0.55,
    "Stale report": 0.20,
    "Unverified prototype data": 0.10,
    "n/a": 0.0,
}


def parse_datetime(value: Optional[Union[str, datetime]]) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        result = value
    else:
        result = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if result.tzinfo is None:
        result = result.replace(tzinfo=EASTERN)
    return result.astimezone(EASTERN)


def minutes_since(last_verified: Optional[Union[str, datetime]], now: datetime) -> Optional[int]:
    verified = parse_datetime(last_verified)
    if verified is None:
        return None
    return max(0, int((now.astimezone(EASTERN) - verified).total_seconds() // 60))


def confidence_validity_minutes(reported_confidence: str, settings: Mapping[str, Any]) -> Optional[int]:
    if reported_confidence == "Staff verified":
        return int(settings.get("staff_report_validity_min", 240))
    if reported_confidence in {
        "Authorized student verified",
        "Multiple student reports",
        "Single student report",
    }:
        return int(settings.get("student_report_validity_min", 60))
    return None


def effective_confidence(
    reported_confidence: str,
    last_verified: Optional[Union[str, datetime]],
    now: datetime,
    settings: Mapping[str, Any],
) -> Tuple[str, Optional[int]]:
    age = minutes_since(last_verified, now)
    validity = confidence_validity_minutes(reported_confidence, settings)
    if age is not None and validity is not None and age > validity:
        return "Stale report", age
    return reported_confidence, age


def minute_of_day(time_text: Optional[str]) -> Optional[int]:
    if not time_text:
        return None
    hour, minute = (int(part) for part in time_text.split(":"))
    return hour * 60 + minute


def format_minute(minute: Optional[int]) -> Optional[str]:
    if minute is None:
        return None
    if minute == 1440:
        return "24:00"
    return f"{minute // 60:02d}:{minute % 60:02d}"


def open_state(
    opens_minute: Optional[int],
    closes_minute: Optional[int],
    hours_known: bool,
    now: datetime,
) -> Tuple[Optional[bool], Optional[str], bool]:
    if not hours_known or opens_minute is None or closes_minute is None:
        return None, None, False
    current = now.astimezone(EASTERN).hour * 60 + now.astimezone(EASTERN).minute
    is_open = opens_minute <= current < closes_minute
    minutes_until_close = closes_minute - current if is_open else None
    closing_soon = minutes_until_close is not None and 0 <= minutes_until_close <= 45
    return is_open, format_minute(closes_minute), closing_soon


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0088
    d_lat = radians(lat2 - lat1)
    d_lon = radians(lon2 - lon1)
    a = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon / 2) ** 2
    return 2 * earth_radius_km * asin(sqrt(a))


def route_estimate(
    user_latitude: Optional[float],
    user_longitude: Optional[float],
    location_latitude: Optional[float],
    location_longitude: Optional[float],
    settings: Mapping[str, Any],
) -> Tuple[Optional[float], Optional[int]]:
    if None in (user_latitude, user_longitude, location_latitude, location_longitude):
        return None, None
    straight_line = haversine_km(
        float(user_latitude),
        float(user_longitude),
        float(location_latitude),
        float(location_longitude),
    )
    route_distance = straight_line * float(settings.get("route_detour_factor", 1.3))
    walking_speed = float(settings.get("walking_speed_kmh", 4.8))
    walk_minutes = round((route_distance / walking_speed) * 60)
    return round(route_distance, 2), max(1, walk_minutes)


def reservation_state(availability: str, confidence: str, proposed_to_stock: bool) -> str:
    if not proposed_to_stock:
        return "No"
    if availability not in {"Available", "Low stock"}:
        return "No"
    if confidence == "Stale report":
        return "Verify first"
    return "Yes"


def calculate_score(
    availability: str,
    confidence: str,
    is_open: Optional[bool],
    travel_minutes: Optional[int],
    settings: Mapping[str, Any],
) -> float:
    availability_score = AVAILABILITY_SCORES.get(availability, 0.0)
    confidence_score = CONFIDENCE_SCORES.get(confidence, 0.0)
    proximity_score = 0.5 if travel_minutes is None else max(0.0, 1.0 - travel_minutes / 60.0)
    open_score = 1.0 if is_open is True else 0.25 if is_open is None else 0.0

    score = (
        availability_score * float(settings.get("weight_availability", 0.4))
        + confidence_score * float(settings.get("weight_confidence", 0.25))
        + proximity_score * float(settings.get("weight_proximity", 0.2))
        + open_score * float(settings.get("weight_open_hours", 0.15))
    )
    if confidence == "Stale report":
        score -= float(settings.get("stale_penalty", 0.2))
    return round(max(0.0, score), 4)
