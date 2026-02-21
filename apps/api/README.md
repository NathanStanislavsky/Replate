# Replate API (FastAPI + MongoDB)

Single backend: FastAPI with Motor (MongoDB). Boston map, listings, reserve/pickup, business flows.

## Setup

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Set `MONGODB_URI` and `DB_NAME` in `.env`.

## Run

```bash
uvicorn main:app --reload --port 5001
```

API at http://127.0.0.1:5001 — docs at http://127.0.0.1:5001/docs

## Endpoints

- `GET /api/market?sw_lat=&sw_lng=&ne_lat=&ne_lng=` – open listings (optional bounds + filters)
- `POST /api/listings` – create listing (geocode if address provided)
- `GET /api/listings/:id` – one listing
- `POST /api/listings/:id/reserve` – reserve one (body: user_name); atomic
- `POST /api/pickup/scan` – mark picked up (body: qr_token)
- `POST /api/orders/:id/cancel` – cancel and restock
- Business: `GET /api/business/lookup?code=`, `GET /api/business/listings`, `GET /api/business/listings/:id/orders`
