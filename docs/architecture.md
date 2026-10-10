# Architecture

## System overview

RU Relief is a two-tier prototype:

Local development can use `./run.sh`, which prepares the Python virtual
environment, installs dependencies, reseeds SQLite, waits for Flask readiness,
and starts Expo. `BACKEND_PORT` can override the default port 5000. The backend
supports Python 3.9+.

```
┌─────────────────────────────┐        HTTPS/JSON        ┌──────────────────────────────┐
│  frontend/ (Expo SDK 57)    │  EXPO_PUBLIC_API_URL     │  backend/ (Flask 3.1)        │
│  Expo Router screens        │ ───────────────────────► │  app factory + blueprints    │
│  src/services/api.ts client │ ◄─────────────────────── │  ranking + route helpers     │
└─────────────┬───────────────┘                          └──────────────┬───────────────┘
              │  expo-location, expo-image-picker                       │ sqlite3 (WAL)
              ▼                                                         ▼
        device sensors                                            database/ru_relief.db
                                                                  (schema.sql + seed.py)
```

- **Backend**: plain Flask with `sqlite3` (no ORM). SQL lives in the route
  modules. Connections are per-request, opened by `backend/database.py`.
- **Frontend**: React Native via Expo, file-based routing with Expo Router.
  Talks to the API through one typed module, `frontend/src/services/api.ts`.
- **Data source**: `backend/data/ru_relief_demo_dataset.xlsx` is the origin of
  truth for locations, hours, products, inventory, reports, reservations,
  health contacts, and tuning settings. `backend/seed.py` loads it into SQLite.

## Repository map

```
ru-relief-complete/
├── AGENTS.md                  # instructions for AI agents (includes docs rule)
├── CODEX.md                   # Codex-specific entry point to the same rules
├── README.md                  # human quick start + endpoint list
├── run.py                     # dev server entry point (0.0.0.0:5000, debug)
├── docs/                      # this documentation (must stay current)
├── backend/
│   ├── app.py                 # create_app() factory, CORS, error handlers
│   ├── database.py            # connection helpers, init_db, immediate_transaction
│   ├── models.py              # SearchResult dataclass + row helpers
│   ├── ranking.py             # scoring, staleness, open hours, distance/walk time
│   ├── seed.py                # workbook -> SQLite loader (python -m backend.seed)
│   ├── requirements.txt       # Flask, openpyxl, pytest (pinned)
│   ├── data/*.xlsx            # demo dataset workbook
│   └── routes/                # one blueprint per resource
│       ├── common.py          # settings, request_time, require_json, require_staff
│       ├── products.py        # /api/products
│       ├── locations.py       # /api/locations
│       ├── search.py          # /api/search (uses ranking.py)
│       ├── health.py          # /api/health-contacts
│       ├── reports.py         # POST /api/reports (geofence + verification)
│       ├── reservations.py    # /api/reservations (capacity + pickup codes)
│       └── admin.py           # /api/admin/* (staff header required)
├── database/
│   ├── schema.sql             # tables, CHECK constraints, indexes
│   └── ru_relief.db           # seeded SQLite database (WAL sidecars gitignored)
├── tests/                     # pytest suite (conftest seeds a temp DB)
└── frontend/
    ├── app.json               # Expo config, permission copy, typed routes
    ├── .env(.example)         # EXPO_PUBLIC_API_URL
    └── src/
        ├── app/               # Expo Router screens (file = route)
        ├── components/        # ui.tsx primitives, screen.tsx shell, result-card.tsx
        ├── constants/         # theme.ts tokens, config.ts zones/categories/env
        ├── services/api.ts    # single fetch wrapper for all endpoints
        └── types/api.ts       # TypeScript shapes mirroring API responses
```

## Request flows

### Search (read path)

1. `frontend/src/app/index.tsx` collects campus zone, query/category, and
   optional device coordinates → `searchInventory()` in `src/services/api.ts`.
2. `GET /api/search` (`backend/routes/search.py`) builds a SQL filter over
   `inventory ⨝ products ⨝ locations ⨝ location_hours`.
3. For each row, `backend/ranking.py` derives: effective confidence (staleness),
   open/closing state, route distance and walking minutes, reservation state,
   and a 0–1 score.
4. Results are sorted by (open now, in stock, score) and returned with a
   `prototypeDisclosure` string.
5. The home screen renders `ResultCard`s; index 0 gets a "Best match" group header.

### Reservation (write path)

1. `reserve/[inventoryId].tsx` → `POST /api/reservations`.
2. The route opens a `BEGIN IMMEDIATE` transaction so concurrent requests
   cannot oversell capacity (`immediate_transaction` in `backend/database.py`).
3. Eligibility: `proposed_to_stock`, `reservation_supported`, status in
   {Available, Low stock}, confidence not stale. Capacity comes from
   `inventory.allocatable_units_internal` (2 for Available, 1 for Low stock).
4. Accepted → status `Active`, SHA-256 pickup code stored (only last 4 kept in
   clear), full code returned once. Otherwise → `409` with status
   `Declined (first come, first served)`.
5. Expiry is computed on read (`effective_status`), so no background job is
   needed: an `Active` row past `expires_at` reads back as `Expired (auto)`.

### Stock report (write path)

1. `report/[inventoryId].tsx` reads device GPS and optionally picks a photo.
2. `POST /api/reports` performs a one-time haversine geofence check against
   `settings.geofence_radius_m` (default 150 m). Raw coordinates are never
   stored — only distance and Pass/Fail.
3. Outcome depends on role: staff accepted immediately; basic student counted
   if inside the geofence; authorized student queued as `Pending photo review`.
4. Accepted outcomes immediately rewrite `inventory` (status, quantity band,
   confidence, `last_verified`, capacity) via
   `update_inventory_from_report()`.

## Cross-cutting decisions

- **Time is always Eastern.** `America/New_York` is used everywhere; the `at`
  query parameter lets tests and demos pin "now" (`request_time()`).
- **Settings live in the database**, not in code. `read_settings()` reads the
  `settings` table; weights, staleness windows, geofence radius, and walking
  speed are tunable per dataset without redeploying.
- **No auth.** Admin routes check the demo header `X-Demo-Role: staff`. This is
  explicitly temporary and must be replaced by Rutgers SSO + server-side
  authorization before any real deployment.
- **Prototype disclosure is part of the contract.** Search responses and the
  home screen both surface that inventory and retail swipes are simulated.
