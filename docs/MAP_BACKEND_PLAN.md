# Plan: Boston map for restaurants (backend-efficient)

> **MongoDB + FastAPI + GeoJSON (Boston-only, 2dsphere):** see **[TGTG_V1_BOSTON_PLAN.md](./TGTG_V1_BOSTON_PLAN.md)**.

---

## Goal (SQL/Flask variant)

Show a map of Boston with restaurant/listing markers. Keep the backend efficient: no geocoding on every request, minimal data transfer, and scalable filtering.

---

## 1. Store coordinates in the DB (geocode once)

**Add `lat` and `lng` to the data that represents “where the listing is.”**

- **Option A – on `Listing`:** Add nullable `lat`, `lng` (e.g. `Float`) to `Listing`. Each listing can have its own pickup location. Best if the same business can have different addresses per listing.
- **Option B – on `User` (business):** Add nullable `lat`, `lng` to `User`. All listings from that business share one pin. One geocode per business; simpler.

**Recommendation:** **Option A (on `Listing`)**. You already have `address` on Listing; add `lat` and `lng` there. If a business always has one address, the frontend can send the same lat/lng for each listing, or you can later add a “default location” on User and fall back to it when Listing has no coords.

**Geocode once, not on every map load:**

- When a listing is **created or updated** and `address` is set (and `lat`/`lng` are missing or address changed), call a geocoder **once** (e.g. Nominatim, or Google Geocoding if you have a key).
- Store the result in `lat` and `lng`. All future map and list requests just read from the DB.
- Optional: run a small script or admin endpoint to backfill lat/lng for existing listings that have an address but no coords.

This keeps map and market endpoints fast and avoids external API calls on every request.

---

## 2. API: support bounds (or radius) so the frontend doesn’t fetch everything

**Current:** `GET /api/market` returns all listings with availability.

**Efficient approach:** Add optional query params so the map (or list) can request only what’s in view.

**Option 1 – Bounding box (best for maps):**

- Params: `?sw_lat=42.30&sw_lng=-71.20&ne_lat=42.40&ne_lng=-71.00` (south-west and north-east corners of the visible map).
- Backend: filter listings where `lat IS NOT NULL AND lng IS NOT NULL` and  
  `lat BETWEEN sw_lat AND ne_lat AND lng BETWEEN sw_lng AND ne_lng`.
- Return only those listings (each with `lat`, `lng` in the JSON). Frontend can pan/zoom and re-request when bounds change (optionally debounced).

**Option 2 – Center + radius:**

- Params: `?lat=42.36&lng=-71.06&radius_km=5`.
- Backend: filter by distance (e.g. Haversine in SQL or in Python). Slightly more work than a box but same idea: only return listings in the area.

**Recommendation:** **Bounds (Option 1)**. Simple to implement, matches “what’s visible on the map,” and plays well with SQLite/Postgres. If you don’t pass bounds, keep current behavior: return all listings (so the list view still works). Include `lat` and `lng` in the market response whenever present so the frontend can draw markers.

---

## 3. Index for the bounds query

For `Listing`, add a composite index on `(lat, lng)` so the bounds query is fast as data grows:

- SQLite / Postgres: `CREATE INDEX idx_listings_lat_lng ON listings(lat, lng);`
- In Flask-SQLAlchemy you can add the index in a migration or in the model definition.

Only list/listings that have non-null `lat`/`lng` when filtering by bounds; listings without coords can still appear in the unfiltered “all” market response if you want.

---

## 4. Response shape

Ensure market (and any map-specific endpoint) returns each listing with:

- `id`, `business_name`, `item_name`, `available_qty`, `standard_price`, `address`, etc. (as now).
- **`lat`**, **`lng`** (nullable numbers). Omit or null when not set.

No need for a separate “map” endpoint if the same market endpoint supports bounds and returns lat/lng; the frontend can use one API for both list and map.

---

## 5. Summary (efficient backend)

| What | How |
|------|-----|
| **Where to store location** | Add `lat`, `lng` (Float, nullable) to `Listing` (and optionally to `User` later as default for business). |
| **When to geocode** | Once when address is set on create/update; store result in `lat`/`lng`. Never geocode on map load. |
| **How to avoid sending everything** | `GET /api/market?sw_lat=...&sw_lng=...&ne_lat=...&ne_lng=...`; filter in DB by bounds; return only listings in view. |
| **Speed** | Index on `(lat, lng)`; keep geocoding out of the request path. |
| **Boston default** | Frontend centers map on Boston (e.g. 42.36, -71.06); first load can call market with Boston bounds or no bounds (all), then use bounds when user pans/zooms. |

Next step after this: implement the schema change + geocode-on-save (or manual backfill), then the bounds filter and index, then the frontend map (e.g. Leaflet or Mapbox) that calls the market API with bounds and draws markers.
