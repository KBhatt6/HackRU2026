# Database

SQLite, no ORM. Schema in `database/schema.sql`; runtime file
`database/ru_relief.db` (WAL sidecars `*.db-shm` / `*.db-wal` are gitignored).

Connection settings (see `backend/database.py`): `foreign_keys = ON`,
`journal_mode = WAL`, `busy_timeout = 5000`, `Row` factory,
`detect_types=PARSE_DECLTYPES`.

## Tables

### `settings`

Tunable parameters seeded from the workbook's `Config` sheet.

| Column | Notes |
| --- | --- |
| `key` (PK) | Normalized name (`DEMO_NOW` stays literal; other keys have non-alphanumerics collapsed to `_`). |
| `value` | Always stored as text. |
| `value_type` | `text` \| `integer` \| `number` \| `boolean` \| `datetime` — drives casting in `read_settings()`. |
| `unit`, `basis`, `status` | Provenance metadata (unused in logic). |

Keys consumed by code: ranking weights, `stale_penalty`,
`staff_report_validity_min`, `student_report_validity_min`,
`geofence_radius_m`, `route_detour_factor`, `walking_speed_kmh`,
`reservation_minutes`, plus optional `DEMO_NOW`.

### `locations`

Eight Rutgers retail sites across the four campus zones. Notable columns:

- `campus_zone` — CHECK restricted to `College Avenue`, `Busch`, `Livingston`,
  `Cook/Douglass`. Keep this list in sync with `CAMPUS_ZONES` in
  `frontend/src/constants/config.ts`.
- `latitude` / `longitude` / `coordinate_note` — coordinates may be NULL
  (e.g. the unverified Cook café, `L07`), which disables student reporting and
  walking estimates there.
- Policy flags: `meal_swipe_eligible_today`, `ru_express_accepted_today`,
  `reservation_supported`, `staff_verification_supported`,
  `student_verification_supported` (all 0/1 CHECKs).
- `proposed_health_section`, `product_tier` (`Core`|`Full`),
  `location_verified`, `verification_notes`.

### `location_hours`

`(location_id, day_of_week)` PK; `day_of_week` 0 = Monday … 6 = Sunday.
`opens_minute`/`closes_minute` are minutes since midnight (0–1440; `1440` =
midnight close). `hours_known = 0` marks unknown hours — the API then returns
`isOpen: null`.

### `products`

Static OTC catalog: `category`, `active_ingredient_or_type`,
`simple_definition`, `typical_use`, `label_caution`, `product_tier`
(`Core`|`Extended`), `quantity_limit_per_transaction`,
`requires_staff_assistance`, `retail_swipe_status`, `data_basis`.
Product categories are also mirrored in the frontend `CATEGORIES` constant.

### `inventory`

The junction of location × product (UNIQUE `location_id, product_id`) and the
heart of the app:

| Column | Meaning |
| --- | --- |
| `proposed_to_stock` | Whether the program would stock it here; search hides `0` unless `include_unstocked=true`. |
| `availability_status` | CHECK: `Available`, `Low stock`, `Out of stock`, `Unknown`, `Temporarily unavailable`, `Not stocked in proposal`. |
| `quantity_band` | Display label (`Good supply`, `Few left`, `None`, …). |
| `reported_confidence` | See [search-ranking.md](search-ranking.md): `Staff verified`, `Authorized student verified`, `Multiple student reports`, `Single student report`, `Stale report`, `Unverified prototype data`, `n/a`. |
| `last_verified` | ISO-8601 timestamp; drives staleness. |
| `allocatable_units_internal` | Hold capacity: 2 (Available) / 1 (Low stock) / 0. Recomputed on every report application and admin PATCH. |
| `reservation_minutes` | Hold duration, default 75. |
| `retail_swipe_status`, `payment_options`, `quantity_limit` | Payment disclosures surfaced in search results. |

### `verification_reports`

Stock reports: role, token, reported status, `reported_at`, geofence
`distance_m`/`radius_m`/`result` (**raw coordinates are never stored**),
`photo_attached` flag + `photo_review`, `verification_outcome`,
`validity_minutes`, `expires_at`, and review bookkeeping
(`reviewed_at`, `reviewed_by_token`).

Outcomes seen in code: `Accepted (staff)`, `Counted (basic student report)`,
`Pending photo review`, `Rejected (outside geofence)`, `Rejected (photo
review)`, `Accepted (photo + location verified)`.

### `reservations`

`status` CHECK: `Active`, `Collected`, `Cancelled`,
`Declined (first come, first served)`. `pickup_code_hash` (SHA-256) +
`pickup_code_last4`; the full code is shown only once, at creation. Expiry is
*derived* (`Active` + `expires_at` in the past reads as `Expired (auto)`) — no
background job rewrites rows.

### `health_contacts`

Student-health escalation list (`Emergency`, `Nurse advice`, `Clinic`,
`Clinic location`, `Mental health crisis`, …) with `when_to_use` guidance and
a `verified` flag.

## Indexes

`locations(campus_zone)`, `products(product_name)`, `products(category)`,
`inventory(location_id)`, `inventory(product_id)`,
`inventory(availability_status)`,
`verification_reports(inventory_id, reported_at DESC)`,
`reservations(inventory_id, status, expires_at)`.

## Seeding — `backend/seed.py`

Run from the repo root: `python -m backend.seed` (options: `--workbook`,
`--database`).

Pipeline (`seed_database()`):

1. Load `backend/data/ru_relief_demo_dataset.xlsx` with `openpyxl`
   (`data_only=True`, `read_only=True`).
2. `init_db()` — apply `schema.sql` (idempotent, `CREATE TABLE IF NOT EXISTS`).
3. `clear_seeded_data()` — delete seeded rows from all tables in FK-safe order
   (reservations → reports → inventory → hours → products → locations →
   health_contacts → settings). Runtime user data is not preserved by design.
4. Seed settings, locations (+ seven hour rows each, mapping Mon–Thu / Fri /
   Sat / Sun columns to weekdays), products, inventory
   (`internal_capacity()` derives allocatable units), reports, reservations
   (workbook `Expired (auto)` rows are stored as `Active` so expiry logic can
   be demonstrated), health contacts.
5. Commit and print JSON counts.

Every sheet must match the expected headers — `rows_from_sheet()` builds dicts
by header name. If you add a workbook column, also decide whether it belongs in
the schema, the API payloads, and the frontend types.

Tests seed a throwaway database per run (`tests/conftest.py` →
`seed_database(DEFAULT_WORKBOOK, tmp_path / "test_ru_relief.db")`), so the
checked-in `ru_relief.db` is only for local development.
