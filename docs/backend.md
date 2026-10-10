# Backend (Flask + SQLite)

Stack: Flask 3.1.2, Python stdlib `sqlite3`, `openpyxl` for the seed workbook,
`pytest` for tests. Pinned in `backend/requirements.txt`.

## Application factory — `backend/app.py`

`create_app(test_config=None)` is the single entry point:

1. Reads `DATABASE` from `RU_RELIEF_DATABASE` (default
   `database/ru_relief.db`), sets `JSON_SORT_KEYS=False` (response key order is
   meaningful for readability) and a 5 MB upload cap.
2. Merges `test_config` — tests pass `{"TESTING": True, "DATABASE": <tmp path>}`.
3. Calls `init_database_app()` to register the per-request teardown that closes
   the connection.
4. Registers the blueprints in this order: products, locations, search, health,
   reports, reservations, admin.
5. Adds `GET /api` (service banner + disclosure), permissive CORS headers
   (`Access-Control-Allow-Origin: *`, allows `Content-Type` and `X-Demo-Role`),
   and JSON error handlers:
   - `HTTPException` → `{"error": <name>, "message": <description>}` with the
     original status code.
   - Unhandled exceptions → logged, generic 500. Re-raised when `TESTING` is
     on so tests fail loudly.

`run.py` (repo root) and `python backend/app.py` both run
`app.run(host="0.0.0.0", port=5000, debug=True)`. Use `run.py` from the repo
root so package-relative imports resolve.

## Database access — `backend/database.py`

| Helper | Purpose |
| --- | --- |
| `connect(path)` | Opens SQLite with `Row` factory, `foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout=5000`. Creates parent dirs. |
| `get_db()` | Request-scoped connection stored on `flask.g`. |
| `close_db()` | Teardown hook registered by `init_app()`. |
| `init_db()` | Executes `database/schema.sql`. Used by the seeder and available for fresh installs. |
| `immediate_transaction(conn)` | Context manager issuing `BEGIN IMMEDIATE`, commit on success, rollback on exception. |

`immediate_transaction` exists specifically for reservation creation: SQLite's
default deferred transactions upgrade lazily, which can produce
`SQLITE_BUSY` races when two phones claim the same last unit. Taking the write
lock up front serializes those requests (WAL + 5 s busy timeout backstop).

## Models — `backend/models.py`

Small, deliberately thin:

- `row_to_dict`, `db_bool` — row conversion helpers.
- `SearchResult` — frozen dataclass with the **exact camelCase keys** the
  frontend expects (`inventoryId`, `quantityBand`, `travelMinutes`,
  `reservationState`, `score`, …). `to_dict()` uses `asdict()`.

If you add a field to search output, add it here **and** to
`frontend/src/types/api.ts`, then update `docs/search-ranking.md` and
`docs/api-reference.md`.

## Shared route helpers — `backend/routes/common.py`

| Helper | Behavior |
| --- | --- |
| `read_settings()` | Loads the `settings` table into a dict, casting by `value_type` (`integer`, `number`, `boolean`, `text`, `datetime`). |
| `request_time(settings)` | Honors `?at=<ISO-8601>` so demos/tests can pin the clock; naive datetimes are assumed Eastern; otherwise `now(America/New_York)`. |
| `require_json(required)` | Requires a JSON object body and non-empty values for the listed keys, else `400`. |
| `require_staff(view)` | Decorator requiring header `X-Demo-Role: staff` (or `admin`), else `403`. **Demo-only auth.** |

## Blueprint conventions

- One module per resource under `backend/routes/`, each exporting a
  `<name>_bp = Blueprint(...)` with a `url_prefix` under `/api`.
- Responses are camelCase dictionaries; SQL and column names stay snake_case.
- Validation failures call `abort(4xx, description=...)` so they flow through
  the shared JSON error handler.
- Writes call `database.commit()` explicitly (reads never do).

## Configuration surface

| Source | Keys |
| --- | --- |
| Environment | `RU_RELIEF_DATABASE` — SQLite path override. |
| `settings` table (seeded from the `Config` sheet) | `weight_availability` (0.4), `weight_confidence` (0.25), `weight_proximity` (0.2), `weight_open_hours` (0.15), `stale_penalty` (0.2), `staff_report_validity_min` (240), `student_report_validity_min` (60), `geofence_radius_m` (150), `route_detour_factor` (1.3), `walking_speed_kmh` (4.8), `reservation_minutes` (75), `DEMO_NOW`. |
| Frontend env | `EXPO_PUBLIC_API_URL` (see `frontend/.env.example`). |

Numbers above are code defaults; the seeded values win at runtime.

## Known prototype limitations

- `X-Demo-Role` header auth, no sessions/tokens/Rutgers SSO.
- CORS is wide open (`*`) — fine for a demo, not for production.
- No rate limiting, no photo upload storage (only an attached flag).
- No background scheduler: reservation expiry is computed at read time.
- `X-Demo-Role` is the only admin gate; report `reporter_token` values are
  client-supplied strings (`DEMO_USER_TOKEN` in the app).

When you change any of this, update `docs/backend.md`, `docs/api-reference.md`,
and the matching frontend docs.
