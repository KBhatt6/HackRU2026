# RU Relief backend

Flask and SQLite backend for the RU Relief HackRU prototype. The included workbook seeds eight real Rutgers retail locations and a simulated/proposed OTC inventory program.

## Important disclosure

The locations, selected hours, food meal-swipe rules, RU Express acceptance, and Rutgers health contacts come from the project dataset. Medicine inventory, reservations, medicine purchases with retail swipes, and the proposed health sections are simulated. The API repeats this disclosure in student-facing search responses.

## Set up

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.seed
python run.py
```

The API starts at `http://localhost:5000/api`.

For a combined local setup, run `./run.sh` from the repository root. It
creates/reuses `.venv`, installs backend and frontend dependencies, reseeds the
demo database, starts Flask, waits for `/api`, and launches Expo. It requires
Python 3.10+, Node.js/npm, and `curl`. Set `EXPO_PUBLIC_API_URL` to the
computer's LAN address for a physical Expo Go device.

## Run the Expo Go frontend

Copy `frontend/.env.example` to `frontend/.env`, then set `EXPO_PUBLIC_API_URL` to the development computer's local-network IP address. A physical phone cannot reach the computer through `localhost`.

```bash
cd frontend
npm install
npx expo start
```

Scan the displayed QR code with Expo Go. The project uses Expo SDK 57 and Expo Router.

To test from a physical phone using Expo Go, replace `localhost` in the Expo app with the computer's local network IP address. The phone and computer must be on the same network.

## Useful requests

```bash
curl "http://localhost:5000/api/products"
curl "http://localhost:5000/api/locations?campus_zone=Livingston"
curl "http://localhost:5000/api/search?query=Advil&campus_zone=Livingston&at=2026-10-13T16:00:00-04:00"
curl -H "X-Demo-Role: staff" "http://localhost:5000/api/admin/summary?at=2026-10-13T15:00:00-04:00"
```

## Run tests

```bash
pytest -q
```

## API routes

```text
GET    /api
GET    /api/products
GET    /api/products/{product_id}
GET    /api/locations
GET    /api/locations/{location_id}
GET    /api/search
GET    /api/health-contacts
POST   /api/reports
POST   /api/reservations
GET    /api/reservations/{reservation_id}
POST   /api/reservations/{reservation_id}/cancel
GET    /api/admin/summary
GET    /api/admin/reports/pending
POST   /api/admin/reports/{report_id}/approve
POST   /api/admin/reports/{report_id}/reject
PATCH  /api/admin/inventory/{inventory_id}
POST   /api/admin/reservations/{reservation_id}/collect
```

Admin endpoints use the temporary header `X-Demo-Role: staff`. Replace this with Rutgers SSO and server-side authorization before any real deployment.
