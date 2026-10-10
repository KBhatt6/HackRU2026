# Frontend (Expo + Expo Router)

Expo SDK 57, React 19.2, React Native 0.86, TypeScript ~6.0, Expo Router with
typed routes and the React Compiler enabled (`experiments` in `app.json`). The
UI follows a native iOS-style **inset grouped list** look in dark mode: black
background, `#1C1C1E` grouped sections with hairline separators, system font,
system-blue (`#0A84FF`) tint for tappable rows and buttons, and grey footnotes
for explanations and disclosures. There are no pill/badge boxes: availability
and report confidence are shown as tinted inline text inside row subtitles.

Run `./run.sh` from the repository root for the combined setup, or run
`cd frontend && npm install && npx expo start` separately, then scan the QR code with
Expo Go. The backend must be reachable at `EXPO_PUBLIC_API_URL`
(`frontend/.env`, copied from `.env.example`) — use the computer's **LAN IP** on
a physical phone; `localhost` resolves to the phone itself.

When `EXPO_PUBLIC_API_URL` is omitted, the app derives the API host from
Expo's Metro host and uses port 5000. For a physical phone, explicitly set
`EXPO_PUBLIC_API_URL=http://<computer-LAN-IP>:5000` if automatic discovery does
not work.

Checks: `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

## Structure

```
src/
├── app/            # file-based routes; each file exports a default component
│   ├── _layout.tsx     # root <Stack>, shared header styling, StatusBar
│   ├── index.tsx       # home: search + category browse + results
│   ├── help.tsx        # Rutgers health/emergency contacts, tel:/sms:/mailto: links
│   ├── product/[id].tsx
│   ├── location/[id].tsx
│   ├── reserve/[inventoryId].tsx
│   ├── reservation/[id].tsx
│   └── report/[inventoryId].tsx
├── components/
│   ├── ui.tsx              # Group, Row, Footnote, StatusText, ConfidenceText,
│   │                       # availabilityColor, PrimaryButton, SecondaryButton,
│   │                       # LoadingState, ErrorState
│   ├── screen.tsx          # <Screen>: SafeAreaView + ScrollView shell (scroll={false} variant)
│   └── result-card.tsx     # ranked search result as a Group; "Best match" header for rank 0
├── constants/
│   ├── config.ts       # API_BASE_URL, DEMO_USER_TOKEN, CAMPUS_ZONES, CATEGORIES, PROTOTYPE_DISCLOSURE
│   └── theme.ts        # colors (iOS dark system palette), spacing, radius tokens
├── services/api.ts     # all fetch calls, one apiRequest<T> wrapper
└── types/api.ts        # TypeScript mirrors of the API payloads
```

Path alias: `@/*` → `src/*` (`tsconfig.json`).

## Screens and flows

| Route | Purpose |
| --- | --- |
| `/` (index) | Search field (submit with the keyboard's search key), a segmented control for campus zone, a "Walking times" row that requests location, and a "Categories" list (selected category shows a checkmark). Changing campus refreshes the active category or text search. Results render as one `ResultCard` group each — product row (→ product), location row (→ location), "Reserve for N minutes" and "Report stock" action rows, and a footnote with last-verified time and payment options — followed by a result count. `PROTOTYPE_DISCLOSURE` is shown as a footnote at the bottom of the screen. |
| `/help` | Loads `/api/health-contacts`; pins a "Call 911" row at the top; each contact is a row that opens its link when one can be parsed; `contactLink()` parses phone/email/SMS (741741, 988) into `tel:`/`sms:`/`mailto:` URLs. |
| `/product/[id]` | Product detail via `getProduct()` — definition, typical use, label caution, per-location availability. |
| `/location/[id]` | Location detail via `getLocation()` — hours per weekday, payment/swipe notes, proposed health section, inventory list, and Mapbox walking directions when coordinates and `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` are configured. |
| `/reserve/[inventoryId]` | Picks pickup method (`Self pickup`, `Authorized friend pickup`) and payment method (`Proposed retail swipe`, `RU Express`, `Cash or card`), then `createReservation()` and `router.replace` to the reservation screen, passing `pickupCode` in the route params. |
| `/reservation/[id]` | Countdown to `expiresAt` (1 s interval), one-time pickup code display (passed via params; falls back to `pickupCodeLast4`), cancel action. |
| `/report/[inventoryId]` | Choose shelf status and verification type; `Authorized student` requires a photo (`expo-image-picker`, stays on device — only the flag is sent); reads GPS (`expo-location`, high accuracy) for the geofence check. |

## API client — `src/services/api.ts`

Single `apiRequest<T>(path, options)` wrapper: prefixes `API_BASE_URL`, sets
`Content-Type: application/json`, parses JSON, and throws `Error(body.message)`
for non-2xx responses. Screens catch these and render `ErrorState` or inline
error text.

Exported calls: `searchInventory`, `getProduct`, `getLocation`,
`getHealthContacts`, `createReservation`, `getReservation`,
`cancelReservation`, `submitReport`. Add new endpoints here **and** in
`src/types/api.ts`, then update `docs/api-reference.md`.

## Identity

There is no login. `DEMO_USER_TOKEN = "expo-demo-student"` in
`constants/config.ts` is sent as `reservedByToken` / `reporterToken`, so all
demo reservations and reports share one identity. Real deployment needs Rutgers
SSO and server-issued tokens (see the security note in `docs/backend.md`).

## Native permissions

Declared in `app.json` plugins with user-facing copy:

- `expo-location` — walking-time estimates and stock-report geofencing.
- `expo-image-picker` — shelf photo for authorized reports.

Denial is handled gracefully: search works without coordinates, reports cannot
be submitted without location.

## UI primitives — `src/components/ui.tsx`

- `Group({ header?, footer? })` — inset grouped section; inserts hairline
  separators between its children; `header` is rendered uppercase, `footer` as
  a `Footnote`.
- `Row({ title, subtitle?, detail?, value?, onPress?, chevron?, checked?, tone? })`
  — one list row. `tone` is `default | tint | danger | disabled`; `checked`
  draws a ✓ (used for single-choice pickers on reserve/report); `chevron` marks
  navigation rows.
- `StatusText` / `ConfidenceText` — inline tinted text (green Available,
  orange Low stock, red Out of stock/Temporarily unavailable, grey otherwise;
  yellow for "Stale report"). Use inside a `Row` subtitle, never as a badge.
- `PrimaryButton` (filled tint, 50 pt), `SecondaryButton` (plain tint text),
  `LoadingState`, `ErrorState` (a `Group` with a retry row).

Detail screens show the item/location name as a 28 pt bold heading under a
short static navigation title (`Product`, `Location`, `Reserve`,
`Reservation`, `Report Stock`, `Get Help`).

## Conventions

- Design tokens only — import `colors`, `spacing`, `radius` from
  `constants/theme.ts`; do not hard-code hex values in screens.
- Shared layout via `<Screen>` (or the SafeAreaView + ScrollView pattern used
  on home); shared primitives from `components/ui.tsx`. Build new screens out
  of `Group`/`Row` rather than custom bordered cards or pill badges.
- Navigation with `router.push` / `router.replace` from `expo-router`; dynamic
  params read with `useLocalSearchParams`.
- Data fetching is `useEffect` + local state with an `active` cancellation
  flag; no data-fetching library in the project.
- Keep the prototype disclosure visible anywhere simulated data is shown.
