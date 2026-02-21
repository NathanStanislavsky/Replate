# Replate – dev journal

For anyone joining the project: this file explains **what we’re building**, **how the repo is set up**, and **what changed over time** so you can follow the codebase.

---

## What we’re building

- **Replate** – surplus food marketplace (fixed-price, TGTG-style).
- **Buyer side:** Browse listings, see a **Boston map**, reserve a bag, pick up (scan QR).
- **Business side:** Create listings, manage orders (existing Flask flow).
- **Boston-only map:** Listings with a GeoJSON `location` show on the map; we only fetch what’s in the current map bounds (efficient).

---

## How to run

1. **MongoDB** – You need a running MongoDB (local or Atlas). Env var: **`MONGODB_URI`** (and `DB_NAME`) in `apps/api/.env` (see `apps/api/.env.example`).
2. **PostgreSQL (Neon)** – The Flask app uses PostgreSQL hosted on [Neon](https://neon.tech). Env var: **`DATABASE_URL`**. Create a project, then set it in `apps/api/.env` to your Neon connection string (see `apps/api/.env.example`).
3. **API (FastAPI + MongoDB)** – For the map and new market:
   ```bash
   cd apps/api
   source .venv/bin/activate   # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   uvicorn main:app --reload --port 5001
   ```
   - Optional: the old **Flask** API (listings/requests/allocations) still lives under `app/`; run with `flask run --port 5002` if you need it.
4. **Web**
   ```bash
   npm install && npm run dev --workspace=web
   ```
   Open **http://localhost:3000**. Use **Map** for the Boston map; **Marketplace** for the older list view.

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
│   │   ├── schemas.py         ← Pydantic: ListingCreate, ListingResponse, GeoPoint, ReserveBody, etc.
│   │   ├── routers/
│   │   │   ├── listings.py    ← GET /api/market (optional bounds), POST /api/listings, GET /api/listings/:id
│   │   │   └── orders.py      ← POST /api/listings/:id/reserve, POST /api/pickup/scan
│   │   ├── services/
│   │   │   └── geocode.py     ← Geocode address once (Nominatim) when creating a listing
│   │   └── app/               ← Old Flask app (PostgreSQL/Neon, requests/allocations). Still used by business UI.
│   └── web/                   ← Frontend (Vite + React + TypeScript)
│       └── src/
│           ├── api.ts         ← Client for Flask API (market, orders, business)
│           ├── api/market.ts  ← Client for FastAPI market (bounds, reserve, GeoJSON listings)
│           ├── components/
│           │   ├── BostonMap.tsx   ← Leaflet map, Boston center, markers, onBoundsChange (debounced)
│           │   └── ListingCard.tsx
│           ├── pages/buyer/
│           │   ├── Marketplace.tsx      ← List view (Flask market)
│           │   ├── MarketplaceMap.tsx   ← Map view (FastAPI market + bounds)
│           │   ├── MarketListingDetail.tsx  ← Detail + reserve (FastAPI, /listing/m/:id)
│           │   └── ...
│           └── layouts/
```

---

## Two backends (why)

- **Flask (apps/api/app/)** – Original: PostgreSQL (Neon), listings/requests/allocations, business dashboard, “run allocation” lottery. Still used by **Marketplace** (list), **business** pages, **Orders**.
- **FastAPI (apps/api/main.py + routers/)** – New: MongoDB, GeoJSON locations, **GET /api/market** with optional bounds (`sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`) for the map. Used by **Map** page and **reserve** flow. Geocoding (Nominatim) runs once when you create a listing with an address.

So: **list + business flows** = Flask; **Boston map + reserve** = FastAPI + MongoDB.

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
- **SQLite → PostgreSQL (Neon)** – Flask app now uses PostgreSQL hosted on Neon. Set `DATABASE_URL` in `apps/api/.env` to your Neon connection string. Added `psycopg2-binary`; config normalizes `postgres://` to `postgresql://` for compatibility. Existing SQLAlchemy models work unchanged; run the app once against Neon to create tables (and seed users if empty).
