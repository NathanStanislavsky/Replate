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
   uvicorn main:app --reload --port 5001
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
│   │   ├── routers/           ← listings, orders, business
│   │   └── services/geocode.py
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
