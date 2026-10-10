# API reference

Base URL in development: `http://localhost:5000/api`

All responses are JSON. Errors are `{"error": "<name>", "message": "<text>"}`.
Unless noted, timestamps are ISO-8601 with the Eastern offset.

## Demo authentication

- Student endpoints: no auth; clients send a `reporterToken` / `reservedByToken`
  string (`DEMO_USER_TOKEN = "expo-demo-student"` in
  `frontend/src/constants/config.ts`).
- Admin endpoints: require header **`X-Demo-Role: staff`** (or `admin`), else
  `403`. This is a prototype stand-in for Rutgers SSO — replace before any real
  deployment.

## Common query parameters

| Param | Used by | Meaning |
| --- | --- | --- |
| `at` | time-aware endpoints (`search`, `admin/summary`) | Pin "now" as an ISO-8601 datetime. Naive values are treated as Eastern. Invalid → `400`. |

---

## Service

### `GET /api`

Returns `{"name": "RU Relief API", "status": "ok", "prototypeDisclosure": ...}`.

---

## Products

### `GET /api/products`

Query: `category`, `q` (matches name, category, or active ingredient).
Returns `{"products": [...], "count": n}`, ordered by category then name.

Fields per product: `productId`, `productName`, `category`,
`activeIngredientOrType`, `simpleDefinition`, `typicalUse`, `labelCaution`,
`productTier`, `quantityLimit`, `requiresStaffAssistance`, `retailSwipeStatus`.

### `GET /api/products/{product_id}`

Product fields plus `locations[]` — one entry per inventory row with
`inventoryId`, `locationId`, `locationName`, `campusZone`, `proposedToStock`,
`availability`, `quantityBand`, `reportedConfidence`, `lastVerified`.
`404` if unknown.

---

## Locations

### `GET /api/locations`

Query: `campus_zone` (`College Avenue` | `Busch` | `Livingston` |
`Cook/Douglass`). Returns `{"locations": [...], "count": n}`.

### `GET /api/locations/{location_id}`

Adds:

- `hours[]` — `dayOfWeek` (0 = Monday), `opensMinute`, `closesMinute`
  (minutes since midnight; `1440` = 24:00), `hoursKnown`.
- `inventory[]` — only rows with `proposedToStock = true`.

Also returns policy/disclosure fields: `mealSwipeEligibleForFoodToday`,
`ruExpressAcceptedToday`, `swipeNotes`, `hoursBasis`, `proposedHealthSection`,
`reservationSupported`, `staffVerificationSupported`,
`studentVerificationSupported`, `productTier`, `verified`, `verificationNotes`,
`coordinateNote`, `latitude`, `longitude`. `404` if unknown.

---

## Search

### `GET /api/search`

Requires at least one of `query` (alias `q`), `product_id`, `category` — else
`400`. Optional: `campus_zone`, `latitude`, `longitude` (non-numeric → `400`),
`include_unstocked=true`.

Response:

```json
{
  "query": { "text": "advil", "productId": null, "category": null,
             "campusZone": "Livingston", "at": "2026-10-13T16:00:00-04:00" },
  "results": [ { "inventoryId": "...", "productName": "...",
                 "availability": "Low stock", "confidence": "Staff verified",
                 "isOpen": true, "closingSoon": false, "travelMinutes": 12,
                 "reservationState": "Yes", "score": 0.7812, ... } ],
  "count": 3,
  "prototypeDisclosure": "Medicine stock and health-item retail swipe acceptance are simulated/proposed, not current Rutgers services."
}
```

Sorting: open now → in stock → `score` descending (all descending). The first
item is rendered as "BEST MATCH". Full semantics in
[search-ranking.md](search-ranking.md).

---

## Health contacts

### `GET /api/health-contacts`

Returns `{"contacts": [...], "medicalDisclaimer": "..."}`, ordered Emergency →
Nurse advice → Clinic → Clinic location → Mental health crisis → rest.
Fields: `contactId`, `name`, `type`, `phoneOrContact`, `whenToUse`, `verified`.

---

## Reports (stock verification)

### `POST /api/reports`

Body (all required): `inventoryId`, `reporterRole`, `reporterToken`,
`reportedStatus`.

- `reporterRole`: `Rutgers staff` | `Authorized student` | `Student (basic)`
- `reportedStatus`: `Available` | `Low stock` | `Out of stock` | `Unknown` |
  `Temporarily unavailable`
- Student roles additionally **must** send `latitude` and `longitude`
  (one-time geofence check); otherwise `400`.
- `photoAttached` (bool) — authorized students must attach a photo, else `400`.

Outcomes:

| Condition | `verificationOutcome` | Effect on inventory |
| --- | --- | --- |
| Staff | `Accepted (staff)` | Applied immediately |
| Student outside geofence | `Rejected (outside geofence)` | None |
| Authorized student, photo, inside geofence | `Pending photo review` | None until admin approves |
| Basic student, inside geofence | `Counted (basic student report)` | Applied immediately |

`201` response: `reportId`, `verificationOutcome`, `geofenceResult`,
`geofenceDistanceMeters`, `expiresAt`, `privacy` ("Raw coordinates and photo
bytes were not stored by this endpoint."). `404` for an unknown inventory id.
Unverified coordinates (e.g. unverified location) → `409`.

---

## Reservations

### `POST /api/reservations`

Body: `inventoryId`, `reservedByToken`, `pickupMethod`, `paymentMethod`,
optional `quantity` (prototype allows `1` only, else `400`).

Runs inside `BEGIN IMMEDIATE`. `409` when the item is not reservable
(not proposed to stock, location does not support reservations, unavailable, or
stale) — response is `{"error": "Conflict", "message": "This item cannot
currently be reserved."}`.

Success (`201`):

```json
{ "reservationId": "RES-...", "inventoryId": "INV-...", "status": "Active",
  "expiresAt": "...", "pickupCode": "RU-......",
  "message": "Reserved. Show the pickup code at the location." }
```

When capacity is exhausted: `409` with `status`
`Declined (first come, first served)` and `pickupCode: null`.

The pickup code is returned **once**; only its SHA-256 and last 4 characters
are stored.

### `GET /api/reservations/{reservation_id}`

Returns reservation details plus `locationName`, `productName`, and
`minutesRemaining` for active holds. An `Active` row past `expires_at` is
reported as `"Expired (auto)"`. `404` if unknown.

### `POST /api/reservations/{reservation_id}/cancel`

Body: `reservedByToken` — must match the creating token (`403` otherwise).
Only active holds can be cancelled (`409` otherwise). Returns
`{"reservationId", "status": "Cancelled"}`.

---

## Admin (require `X-Demo-Role: staff`)

| Method & path | Body | Notes |
| --- | --- | --- |
| `GET /api/admin/summary` | — | `stockByCampusZone`, `restockAlerts[]` (out-of-stock/low-stock counts per location), `staleInventoryRecords`, `pendingPhotoReviews`, `reservations` counts by status (expiry applied), `at`. |
| `GET /api/admin/reports/pending` | — | Reports whose outcome is `Pending photo review`, with location/product names and geofence details. |
| `POST /api/admin/reports/{report_id}/approve` | `reviewedByToken` | Only pending reports (`409` otherwise). Sets outcome `Accepted (photo + location verified)` and applies the report to inventory. |
| `POST /api/admin/reports/{report_id}/reject` | `reviewedByToken` | Sets `Rejected (photo review)`; inventory unchanged. |
| `PATCH /api/admin/inventory/{inventory_id}` | `availabilityStatus` | Sets status + quantity band, confidence `Staff verified`, refreshes `last_verified`, recomputes allocatable capacity. `404` unknown id, `400` bad status. |
| `POST /api/admin/reservations/{reservation_id}/collect` | `pickupCode` | Requires `Active` and unexpired (`409`), correct code hash (`403`), then marks `Collected`. |

Quantity band / capacity mapping used by both report application and the admin
PATCH: `Available` → `Good supply` / 2 units, `Low stock` → `Few left` / 1,
anything else → `None`-style band / 0.
