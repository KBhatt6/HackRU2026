# Testing

## Backend: pytest

Run from the repo root:

```bash
source .venv/bin/activate
pytest -q
```

### Fixtures — `tests/conftest.py`

| Fixture | Provides |
| --- | --- |
| `database_path` | `tmp_path/test_ru_relief.db`, freshly seeded from the demo workbook for every test. |
| `app` | `create_app({"TESTING": True, "DATABASE": <path>})` — TESTING makes unhandled exceptions re-raise instead of returning a masked 500. |
| `client` | Flask test client. |
| `db` | A raw `sqlite3` connection to the seeded DB for assertions. |
| `staff_headers` | `{"X-Demo-Role": "staff"}` for admin endpoints. |

Because every test seeds its own database, tests are isolated and may mutate
data freely. Never depend on the checked-in `database/ru_relief.db` in tests.

### Suite layout

| File | Focus |
| --- | --- |
| `test_import.py` | Dataset integrity: row counts, two locations per campus zone, the unverified Cook café (`L07`) has no coordinates, all inventory foreign keys resolve. |
| `test_ranking.py` | Pure-function behavior: student reports stale after 60 min, staff reports valid for 4 h, closing-soon flagging, stale penalty lowering the score. |
| `test_search.py` | End-to-end search: Livingston Ad Vil falls back to Henry's, fresh staff report outranks stale student report, empty request rejected with 400, prototype disclosure present. |
| `test_reports.py` | Geofence and verification: authorized report requires a photo, geofence stores distance but not coordinates, outside-geofence reports rejected. |
| `test_reservations.py` | Capacity: low-stock item is first-come first-served, cancel works with the matching token, wrong token → 403. |
| `test_admin.py` | Admin gating (`403` without the staff header), summary matches the dataset, staff can update inventory. |

### Adding a backend test

1. Prefer the seeded dataset; pin the clock with `?at=<ISO-8601>` when behavior
   depends on time (see `request_time()`).
2. Assert on response JSON, not HTML, and assert status codes explicitly.
3. Use `db` for direct table assertions (e.g. that raw coordinates were not
   stored).
4. If you change ranking, schema, or seeding, update the affected tests **and**
   `docs/search-ranking.md` / `docs/database.md`.

## Frontend checks

```bash
cd frontend
npm run typecheck     # tsc --noEmit (typed routes + generated route types)
npm run lint          # expo lint / eslint-config-expo
npx expo-doctor       # dependency and config health
```

There is no frontend unit-test runner in the project; screens are validated by
`typecheck` + `lint` plus manual flows through Expo Go against the seeded API.

## Manual smoke test

The combined local setup is `./run.sh`; it reseeds the demo database and
launches both services. It requires Python 3.10+, Node.js/npm, and `curl`.

1. `python -m backend.seed && python run.py`
2. `curl "http://localhost:5000/api/search?query=Advil&campus_zone=Livingston&at=2026-10-13T16:00:00-04:00"`
3. `curl -H "X-Demo-Role: staff" "http://localhost:5000/api/admin/summary?at=2026-10-13T15:00:00-04:00"`
4. In the app: search → reserve → watch countdown → cancel; report stock with
   and without photo; check `/help` contacts dial correctly.
