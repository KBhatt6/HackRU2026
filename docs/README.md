# RU Relief documentation

This directory is the source of truth for how the RU Relief app is put together.
It is written for humans and AI coding agents (OpenCode, Codex, Claude, etc.)
working on this repository in the future.

> **Maintenance rule:** Whenever you change code, data, schemas, routes, screens,
> dependencies, or project conventions, update the relevant file(s) in this
> directory in the same change. Documentation that drifts from the code is a bug.
> `AGENTS.md` and `CODEX.md` both repeat this obligation.

## Contents

| File | What it covers |
| --- | --- |
| [architecture.md](architecture.md) | High-level system shape: Flask API + SQLite + Expo app, request/data flow, directory map |
| [backend.md](backend.md) | Flask app factory, blueprints, shared route helpers, error handling, configuration |
| [api-reference.md](api-reference.md) | Every HTTP endpoint, its parameters, responses, status codes, and demo auth |
| [database.md](database.md) | SQLite schema, tables, constraints, settings, and the Excel seed pipeline |
| [search-ranking.md](search-ranking.md) | How `/api/search` filters, scores, and orders results (confidence, staleness, open hours, walking time) |
| [frontend.md](frontend.md) | Expo Router screens, shared components, API client, theming, and native permissions |
| [testing.md](testing.md) | Pytest fixtures and suite layout, frontend checks, how to add tests |

## Quick start

The combined local workflow is `./run.sh`. It creates/reuses `.venv`, installs
dependencies, reseeds the demo SQLite database, starts Flask, waits for the API
health endpoint, and launches Expo. It requires Python 3.9+, Node.js/npm, and
`curl`. Set `EXPO_PUBLIC_API_URL` to the computer's LAN address for a physical
Expo Go device.

```bash
# backend (from repo root)
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.seed      # rebuild database/ru_relief.db from the workbook
python run.py               # API at http://localhost:5000/api

# tests
pytest -q

# frontend (separate terminal)
cd frontend
cp .env.example .env        # set EXPO_PUBLIC_API_URL to your LAN IP for a phone
npm install
npx expo start              # scan QR with Expo Go
```

## Project status

This is a HackRU prototype. Medicine inventory, reservations, retail-swipe
payments, and the proposed health sections are **simulated**. The API repeats
this disclosure in student-facing responses (`prototypeDisclosure`), and the
home screen shows it. Keep those disclosures intact whenever responses or
screens change.
