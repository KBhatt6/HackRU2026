# AGENTS.md

Instructions for AI coding agents (OpenCode, Codex, Claude, and friends) and
human contributors working in this repository.

## ⚠️ Keep `docs/` in sync — this is mandatory

**Whenever you make any change to this codebase — new endpoint, changed schema,
new or modified screen, ranking tweak, dependency bump, renamed constant,
different setup step — you must also update the affected file(s) in
[`docs/`](docs/) in the same change, before you finish.**

Rules of engagement:

1. Before writing code, read the `docs/` file that covers the area you are
   touching (`docs/README.md` is the index).
2. After changing code, update the matching documentation so it describes the
   new reality — not the old one, not a plan. If your change invalidates a
   claim in the docs, fix the claim.
3. New subsystem, route group, table, screen, or flow → add a section (or a new
   `docs/*.md` file) and link it from `docs/README.md`.
4. If a change is too small to warrant a doc edit (typo in UI copy), say so
   explicitly in your summary: "docs unaffected because …". Never silently skip.
5. Documentation must stay factual: describe what the code **does**, include
   defaults and constraints, and keep the disclosure that inventory,
   reservations, and retail swipes are simulated.

## What this project is

RU Relief — a HackRU prototype that helps Rutgers–New Brunswick students find
over-the-counter health supplies across campus, report shelf availability, and
place short first-come-first-served holds.

- **Backend**: Flask + SQLite (no ORM), `backend/`, app factory in
  `backend/app.py`, entry point `run.py`, API at `http://localhost:5000/api`.
- **Frontend**: Expo SDK 57 + Expo Router + TypeScript, `frontend/`.
- **Data**: seeded from `backend/data/ru_relief_demo_dataset.xlsx` by
  `python -m backend.seed` into `database/ru_relief.db` (schema:
  `database/schema.sql`).
- **Tests**: `pytest -q` from the repo root; frontend via `npm run typecheck`
  and `npm run lint`.

Start with `docs/architecture.md`, then `docs/backend.md`,
`docs/api-reference.md`, `docs/database.md`, `docs/search-ranking.md`,
`docs/frontend.md`, `docs/testing.md`.

## Ground rules

- **Prototype honesty.** Medicine stock, reservations, retail-swipe payments,
  and health sections are simulated. Do not remove or weaken the
  `prototypeDisclosure` strings or the home-screen disclosure.
- **Security is knowingly incomplete.** Admin routes use the demo header
  `X-Demo-Role: staff`; the app sends a hard-coded `DEMO_USER_TOKEN`. If your
  task touches auth, note what a real Rutgers SSO implementation would need —
  and do not pretend the demo header is real security.
- **Privacy.** Stock reports must never persist raw GPS coordinates or photo
  bytes; only geofence distance/result and an attached flag. Preserve this if
  you touch `POST /api/reports`.
- **Time is Eastern** (`America/New_York`). Never call `datetime.now()` in
  logic — accept `now` from `request_time()`/`request.args["at"]` so tests and
  demos stay deterministic.
- **Concurrency.** Reservation creation runs inside `BEGIN IMMEDIATE`
  (`immediate_transaction`) to prevent overselling. Keep write-critical sections
  transactional.
- **Configuration lives in data.** Ranking weights, staleness windows, geofence
  radius, and walking speed come from the `settings` table with code fallbacks.
  Change both, or re-seed, when adjusting them.
- **Naming.** SQL columns are snake_case; API payloads and TypeScript types are
  camelCase. `SearchResult` in `backend/models.py` and
  `frontend/src/types/api.ts` must stay field-for-field aligned.
- **Keep lists in sync**: campus zones and product categories are duplicated in
  `frontend/src/constants/config.ts`; availability statuses appear in the
  schema CHECK, backend allowlists, and frontend types.
- **No new dependencies without need.** Backend deps are pinned in
  `backend/requirements.txt`; frontend deps in `frontend/package.json`. If you
  add one, justify it and mention it in the docs.

## Typical workflows

```bash
# backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.seed          # rebuild DB from the workbook (destructive to seeded tables)
python run.py                   # http://localhost:5000/api

# tests
pytest -q

# frontend
cd frontend && cp .env.example .env   # set EXPO_PUBLIC_API_URL to your LAN IP
npm install
npx expo start
npm run typecheck && npm run lint
```

## Definition of done

1. Code works and, where applicable, `pytest -q`, `npm run typecheck`, and
   `npm run lint` pass.
2. `docs/` reflects the change (see the sync rules above).
3. Disclosures, privacy guarantees, and Eastern-time handling are intact.
4. If something is left unfinished or prototype-limited, it is stated plainly
   rather than glossed over.
