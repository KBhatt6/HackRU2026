# CODEX.md

Codex entry point for this repository. The full, shared rules live in
[AGENTS.md](AGENTS.md) — read it first. This file adds Codex-specific context
and the non-negotiable documentation duty.

## 1. Documentation duty (highest priority)

**Every code change ships with a `docs/` update.** The `docs/` directory is the
project's institutional memory; leaving it stale is treated as an incomplete
change.

| If you change… | Update… |
| --- | --- |
| Flask routes, payloads, status codes, auth headers | `docs/api-reference.md`, `docs/backend.md` |
| Ranking, scoring, staleness, distance, ordering | `docs/search-ranking.md` |
| `database/schema.sql`, seeding, settings, workbook | `docs/database.md` |
| `backend/app.py`, `database.py`, `models.py`, helpers | `docs/backend.md`, `docs/architecture.md` |
| Expo screens, components, theming, permissions, env | `docs/frontend.md` |
| API client or TypeScript types (`src/services/api.ts`, `src/types/api.ts`) | `docs/frontend.md` **and** `docs/api-reference.md` |
| Tests, fixtures, check commands | `docs/testing.md` |
| Setup/run steps, dependencies, project layout | `docs/README.md`, `docs/architecture.md`, root `README.md` |

Procedure:

1. Read the relevant `docs/` file before editing (index: `docs/README.md`).
2. Make the code change.
3. Rewrite the affected documentation to match the code **as it now is**.
4. If you introduce a new component/flow, add a new `docs/*.md` file and link
   it from `docs/README.md`.
5. If nothing in `docs/` needed changing, state that explicitly in your final
   summary with the reason.

## 2. Project at a glance

RU Relief: a HackRU prototype (Rutgers–New Brunswick) for finding OTC health
supplies on campus.

- `backend/` — Flask 3 app factory (`create_app`), SQLite via stdlib `sqlite3`,
  blueprints under `backend/routes/`, ranking logic in `backend/ranking.py`,
  Excel→SQLite loader `python -m backend.seed`. Serve with `python run.py`
  (`http://localhost:5000/api`).
- `frontend/` — Expo SDK 57 + Expo Router + TypeScript. Screens in
  `src/app/`, shared UI in `src/components/`, one API client
  (`src/services/api.ts`), types in `src/types/api.ts`, tokens in
  `src/constants/theme.ts`.
- `database/` — `schema.sql` + seeded `ru_relief.db`.
- `tests/` — pytest suite (each test seeds a temp DB from the demo workbook).

Deeper detail: `docs/architecture.md`, `docs/backend.md`,
`docs/api-reference.md`, `docs/database.md`, `docs/search-ranking.md`,
`docs/frontend.md`, `docs/testing.md`.

## 3. Hard constraints

- Do not remove the simulated-feature disclosures (`prototypeDisclosure`,
  home-screen banner).
- Do not store raw GPS coordinates or photo bytes from stock reports.
- Keep all time handling Eastern and injectable via `?at=` — no bare
  `datetime.now()` in logic.
- Keep reservation capacity checks inside `immediate_transaction`
  (`BEGIN IMMEDIATE`).
- Keep `SearchResult` (backend) and `frontend/src/types/api.ts` in lockstep.
- Treat `X-Demo-Role: staff` and `DEMO_USER_TOKEN` as prototype scaffolding,
  never as production auth.

## 4. Verify before finishing

```bash
pytest -q                                    # backend suite (from repo root)
cd frontend && npm run typecheck && npm run lint
```

Also re-check that `docs/` no longer contradicts the code, then report: what
changed, which doc files were updated, and any known limitations left.
