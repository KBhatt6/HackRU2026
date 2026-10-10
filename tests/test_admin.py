from __future__ import annotations


DEMO_TIME = "2026-10-13T15:00:00-04:00"


def test_admin_routes_require_staff_header(client):
    assert client.get("/api/admin/summary").status_code == 403


def test_admin_summary_matches_dataset(client, staff_headers):
    response = client.get(
        f"/api/admin/summary?at={DEMO_TIME}", headers=staff_headers
    )
    assert response.status_code == 200
    body = response.get_json()
    assert sum(sum(statuses.values()) for statuses in body["stockByCampusZone"].values()) == 144
    assert sum(item["outOfStock"] for item in body["restockAlerts"]) == 19
    assert sum(item["lowStock"] for item in body["restockAlerts"]) == 25


def test_staff_can_update_inventory(client, staff_headers):
    response = client.patch(
        f"/api/admin/inventory/INV-002?at={DEMO_TIME}",
        headers=staff_headers,
        json={"availabilityStatus": "Available"},
    )
    assert response.status_code == 200
    assert response.get_json()["confidence"] == "Staff verified"
    assert response.get_json()["quantityBand"] == "Good supply"
