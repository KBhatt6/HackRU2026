# Frontend (Expo + Expo Router)

Expo SDK 57, React 19.2, React Native 0.86, TypeScript ~6.0, Expo Router with
typed routes and the React Compiler enabled (`experiments` in `app.json`).

Run `./run.sh` from the repository root for the combined setup, or run
`cd frontend && npm install && npx expo start` separately, then scan the QR code with
Expo Go. The backend must be reachable at `EXPO_PUBLIC_API_URL`
(`frontend/.env`, copied from `.env.example`) — use the computer's **LAN IP** on
a physical phone; `localhost` resolves to the phone itself.

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
│   ├── ui.tsx              # Card, SectionTitle, PrimaryButton, SecondaryButton,
│   │                       # LoadingState, ErrorState, AvailabilityBadge, ConfidenceBadge
│   ├── screen.tsx          # <Screen>: SafeAreaView + ScrollView shell (scroll={false} variant)
│   └── result-card.tsx     # ranked search result; "BEST MATCH" for rank 0
├── constants/
│   ├── config.ts       # API_BASE_URL, DEMO_USER_TOKEN, CAMPUS_ZONES, CATEGORIES, PROTOTYPE_DISCLOSURE
│   └── theme.ts        # colors, spacing, radius tokens (Rutgers-ish green palette)
├── services/api.ts     # all fetch calls, one apiRequest<T> wrapper
└── types/api.ts        # TypeScript mirrors of the API payloads
```

Path alias: `@/*` → `src/*` (`tsconfig.json`).

## Screens and flows

| Route | Purpose |
| --- | --- |
| `/` (index) | Choose campus zone (chips), type a query or tap a category, optional "use my location" for walking estimates. Renders `ResultCard` list; shows `PROTOTYPE_DISCLOSURE` at top. |
| `/help` | Loads `/api/health-contacts`; pins a "Call 911" emergency card; `contactLink()` parses phone/email/SMS (741741, 988) into `tel:`/`sms:`/`mailto:` URLs. |
| `/product/[id]` | Product detail via `getProduct()` — definition, typical use, label caution, per-location availability. |
| `/location/[id]` | Location detail via `getLocation()` — hours per weekday, payment/swipe notes, proposed health section, inventory list. |
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

## Conventions

- Design tokens only — import `colors`, `spacing`, `radius` from
  `constants/theme.ts`; do not hard-code hex values in screens.
- Shared layout via `<Screen>` (or the SafeAreaView + ScrollView pattern used
  on home); shared primitives from `components/ui.tsx`.
- Navigation with `router.push` / `router.replace` from `expo-router`; dynamic
  params read with `useLocalSearchParams`.
- Data fetching is `useEffect` + local state with an `active` cancellation
  flag; no data-fetching library in the project.
- Keep the prototype disclosure visible anywhere simulated data is shown.
