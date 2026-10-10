# RU Relief Expo frontend

Expo SDK 57 mobile frontend for the RU Relief HackRU prototype.

## Configure the backend address

Copy `.env.example` to `.env` and replace the value with the computer's local-network IP address:

```text
EXPO_PUBLIC_API_URL=http://192.168.1.42:5000
```

Do not use `localhost` or `127.0.0.1` on a physical phone. The phone interprets those addresses as the phone itself. Keep the phone and development computer on the same network.

## Start everything

Terminal 1, from the project root:

```bash
python -m backend.seed
python run.py
```

Terminal 2:

```bash
cd frontend
npm install
npx expo start
```

Scan the QR code with Expo Go.

## Included flows

- Search by product or category
- Separate College Avenue, Busch, Livingston, and Cook/Douglass zones
- Optional location-based walking estimates
- Ranked availability and confidence cards
- Product definitions and cautions
- Location hours and payment-policy disclosures
- 75-minute first-come reservations
- One-time pickup codes
- Anonymous stock reports with a one-time geofence check
- Authorized-report photo selection
- Rutgers health and emergency contacts

The image selected for an authorized report remains on the device in this prototype. The backend receives only whether a photo was attached. A production review flow would need encrypted temporary upload storage and automatic deletion after review.

## Checks

```bash
npm run typecheck
npm run lint
npx expo-doctor
```
