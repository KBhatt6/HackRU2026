from __future__ import annotations

from pathlib import Path

import pytest

from backend import create_app
from backend.database import connect
from backend.seed import DEFAULT_WORKBOOK, seed_database


@pytest.fixture()
def database_path(tmp_path: Path) -> Path:
    path = tmp_path / "test_ru_relief.db"
    seed_database(DEFAULT_WORKBOOK, path)
    return path


@pytest.fixture()
def app(database_path: Path):
    app = create_app(
        {
            "TESTING": True,
            "DATABASE": str(database_path),
        }
    )
    yield app


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def db(database_path: Path):
    connection = connect(database_path)
    yield connection
    connection.close()


@pytest.fixture()
def staff_headers():
    return {"X-Demo-Role": "staff"}

