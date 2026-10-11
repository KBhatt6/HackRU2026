# Frontend (Expo + Expo Router)

Expo SDK 57, React 19.2, React Native 0.86, TypeScript ~6.0, Expo Router with
typed routes and the React Compiler enabled (`experiments` in `app.json`). The
shared home theme uses a deep dark-red canvas, warm light-gray rounded cards, Rutgers
scarlet accents, and horizontal category/carousel sections. The location action sits below the search card and the category
`Ask RSH Nurse` calls the seeded RSH Advice Nurse Line at 800-890-5882.
row shows a horizontal scroll indicator. Ads, deals, promo banners, and product
imagery are not used. The location action is a separate permission-triggering
button beside the Ask RSH Nurse action, while the search panel contains only the
product search controls. Result cards omit match scores, hours/travel metadata, and payment text,
and the upper result area opens product details. Status boxes use black borders
with readable Available, Low stock, and Unknown palettes; report actions stay
on one line. Location-detail hero text and
standalone headings use light text on the black page background, while card
contents use dark text on cream surfaces. Product-detail hero text and its
standalone availability heading follow the same contrast rule.
Report, reserve, and reservation screens use the same light-on-black hero and
dark-on-cream card treatment; available status uses the darker green token.
Confidence badges follow the same contrast system: Staff verified is green,
student verification is yellow, and Unverified Data is red.
The home search shows open locations first and hides closed/unknown locations
behind a clickable closed-location summary. The closed-location screen includes
a warning link to Get Help and displays varied simulated freshness labels. The
home screen always shows the closed-location summary when closed results exist.
If the selected campus has no open matches, home
queries the other campuses and ranks fallback results by openness first, then
distance when coordinates are available.

Location behavior: the Add location button requests foreground permission through
`expo-location`, stores only the current coordinates in frontend state, selects
the nearest seeded campus center (College Avenue, Busch, Livingston, or
Cook/Douglass), and refreshes an active search for that campus. Search walking
times are prototype estimates based on straight-line distance and a configured
walking-speed factor; Google Maps remains the source for actual directions.

Run `./run.sh` from the repository root for the combined setup, or run
`cd frontend && npm install && npx expo start` separately, then scan the QR code with
Expo Go. The backend must be reachable at `EXPO_PUBLIC_API_URL`
(`frontend/.env`, copied from `.env.example`) — use the computer's **LAN IP** on
a physical phone; `localhost` resolves to the phone itself.

When `EXPO_PUBLIC_API_URL` is omitted, the app derives the API host from
Expo's Metro host and uses the local backend's default port 6000. `run.sh`
automatically detects the Mac's LAN IP when possible and passes that URL to
Expo. For a physical phone, explicitly set
`EXPO_PUBLIC_API_URL=http://<computer-LAN-IP>:6000` if automatic discovery does
not work. A search request fails after eight seconds with a visible connection
message instead of loading indefinitely.

Checks: `npm run typecheck`, `npm run lint`, `npx expo-doctor`.

## Structure

```
src/
├── app/            # file-based routes; each file exports a default component
│   ├── _layout.tsx     # root <Stack>, shared header styling, StatusBar
│   ├── index.tsx       # home: search + category browse + nearest carousel + results
│   ├── help.tsx        # Rutgers health/emergency contacts, tel:/sms:/mailto: links
│   ├── cart.tsx        # login-free reserved-supplies cart with hold timers and delivery entry point
│   ├── delivery.tsx    # campus and on-campus residence selection for prototype delivery
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
| `/` (index) | Target-inspired mobile home: welcome card, search/Ask row, category controls, nearest/request-delivery carousel cards, campus selection, and active search results. The nearest medication card includes Reserve and Directions; Directions opens Google Maps using the same address helper as result cards. Cook locations always route to Cook Student Center, and Harvest Juice Bar routes to Busch Student Center, 604 Bartholomew Rd. Changing campus refreshes the active category or text search. |
| `/help` | Loads `/api/health-contacts`; pins a "Call 911" emergency card; `contactLink()` parses phone/email/SMS (741741, 988) into `tel:`/`sms:`/`mailto:` URLs. |
| `/delivery` | Selects a Rutgers New Brunswick/Piscataway campus, filters the on-campus housing list to that campus, opens the selected destination in Google Maps, and records a prototype-only delivery request for the current app session. When set, the screen shows the saved campus/residence, delivery confirmation code, and a Cancel Delivery action; canceling restores the request form. Its native navigation header is titled `Delivery`. The housing names mirror the current official Residence Life campus lists: 16 College Avenue, 17 Busch, 6 Livingston, and 12 Cook/Douglass options. |
| `/cart` | Login-free session cart for successful reservations. Each item opens its reservation confirmation screen and shows its pickup confirmation code, location, and live 75-minute hold countdown. The delivery card changes to a prominent cream/red confirmation summary with a delivery code, campus, residence, and address after delivery is requested. |
| `/product/[id]` | Product detail via `getProduct()` — definition, typical use, label caution, and availability grouped under Busch, College Ave, Livingston, and Cook/Douglass. A small cream purchase-limit line appears under the campus heading; campus cards show only the report type and availability badge. |
| `/location/[id]` | Location detail via `getLocation()` — hours per weekday, payment/swipe notes, proposed health section, inventory list, and a Directions action that opens Google Maps using the location address. Inventory confidence text displays `Unverified data` instead of the longer prototype label. |
| `/reserve/[inventoryId]` | Picks pickup method (`Self pickup`, `Authorized friend pickup`) and payment method (`Proposed retail swipe`, `RU Express`, `Cash or card`), then `createReservation()` and `router.replace` to the reservation screen, passing `pickupCode` in the route params. |
| `/reservation/[id]` | Countdown to `expiresAt` (1 s interval), one-time pickup code display (passed via params; falls back to `pickupCodeLast4`), cancel action. |
| `/report/[inventoryId]` | Choose shelf status. The frontend now requires the prototype’s authorized-student flow for every report: it requests photo permission and compares a high-accuracy GPS reading with the selected store’s target coordinates when the photo button is pressed; the UI shows checking, at-location, outside-location, or denied status. The photo stays on-device and only the attached flag is sent; submission performs the backend geofence check again. The backend retains the basic-student role for compatibility with existing demo data and tests. |

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
