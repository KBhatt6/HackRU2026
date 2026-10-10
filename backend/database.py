from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from flask import current_app, g


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATABASE = PROJECT_ROOT / "database" / "ru_relief.db"
SCHEMA_PATH = PROJECT_ROOT / "database" / "schema.sql"


def connect(database_path: str | Path = DEFAULT_DATABASE) -> sqlite3.Connection:
    path = Path(database_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, detect_types=sqlite3.PARSE_DECLTYPES)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        g.db = connect(current_app.config["DATABASE"])
    return g.db


def close_db(_error: BaseException | None = None) -> None:
    database = g.pop("db", None)
    if database is not None:
        database.close()


def init_db(connection: sqlite3.Connection | None = None) -> None:
    owns_connection = connection is None
    database = connection or get_db()
    database.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
    database.commit()
    if owns_connection and not hasattr(g, "db"):
        database.close()


@contextmanager
def immediate_transaction(connection: sqlite3.Connection) -> Iterator[sqlite3.Connection]:
    """Serialize reservation writes so two users cannot claim the same capacity."""
    connection.execute("BEGIN IMMEDIATE")
    try:
        yield connection
    except Exception:
        connection.rollback()
        raise
    else:
        connection.commit()


def init_app(app) -> None:
    app.teardown_appcontext(close_db)

