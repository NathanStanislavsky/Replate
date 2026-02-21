# Replate

Replate is a Boston-first surplus food marketplace inspired by Too Good To Go.

Current product focus:
- Buyers discover listings on a map and reserve pickups.
- Businesses create and manage listings.
- Pickup is validated with QR tokens.

## Current status

This repo is currently centered on:
- FastAPI + MongoDB backend in `apps/api`
- React + Vite frontend in `apps/web`
- Geo-enabled market feed with map bounds filtering
- Atomic reserve flow, idempotent pickup scan, and cancel+restock
- Business-side listing CRUD and order views via `X-Business-Id`

## Stack

- Backend: FastAPI, Motor, MongoDB
- Frontend: React, Vite, TypeScript, Tailwind, React Router, Leaflet
- Monorepo tooling: npm workspaces + Turborepo

## Repository layout

```text
rePlate/
  apps/
    api/
      main.py
      database.py
      schemas.py
      routers/
        listings.py
        orders.py
        business.py
      services/
        geocode.py
    web/
      src/
        App.tsx
        api/
          market.ts
          business.ts
        pages/
          buyer/
          business/
      vite.config.ts
  docs/
    TGTG_V1_BOSTON_PLAN.md
    POST_V1_NEXT_STEPS.md
```

## Prerequisites

- Node.js >= 18
- npm >= 10
- Python 3.11+
- MongoDB (local or Atlas)

## Quick start

### 1) Install web dependencies

From repo root:

```bash
npm install --legacy-peer-deps
```

Note: this repo pins `legacy-peer-deps=true` in `.npmrc` because `react-leaflet@4` has a React 18 peer dependency while the app uses React 19.

### 2) Configure API env

Create `apps/api/.env` with:

```env
MONGODB_URI=mongodb://localhost:27017
DB_NAME=replate
```

### 3) Start backend

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 5001
```

API will run at `http://127.0.0.1:5001` (docs at `/docs`).

### 4) Start frontend

In a second terminal from repo root:

```bash
npm run dev --workspace=web
```

Frontend runs at `http://localhost:3000`.

Vite proxy forwards `/api` to `http://127.0.0.1:5001`.

## Frontend routes

Buyer:
- `/` -> Marketplace map
- `/map` -> Marketplace map
- `/listing/m/:id` -> Listing detail and reserve

Business:
- `/business` -> Business listings page
- `/business/login` -> Business code login
- `/business/m/listings` -> Business listings
- `/business/m/listings/:id/orders` -> Orders for listing

## API endpoints

Base URL: `http://127.0.0.1:5001/api`

Market / listings:
- `GET /market` with optional bounds and filters:
  - `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`
  - `open_now`, `min_price_cents`, `max_price_cents`, `category`
- `POST /listings` create listing
- `GET /listings/{listing_id}` listing detail

Orders:
- `POST /listings/{listing_id}/reserve` reserve 1 unit (atomic decrement)
- `POST /pickup/scan` idempotent pickup scan by `qr_token`
- `POST /orders/{order_id}/cancel` cancel reserved order and restock

Business:
- `GET /business/lookup?business_code=...` -> business id lookup
- `GET /business/listings` (requires `X-Business-Id`)
- `POST /business/listings` (requires `X-Business-Id`)
- `PATCH /business/listings/{listing_id}` (requires `X-Business-Id`)
- `GET /business/listings/{listing_id}/orders` (requires `X-Business-Id`)
- `GET /business/orders?status=...` (requires `X-Business-Id`)

## Data model snapshot

`listings`:
- business info, title, price, qty, pickup window, status
- optional address/category
- optional GeoJSON location (`{ type: "Point", coordinates: [lng, lat] }`)

`orders`:
- listing_id, business_id, user_name
- status (`reserved`, `picked_up`, `canceled`)
- qr_token and timestamps

`businesses`:
- name
- unique `business_code`

## Helpful commands

From repo root:

```bash
npm run dev --workspace=web
npm run build --workspace=web
npm run lint
npm run check-types
```

## Troubleshooting

- White screen / map not loading:
  - Ensure frontend deps installed: `npm install --legacy-peer-deps`
  - Ensure API is running on `5001`
  - Check browser console for runtime errors
- Vite proxy error `ECONNREFUSED 127.0.0.1:5001`:
  - Start FastAPI with uvicorn
- `Failed to resolve import "react-leaflet"`:
  - Reinstall with `npm install --legacy-peer-deps`

## Project docs

- `docs/TGTG_V1_BOSTON_PLAN.md` - V1 architecture and map strategy
- `docs/POST_V1_NEXT_STEPS.md` - post-V1 hardening and roadmap
- `docs/NEXT_STEPS_LIKE_TGTG.md` - product evolution plan