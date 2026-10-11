# Search & ranking

`GET /api/search` (`backend/routes/search.py`) plus the pure functions in
`backend/ranking.py`. Everything here is deterministic given the same rows and
the same `at` timestamp, which is what the pytest suite relies on.

## Filtering

Requires one of `query`, `product_id`, `category`.

- Joins `inventory ⨝ products ⨝ locations` and LEFT JOINs `location_hours`
  for today's row (`day_of_week = now.weekday()`).
- Excludes `proposed_to_stock = 0` unless `include_unstocked=true`.
- Text search is `LIKE %query%` over `product_name`, `category`, and
  `active_ingredient_or_type` (case-insensitive by SQLite default for ASCII).
- Optional exact filter on `campus_zone`.

## Per-row derivations

All functions take an explicit `now` (from `request_time()`), never
`datetime.now()` directly.

### Confidence and staleness (`effective_confidence`)

Reported confidence degrades when it ages past its validity window:

| Reported confidence | Validity window |
| --- | --- |
| `Staff verified` | `staff_report_validity_min` (default 240 min) |
| `Verified student report` | `student_report_validity_min` (default 60 min) |

Past the window → `Stale report`. Other rows keep their label
(`Unverified Data`, `n/a`).

Score inputs:

```
Available 1.0 · Low stock 0.65 · Unknown 0.25
Out of stock / Temporarily unavailable / Not stocked in proposal 0.0

Staff verified 1.0 · Verified student report 0.75 · Stale report 0.20 ·
Unverified Data 0.10 · n/a 0.0
```

After open-state and usable-availability filtering, the search sort applies an
additional trust guard before comparing scores: Unverified Data stays
behind verified rows. This prevents a very recent unverified row from outranking
a slightly older staff-verified row solely because of distance or other score
inputs. Staff versus verified-student results remain score-based.

### Open state (`open_state`)

Compares "now" (Eastern) against today's `opens_minute`/`closes_minute`:

- `isOpen`: `true`/`false`, or `null` when hours are unknown.
- `closesAt`: formatted `"HH:MM"` (supports `"24:00"`).
- `closingSoon`: `true` when 0–45 minutes remain.

### Distance and walking time (`route_estimate`, `haversine_km`)

Only when the request supplies `latitude`/`longitude` **and** the location has
coordinates:

```
straight_line = haversine_km(user, location)          # R = 6371.0088 km
route_km      = straight_line × route_detour_factor   # default 1.3
walk_minutes  = max(1, round(route_km / walking_speed_kmh × 60))   # 4.8 km/h
```

`distanceKm` is rounded to 2 decimals. Otherwise both fields are `null`.

### Reservation eligibility (`reservation_state`)

- Not proposed to stock, or not Available/Low stock → `No`
- Confidence is `Stale report` → `Verify first`
- Otherwise → `Yes`

Then search forces `No` when the location has `reservation_supported = 0`.
The frontend disables the Reserve button unless the value is exactly `Yes`.

### Score (`calculate_score`)

```
score = availability × 0.40
      + confidence    × 0.25
      + proximity     × 0.20      # 0.5 when travel time unknown, else 1 − minutes/60
      + open_hours    × 0.15      # open 1.0, unknown 0.25, closed 0.0
− stale_penalty (0.2) when confidence is "Stale report"
```

Clamped to `[0, 1]`, rounded to 4 decimals. The weights and penalty come from
the `settings` table, so dataset tweaks change ranking without code changes.

## Ordering

Results are sorted by the tuple, descending:

1. `isOpen is True`
2. availability not in `{Out of stock, Temporarily unavailable, Not stocked in proposal}`
3. `score`

So an open, in-stock, lower-scoring row outranks a closed high-scoring one.
`frontend/src/components/result-card.tsx` labels index 0 with a "Best match"
group header. The numeric `score` is not shown in the UI; it only drives
ordering.

## Changing the algorithm

1. Keep functions in `ranking.py` pure (data + `now` + settings in, values out).
2. Update the weight/default constants in **both** `ranking.py` and the
   `settings` fallbacks, and re-seed if the workbook holds the value.
3. Adjust `tests/test_ranking.py` and `tests/test_search.py`.
4. Update this file and the `SearchResult` docs in
   [api-reference.md](api-reference.md) and `frontend/src/types/api.ts`.
