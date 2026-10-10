from __future__ import annotations


DEMO_TIME = "2026-10-13T14:50:00-04:00"


def reservation_payload(token: str) -> dict:
    return {
        "inventoryId": "INV-029",
        "reservedByToken": token,
        "pickupMethod": "Self pickup",
        "paymentMethod": "Proposed retail swipe",
        "quantity": 1,
    }


def test_low_stock_item_is_first_come_first_served(client, db):
    db.execute("DELETE FROM reservations WHERE inventory_id = 'INV-029'")
    db.commit()

    first = client.post(f"/api/reservations?at={DEMO_TIME}", json=reservation_payload("anon-first"))
    second = client.post(f"/api/reservations?at={DEMO_TIME}", json=reservation_payload("anon-second"))

    assert first.status_code == 201
    assert first.get_json()["status"] == "Active"
    assert first.get_json()["pickupCode"].startswith("RU-")
    assert second.status_code == 409
    assert second.get_json()["status"] == "Declined (first come, first served)"


def test_reservation_can_be_cancelled_by_matching_token(client, db):
    db.execute("DELETE FROM reservations WHERE inventory_id = 'INV-029'")
    db.commit()
    created = client.post(f"/api/reservations?at={DEMO_TIME}", json=reservation_payload("anon-owner"))
    reservation_id = created.get_json()["reservationId"]

    cancelled = client.post(
        f"/api/reservations/{reservation_id}/cancel?at={DEMO_TIME}",
        json={"reservedByToken": "anon-owner"},
    )
    assert cancelled.status_code == 200
    assert cancelled.get_json()["status"] == "Cancelled"


def test_reservation_rejects_wrong_cancellation_token(client, db):
    db.execute("DELETE FROM reservations WHERE inventory_id = 'INV-029'")
    db.commit()
    created = client.post(f"/api/reservations?at={DEMO_TIME}", json=reservation_payload("anon-owner"))
    reservation_id = created.get_json()["reservationId"]

    cancelled = client.post(
        f"/api/reservations/{reservation_id}/cancel?at={DEMO_TIME}",
        json={"reservedByToken": "anon-wrong"},
    )
    assert cancelled.status_code == 403

