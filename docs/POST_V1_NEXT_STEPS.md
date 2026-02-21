# Post-V1 next steps

**Objective:** Harden V1, add business side, and improve map UX with filters while keeping the system simple and reliable.

---

## 1. Harden V1

### 1.1 Atomic reserve (no oversell)

- **Endpoint:** `POST /listings/{id}/reserve`
- **DB:** `findOneAndUpdate`: filter `_id`, `status: "open"`, `qty_available: { $gte: 1 }`; update `$inc: { qty_available: -1 }`. Return updated doc.
- **Post-update:** If new `qty_available` is 0, set `status: "sold_out"` (same request).
- **Validation:** If update returns null → **409** Sold out / unavailable.

### 1.2 Idempotent pickup scan

- **Endpoint:** `POST /pickup/scan` body `{ qr_token }`
- **DB:** `findOneAndUpdate` on orders: filter `qr_token`, `status` in `["reserved", "picked_up"]`. If `status == "reserved"` → set `picked_up`, `picked_up_at`. If already `picked_up` → return **200** with `already_picked_up: true` (do not change anything, do not double-increment).
- **Responses:** 200 `{ ok, already_picked_up }`; 404 if qr_token not found.

### 1.3 Cancel and restock

- **Endpoint:** `POST /orders/{id}/cancel`
- **Rules:** Only if `order.status == "reserved"`. Set order `status: "canceled"`, `canceled_at`. Atomic increment listing `qty_available` by 1; if listing was `sold_out`, set `status: "open"`.

### 1.4 No-show auto-cancel (cron/background)

- **Schedule:** Every 5 minutes (or similar).
- **Rules:** Find orders `status: "reserved"` where listing `pickup_end < now`. Set order to `canceled`, `no_show_at`; increment listing `qty_available` by 1 (and set listing back to `open` if needed). Optionally increment `user.no_show_count` if we have user ref.

### 1.5 Schema changes

- **orders:** Add `picked_up_at`, `canceled_at`, `no_show_at`, `cancel_reason`, `business_id` (at creation).
- **users** (if present): Add `no_show_count`.

---

## 2. Business side

### 2.1 business_id separation

- Every listing has `business_id`. Business endpoints require `business_id` (header `X-Business-Id` or body). Mock auth: input `business_code` → lookup in `businesses` → `business_id`.

### 2.2 Business listings CRUD

- `POST /business/listings` – create (body includes business_id or from header).
- `GET /business/listings` – list for that business_id.
- `PATCH /business/listings/{id}` – update only if listing.business_id matches.

### 2.3 Business view reservations

- `GET /business/listings/{id}/orders` – orders for that listing; only if listing belongs to business.

### 2.4 Business view pickup status

- `GET /business/orders?status=reserved|picked_up|canceled` – filter by business_id (via listing_id → listing.business_id or orders.business_id).

### 2.5 Schema

- **listings:** Already have `business_id`; add `category` (optional).
- **orders:** Add `business_id` at creation (from listing).
- **businesses:** New collection: `_id`, `name`, `business_code` (unique).

### 2.6 Frontend

- `/business/login` – enter business_code → store business_id (e.g. localStorage).
- `/business/listings` – create + list + edit (Mongo/API).
- `/business/listings/:id/orders` – reservations + pickup status.

---

## 3. Map quality and filters

### 3.1 Bounds-only market fetch

- `GET /api/market` – optional `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`. Use **$geoWithin** with **Polygon** (2dsphere); do not use `$box` (legacy 2d). Index: `location` 2dsphere.

### 3.2 Filters (open_now, price, category)

- **Query params (optional):** `open_now=true`, `min_price_cents`, `max_price_cents`, `category`.
- **open_now:** `pickup_start <= now <= pickup_end`.
- **Price:** `price_cents` between min/max.
- **category:** exact match on `listing.category`.
- **Indexes:** 2dsphere on `location`; compound `(status, pickup_start, pickup_end)`, `(status, price_cents)`, `(status, category)` for filtered queries.

### 3.3 Frontend

- **Debounced fetch on pan/zoom** – already in place (e.g. 400 ms).
- **Filters UI:** Open now toggle, min/max price inputs, category dropdown. Refetch with bounds + filter params.
- **Clustering** – optional later (e.g. react-leaflet-cluster) when marker count is large.

---

## Implementation status

- [x] Atomic reserve (findOneAndUpdate + sold_out)
- [x] Idempotent pickup (already_picked_up 200, PickupScanResponse)
- [x] Cancel + restock endpoint (POST /orders/{id}/cancel)
- [x] Order schema (picked_up_at, canceled_at, no_show_at, cancel_reason, business_id)
- [ ] No-show job (cron/script – not implemented; doc only)
- [x] Businesses collection + business_code lookup (GET /business/lookup)
- [x] Business listings CRUD + orders endpoints (X-Business-Id)
- [x] Market filters (open_now, price, category) + indexes
- [x] Frontend business login + listings + orders (Mongo)
- [x] Frontend map filters UI (open now, min/max price, category)
