# Replate – dev journal

For anyone joining the project: this file explains **what we’re building**, **how the repo is set up**, and **what changed over time** so you can follow the codebase.

---

## What we’re building

- **Replate** – surplus food marketplace (fixed-price, TGTG-style).
- **Buyer side:** Browse listings, see a **Boston map**, reserve a bag, pick up (scan QR).
- **Business side:** Create listings, manage orders (FastAPI + MongoDB; business login by code).
- **Boston-only map:** Listings with a GeoJSON `location` show on the map; we only fetch what’s in the current map bounds (efficient).

---

## How to run

1. **MongoDB** – You need a running MongoDB (local or Atlas). Env var: **`MONGODB_URI`** (and `DB_NAME`) in `apps/api/.env` (see `apps/api/.env.example`).
2. **API (FastAPI + MongoDB)** – Single backend:
   ```bash
   cd apps/api
   source .venv/bin/activate   # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
3. **Web**
   ```bash
   npm install && npm run dev --workspace=web
   ```
   Open **http://localhost:3000**. Home and **Map** are the Boston map; **business** → login then **Listings** (Mongo).

---

## Repo structure (high level)

```
rePlate/
├── journal.md                 ← You are here (onboarding + changelog)
├── docs/                      ← Plans (MAP_BACKEND_PLAN, TGTG_V1_BOSTON_PLAN, etc.)
├── apps/
│   ├── api/                   ← Backend
│   │   ├── main.py            ← FastAPI app (MongoDB, map API). Run with uvicorn.
│   │   ├── database.py        ← MongoDB connection (Motor), get_db(), ensure_indexes (2dsphere)
│   │   ├── schemas.py         ← Pydantic: ListingCreate, ReserveBody, OrderResponse, etc.
│   │   ├── routers/           ← listings, orders, business, donations
│   │   ├── services/          ← geocode, osrm_service, donation_routing_service
│   │   ├── scripts/           ← ingest_food_banks.py, gen_insecure_map.py
│   │   └── food_data/         ← boston_food_distributors.csv, greater_boston_snap_food_insecurity.csv
│   └── web/                   ← Frontend (Vite + React + TypeScript)
│       └── src/
│           ├── api/market.ts  ← Market (bounds, reserve, GeoJSON listings)
│           ├── api/business.ts← Business lookup, listings, orders (X-Business-Id)
│           ├── components/BostonMap.tsx
│           ├── pages/buyer/   ← MarketplaceMap, MarketListingDetail
│           ├── pages/business/← BusinessLogin, BusinessListingsMongo, BusinessListingOrders
│           └── layouts/
```

---

## Backend (FastAPI only)

- **FastAPI (main.py + routers/)** – Single backend: MongoDB, GeoJSON locations, **GET /api/market** (bounds + filters), reserve/pickup/cancel, business lookup and listings/orders. Geocoding (Nominatim) when creating a listing with an address. Frontend uses `api/market.ts` and `api/business.ts` only.

---

## Map flow (for new devs)

1. **Data:** Listings in MongoDB have optional `location: { type: "Point", coordinates: [lng, lat] }`. We create a **2dsphere** index on `location` at startup so `$geoWithin` (bounds) is fast.
2. **API:** `GET /api/market?sw_lat=...&sw_lng=...&ne_lat=...&ne_lng=...` returns only open listings whose `location` is inside that box. If you omit bounds, you get all open listings.
3. **Frontend:** **Map** page (`/map`) renders **BostonMap** (Leaflet + OSM). When the user pans/zooms, we get the new bounds and call `getMarketWithBounds(bounds)` (debounced). Markers are drawn for each listing that has `location`. “View & reserve” goes to **/listing/m/:id** (MarketListingDetail), which uses **reserveListing** (POST …/reserve).

---

## Changelog (as we go)

- **Boston map (FastAPI + MongoDB)** – Added FastAPI app in `main.py`, Motor DB, `listings` + `orders` collections, 2dsphere index, GET /api/market with bounds, POST /listings, POST /listings/:id/reserve, POST /pickup/scan. Geocode-on-save (Nominatim) in `services/geocode.py`. Frontend: Leaflet map (`BostonMap`), `MarketplaceMap` page, `MarketListingDetail`, `api/market.ts`. New nav link “Map”.
- **journal.md** – This file added so the team can onboard and follow changes.
- **Post-V1 hardening & business & map filters** – Atomic reserve (`findOneAndUpdate`, then set `sold_out` if qty 0). Idempotent pickup (200 with `already_picked_up`). POST /orders/:id/cancel (restock). Order schema: `picked_up_at`, `canceled_at`, `no_show_at`, `cancel_reason`, `business_id`. Businesses collection + GET /business/lookup?business_code=; seed DEMO. Business routes: GET/POST /business/listings, PATCH /business/listings/:id, GET /business/listings/:id/orders, GET /business/orders (X-Business-Id). Market filters: open_now, min/max_price_cents, category; indexes. Frontend: Business login (business_code → store business_id), /business/m/listings, /business/m/listings/:id/orders; map filters UI (open now, price range, category). See `docs/POST_V1_NEXT_STEPS.md`.
- **SQLite → PostgreSQL (Neon)** – (Historical.) Flask app previously used PostgreSQL on Neon; that app has been removed in favor of FastAPI + MongoDB only.
- **FastAPI-only cleanup** – Removed Flask app (`app/`, `wsgi.py`), PostgreSQL/Neon and `api.ts`. Single backend: FastAPI on port 5001. Frontend: map at `/` and `/map`, business at `/business` (listings) and `/business/m/listings/:id/orders`. Removed old Marketplace (list), Dashboard, Listings, Requests, Orders pages that depended on Flask. Updated `journal.md`, `apps/api/README.md`, `.env.example`, `requirements.txt`, Vite proxy.
- **Bug fixes** – Fixed 422 on business listing create: made `business_id` optional in `ListingCreate` schema (business router overrides it from `X-Business-Id` header anyway). Fixed missing `Link` import in `BusinessListingOrders.tsx`. Added `ErrorBoundary` to `index.tsx` and around `BostonMap` so crashes show an error message instead of a white screen.
- **Delete endpoint + seed script** – Added `DELETE /api/business/listings/{id}` to `routers/business.py` (requires `X-Business-Id`, scoped to that business). Added `apps/api/seed_test_listings.py`: run `python seed_test_listings.py seed` to create 8 Boston test listings (auto-geocoded), run `python seed_test_listings.py clean` to delete them all. IDs are saved to `seed_ids.json` between runs.
- **Food insecurity map (Census ACS)** – Added `apps/api/scripts/gen_insecure_map.py`. Reads `CENSUS_KEY` from `.env`, fetches ACS 2022 5-year SNAP data for Suffolk County (Boston) by census tract from the Census API, and outputs `greater_boston_snap_food_insecurity.csv` (222 tracts, columns: `geoid`, `county`, `tract`, `snap_rate`, `total_households`, `snap_households`, `lat`, `lng`). `snap_rate` = SNAP households / total households (food insecurity proxy). Tract centroids (lat/lng) added via Census TIGER GeoJSON API. Added `pandas` and `requests` to `requirements.txt` for script use.
- **OSRM Donation Routing v2** – Added end-to-end donation routing using OSRM driving times. New files: `services/osrm_service.py` (async httpx Table + Route API client, 5s timeout, 1 retry, graceful fallback), `services/donation_routing_service.py` (`pick_candidates` via MongoDB `$near` prefilter + OSRM, `score_candidates` by `need_weight / (duration_minutes + 1)`, `allocate_units` with capacity spill), `routers/donations.py` (`POST /api/listings/{id}/donation/plan` and `POST /api/donations/trigger-expiring`), `scripts/ingest_food_banks.py` (reads `boston_food_distributors.csv`, joins nearest SNAP tract `snap_rate` as `need_weight`, upserts into `food_banks` collection — run once before using donation endpoints). Updated `database.py` with `food_banks` (2dsphere, active) and `donations` (listing_id, food_bank_id, status) indexes. Added `DonationPlanRequest`, `AllocationItem`, `DonationPlanResponse` schemas. Registered donations router in `main.py`. Updated `.env.example` with `OSRM_BASE_URL`, `OSRM_PROFILE`, `OSRM_MAX_MINUTES`, `OSRM_TOP_K`. Public OSRM demo server used by default; falls back to Euclidean nearest if OSRM is unreachable.
- **Business listing form UX** – Cleared misleading default values (`price_cents` was 499, `qty_available` was 10). Both fields now start blank (0/1) so businesses set them intentionally. Improved placeholders to clarify units (e.g. "Price (cents, e.g. 500 = $5.00)") and added `min` constraints.
- **Donation Simulation Demo** – Added `scripts/seed_demo_simulation.py` (seeds 40 restaurant listings and runs donation plans), `routers/simulation.py` (`GET /api/simulation` returns plan data), `apps/web/src/api/simulation.ts` (frontend client), and `apps/web/src/pages/SimulationMap.tsx` (new `/demo` page with a dedicated Leaflet map showing restaurant markers, food bank markers, and allocation polylines). Wired into `App.tsx` and `BuyerLayout.tsx` for navigation.
- **Map UI overhaul** – Replaced the stacked layout with a full-viewport split view (map left, scrollable listing panel right). Swapped OSM tiles for **CartoDB Positron** (clean light gray, no API key). Replaced default pin markers with small emerald circle markers on the main map and matching green/purple circle markers on the demo map. Added a floating pill filter bar overlaid on the map (open now, price range, category). `BuyerLayout` no longer wraps content in a padded container — each non-map page (`MyOrders`, `MarketListingDetail`, `SimulationMap`) owns its own padding and max-width.
- **Proxy fix** – Vite dev proxy corrected from port 5001 to **8000** to match FastAPI's actual port. All `/api` calls now route correctly in development.
- **Donation allocation on business create** – Businesses can set a **donate %** (0–100) when creating a listing. Algorithm uses listing coordinates to find nearby food banks (from `food_banks` collection, populated by `ingest_food_banks.py` from CSV + SNAP need data), scores by need/distance, and **allocates donated units proportionally** by score (largest-remainder rounding, capacity caps). Remaining quantity becomes `qty_available` for customer reservations. API: `ListingCreate` has optional `donate_percent`; `POST /business/listings` returns `{ listing, allocations }` when donations run. Donations router still supports standalone plan and trigger-expiring; both set listing `qty_available` to remainder. Schemas: `AllocationItem` (food_bank_id, name, address, **phone**, qty, duration_minutes, score), `BusinessCreateListingResponse`. Frontend: business form has “Donate %” and “Total surplus quantity”; success shows allocation summary and reservable qty; list view shows “(donating X% to N food banks)” when applicable.
- **Success message: drop-off vs pickup** – After creating a listing with allocations, the success block asks **“Will you drop it off?”** with **Yes** / **No**. **Yes:** for each allocation, “Deliver X units to [Name], [Address]” with a **Get directions** link (Google Maps). **No:** message that a driver from the food bank or a partner food rescue organization will pick up; for each allocation, “Contact [Name]: [phone] to arrange pickup” (phone is a `tel:` link; if no phone, “Contact [Name] to arrange pickup”). API: `AllocationItem` and ingest include optional `phone`; `donation_routing_service` and business router pass it through. Seed script fixed to use `resp.json()["listing"]["id"]` after create response shape change.
- **Seed scripts & port** – Seed scripts (`seed_test_listings.py`, `seed_demo_simulation.py`) use API port **8000**. Demo simulation: lower listing prices, more restaurants, higher quantities (e.g. 50–85 units per listing). Run from `apps/api` with venv active; see “How to run” above.
