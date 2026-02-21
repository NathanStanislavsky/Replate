# Replate API

Two entry points: **FastAPI** (MongoDB, Boston map) and **Flask** (PostgreSQL on Neon, business/allocations).

## Setup

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Set `MONGODB_URI` and `DB_NAME` in `.env` for the map API. Set `DATABASE_URL` to your Neon PostgreSQL connection string for the Flask app.

## Run

**FastAPI (MongoDB – for map + reserve):**
```bash
uvicorn main:app --reload --port 5001
# API at http://127.0.0.1:5001 — GET /api/market (optional bounds), POST /listings, POST /listings/:id/reserve, POST /pickup/scan
```

**Flask (PostgreSQL/Neon – for business dashboard):**
```bash
flask run --port 5002
# API at http://127.0.0.1:5002
```

Dev seed (Flask): on first run, buyer id=1 and business "Boston Beanery" id=2 are created if the DB is empty.

## Endpoints

**FastAPI (main.py):**
- `GET /api/market?sw_lat=&sw_lng=&ne_lat=&ne_lng=` – open listings (optional bounds for map)
- `POST /api/listings` – create listing (body: business_id, business_name, title, price_cents, qty_available, address?; geocode if address)
- `GET /api/listings/:id` – one listing
- `POST /api/listings/:id/reserve` – reserve one (body: user_name); atomic decrement
- `POST /api/pickup/scan` – mark picked up (body: qr_token)

**Flask (app/):**
- `GET /api/market` – list available listings (buyer)
- `GET /api/listings?business_id=2` – business listings
- `POST /api/listings` – create listing (body: business_id, item_name, total_qty, public_qty, standard_price, …)
- `GET /api/listings/:id` – one listing
- `PATCH /api/listings/:id` – update listing
- `POST /api/listings/:id/request` – create request (body: user_id, payment_method?)
- `GET /api/orders?user_id=1` – buyer orders
- `GET /api/listings/:id/requests` – requests for a listing
- `GET /api/requests?business_id=2` – all requests for business
- `POST /api/listings/:id/allocate` – run weighted lottery, create allocations
- `GET /api/allocations?business_id=2` – business allocations
- `POST /api/pickup/scan` – confirm pickup (body: qr_token)
- `GET/POST /api/users` – dev: list/create users
