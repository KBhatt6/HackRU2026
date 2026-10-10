from __future__ import annotations


DEMO_TIME = "2026-10-13T15:00:00-04:00"


def test_livingston_ad_vil_falls_back_to_henrys(client):
    response = client.get(
        "/api/search",
        query_string={
            "query": "Advil",
            "campus_zone": "Livingston",
            "at": "2026-10-13T16:00:00-04:00",
        },
    )
    assert response.status_code == 200
    results = response.get_json()["results"]
    assert results[0]["locationName"] == "Henry's Diner"
    assert results[0]["availability"] == "Low stock"
    kilmers = next(item for item in results if item["locationName"] == "Kilmer's Market")
    assert kilmers["availability"] == "Out of stock"


def test_bus_mucinex_ranks_fresh_staff_report_above_stale_student_report(client):
    response = client.get(
        "/api/search",
        query_string={"query": "Mucinex", "campus_zone": "Busch", "at": DEMO_TIME},
    )
    assert response.status_code == 200
    results = response.get_json()["results"]
    assert results[0]["locationName"] == "Harvest Juice Bar"
    assert results[0]["confidence"] == "Staff verified"
    assert results[0]["closingSoon"] is True
    woodys = next(item for item in results if item["locationName"] == "Woody's Cafe")
    assert woodys["confidence"] == "Stale report"
    assert woodys["reservationState"] == "Verify first"


def test_search_rejects_empty_request(client):
    response = client.get("/api/search")
    assert response.status_code == 400


def test_search_discloses_simulated_program(client):
    response = client.get(
        "/api/search",
        query_string={"query": "Tylenol", "campus_zone": "College Avenue", "at": DEMO_TIME},
    )
    assert "simulated/proposed" in response.get_json()["prototypeDisclosure"]

