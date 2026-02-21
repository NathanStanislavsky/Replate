# Replate API (Flask)

## Setup

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
flask run --port 5001
# API at http://127.0.0.1:5001 (5000 often used by macOS AirPlay)
```

Dev seed: on first run, a buyer user (id=1) and business user (id=2, "Boston Beanery") are created if the DB is empty.

## Endpoints

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
