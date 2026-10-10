from __future__ import annotations


def scalar(db, sql: str, params=()):
    return db.execute(sql, params).fetchone()[0]


def test_dataset_counts(db):
    assert scalar(db, "SELECT COUNT(*) FROM locations") == 8
    assert scalar(db, "SELECT COUNT(*) FROM products") == 28
    assert scalar(db, "SELECT COUNT(*) FROM inventory") == 224
    assert scalar(db, "SELECT COUNT(*) FROM inventory WHERE proposed_to_stock = 1") == 144
    assert scalar(db, "SELECT COUNT(*) FROM verification_reports") == 20
    assert scalar(db, "SELECT COUNT(*) FROM reservations") == 10
    assert scalar(db, "SELECT COUNT(*) FROM health_contacts") == 13


def test_each_zone_has_two_locations(db):
    rows = db.execute(
        "SELECT campus_zone, COUNT(*) FROM locations GROUP BY campus_zone"
    ).fetchall()
    assert {row[0]: row[1] for row in rows} == {
        "College Avenue": 2,
        "Busch": 2,
        "Livingston": 2,
        "Cook/Douglass": 2,
    }


def test_cook_cafe_is_unverified_and_has_no_coordinates(db):
    row = db.execute("SELECT * FROM locations WHERE location_id = 'L07'").fetchone()
    assert row["location_name"] == "Cook Cafe"
    assert row["location_verified"] == 0
    assert row["latitude"] is None
    assert row["longitude"] is None


def test_all_inventory_foreign_keys_resolve(db):
    assert scalar(
        db,
        """
        SELECT COUNT(*) FROM inventory i
        LEFT JOIN locations l ON l.location_id = i.location_id
        LEFT JOIN products p ON p.product_id = i.product_id
        WHERE l.location_id IS NULL OR p.product_id IS NULL
        """,
    ) == 0

