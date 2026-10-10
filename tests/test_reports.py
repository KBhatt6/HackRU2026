from __future__ import annotations


DEMO_TIME = "2026-10-13T15:00:00-04:00"


def test_authorized_student_report_requires_photo(client):
    response = client.post(
        f"/api/reports?at={DEMO_TIME}",
        json={
            "inventoryId": "INV-120",
            "reporterRole": "Authorized student",
            "reporterToken": "anon-test",
            "reportedStatus": "Available",
            "latitude": 40.523332,
            "longitude": -74.460857,
            "photoAttached": False,
        },
    )
    assert response.status_code == 400


def test_authorized_student_report_is_queued_without_storing_coordinates(client, db):
    response = client.post(
        f"/api/reports?at={DEMO_TIME}",
        json={
            "inventoryId": "INV-120",
            "reporterRole": "Authorized student",
            "reporterToken": "anon-test",
            "reportedStatus": "Available",
            "latitude": 40.523332,
            "longitude": -74.460857,
            "photoAttached": True,
        },
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["verificationOutcome"] == "Pending photo review"
    columns = {row[1] for row in db.execute("PRAGMA table_info(verification_reports)").fetchall()}
    assert "latitude" not in columns
    assert "longitude" not in columns


def test_outside_geofence_is_rejected(client):
    response = client.post(
        f"/api/reports?at={DEMO_TIME}",
        json={
            "inventoryId": "INV-120",
            "reporterRole": "Student (basic)",
            "reporterToken": "anon-far",
            "reportedStatus": "Available",
            "latitude": 40.53,
            "longitude": -74.47,
        },
    )
    assert response.status_code == 201
    assert response.get_json()["verificationOutcome"] == "Rejected (outside geofence)"

