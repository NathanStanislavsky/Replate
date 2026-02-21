# Plan: tgtg_v1_boston_geojson

**Project:** Fixed-price Too Good To Go–style app with a **Boston-only** map using **MongoDB GeoJSON + 2dsphere** (no repeated geocoding).

---

## Stack

| Layer     | Choice                          |
|----------|-----------------------------------|
| Backend  | FastAPI (Python)                  |
| Database | MongoDB (Atlas or local)          |
| Frontend | React (Vite + TypeScript)         |
| Geocoding| Optional (Nominatim or Google) **on create/update only** |

---

## MongoDB setup

1. **Create MongoDB instance**  
   Use MongoDB Atlas or local MongoDB. Get a connection string (`MONGODB_URI`).

2. **Database and collections**  
   - Database name: e.g. `replate`  
   - Collections: `listings`, `orders` (optionally `businesses` / `users` later)

3. **Create 2dsphere index on `listings.location`**  
   Required for fast map queries. Run on startup or as a one-time migration.

   ```javascript
   db.listings.createIndex({ "location": "2dsphere" })
   ```

4. **GeoJSON format**  
   - `location` must be a GeoJSON **Point**: `{ "type": "Point", "coordinates": [lng, lat] }`  
   - **Order is longitude first, then latitude.**

**Env vars**

- `MONGODB_URI` – e.g. `mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority`
- `DB_NAME` – e.g. `replate`

---

## Data model

### `listings`

| Field           | Type / notes |
|----------------|--------------|
| `business_id`  | reference or string |
| `business_name`| string |
| `title`        | string |
| `price_cents`  | int |
| `qty_available`| int |
| `pickup_start` | datetime/ISO |
| `pickup_end`   | datetime/ISO |
| `status`       | `open` \| `sold_out` \| `closed` |
| `address`      | string (optional) |
| **`location`** | **GeoJSON Point: `{ type: "Point", coordinates: [lng, lat] }`** |
| `created_at`   | datetime |

**Indexes**

- `location`: **2dsphere** (required for `$geoWithin` / `$near`).

### `orders`

| Field        | Type / notes |
|-------------|----------------|
| `listing_id`| reference |
| `user_name` | string (no auth in V1) |
| `status`    | `reserved` \| `picked_up` \| `canceled` |
| `qr_token`  | string |
| `created_at`| datetime |

---

## Plan (steps)

### 1. Store coordinates as GeoJSON (geocode once)

- If a listing has `address` and no `location` → geocode **once** and store `location` as GeoJSON Point.
- **Never** geocode on map load or listing fetch.

```json
{
  "type": "Point",
  "coordinates": [ -71.0589, 42.3601 ]
}
```

(Order: `[lng, lat]`.)

---

### 2. Efficient API: filter by map bounds

**Endpoint:** `GET /api/market` (or `GET /listings`)

**Optional query params:** `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng` (south-west and north-east corners of the visible map).

**MongoDB (2dsphere):** For `$geoWithin`, use a **Polygon** (a bounding box). `$box` is for the legacy 2d index, not 2dsphere.

**If bounds are present:**

- Build a polygon for the rectangle:  
  `[sw_lng, sw_lat]` → `[ne_lng, sw_lat]` → `[ne_lng, ne_lat]` → `[sw_lng, ne_lat]` → `[sw_lng, sw_lat]` (close ring).
- Query:

```javascript
{
  "status": "open",
  "location": {
    "$geoWithin": {
      "$geometry": {
        "type": "Polygon",
        "coordinates": [[
          [sw_lng, sw_lat],
          [ne_lng, sw_lat],
          [ne_lng, ne_lat],
          [sw_lng, ne_lat],
          [sw_lng, sw_lat]
        ]]
      }
    }
  }
}
```

**If no bounds:**  
Query `{ "status": "open" }` (and optionally only documents that have `location`).

---

### 3. Create 2dsphere index on `location`

- **When:** On app startup or one-time migration.
- **Index:** `{ "location": "2dsphere" }` on collection `listings`.

---

### 4. Response shape (for map + list)

Include at least:

- `id`, `business_name`, `title`, `price_cents`, `qty_available`, `pickup_start`, `pickup_end`, **`location`**

Frontend reads coordinates from the GeoJSON Point:

- `lng` = `location.coordinates[0]`
- `lat` = `location.coordinates[1]`

---

### 5. Boston-only map (frontend)

| Setting      | Value |
|-------------|--------|
| **Center**  | `lat: 42.3601`, `lng: -71.0589` |
| **Default zoom** | 13 |
| **Max bounds (optional)** | SW `42.2279, -71.1912` / NE `42.3996, -70.986` |

**Behavior**

- On initial load: fetch listings (with Boston bounds or default bounds).
- On pan/zoom: debounce, then refetch with new `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`.

---

## V1 endpoints (minimum)

**Listings**

- `POST /listings` – Business creates a fixed-price listing (include `location` or `address`; if address, geocode once and set `location`).
- `GET /listings` or `GET /api/market` – Public feed; optional `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng` for bounds.

**Orders**

- `POST /listings/{id}/reserve` – Reserve one; atomic decrement `qty_available`.
- `POST /pickup/scan` – Mark order as `picked_up` via `qr_token`.

---

## Summary

| Topic        | Decision |
|-------------|----------|
| **Location storage** | GeoJSON Point `{ type: "Point", coordinates: [lng, lat] }` on `listings.location`. |
| **Geocoding**       | Once on create/update when address is set; never on read. |
| **Bounds filter**   | `GET /api/market?sw_lat=...&sw_lng=...&ne_lat=...&ne_lng=...`; backend uses `$geoWithin` + Polygon. |
| **Index**           | `2dsphere` on `listings.location`. |
| **Boston**          | Frontend center and optional max bounds as above; refetch on pan/zoom with debounce. |
