from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from backend.ranking import calculate_score, effective_confidence, open_state


EASTERN = ZoneInfo("America/New_York")


def test_student_report_becomes_stale_after_sixty_minutes():
    now = datetime(2026, 10, 13, 15, 0, tzinfo=EASTERN)
    confidence, age = effective_confidence(
        "Single student report",
        "2026-10-13T13:25:00-04:00",
        now,
        {"student_report_validity_min": 60},
    )
    assert confidence == "Stale report"
    assert age == 95


def test_staff_report_remains_valid_for_four_hours():
    now = datetime(2026, 10, 13, 15, 0, tzinfo=EASTERN)
    confidence, age = effective_confidence(
        "Staff verified",
        "2026-10-13T12:30:00-04:00",
        now,
        {"staff_report_validity_min": 240},
    )
    assert confidence == "Staff verified"
    assert age == 150


def test_location_closing_in_thirty_minutes_is_flagged():
    now = datetime(2026, 10, 13, 15, 0, tzinfo=EASTERN)
    is_open, closes_at, closing_soon = open_state(600, 930, True, now)
    assert is_open is True
    assert closes_at == "15:30"
    assert closing_soon is True


def test_stale_penalty_lowers_score():
    settings = {
        "weight_availability": 0.4,
        "weight_confidence": 0.25,
        "weight_proximity": 0.2,
        "weight_open_hours": 0.15,
        "stale_penalty": 0.2,
    }
    fresh = calculate_score("Available", "Staff verified", True, 5, settings)
    stale = calculate_score("Available", "Stale report", True, 5, settings)
    assert fresh > stale

