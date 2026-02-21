# MPA structure: business side + buyer side

Single frontend app (MPA) with two main areas: **business** (listings, orders, dashboard) and **buyer** (marketplace, cart, orders). No third-party brand names in UI or routes.

---

## 1. Two sides at a glance

| Side      | Who uses it              | Purpose |
|-----------|--------------------------|--------|
| **Business** | Restaurants, partners     | Create listings, set quantity/price, see requests, manage pickups. |
| **Buyer**    | Customers                 | Browse surplus, reserve bags, pay (standard/EBT), see their orders. |

Same app, different URL prefixes and (optionally) role-based access.

---

## 2. Frontend routes (apps/web)

Use a single React app with React Router. Base paths:

- **Buyer:** `/` (marketplace) and `/orders`, `/account`, etc.
- **Business:** `/business` (or `/partner`) for all business-side pages.

### Buyer side (public / logged-in buyer)

| Path           | Page / purpose |
|----------------|----------------|
| `/`            | Marketplace – list surplus listings near you, filters, “Reserve” CTA. |
| `/listing/:id` | Listing detail – one surplus offer, quantity left, reserve / add to cart. |
| `/cart`        | Cart / checkout – review, payment (standard or EBT if eligible), confirm. |
| `/orders`      | My orders – list of reservations, status, pickup details. |
| `/account`     | Account / profile (optional for MVP). |

### Business side (logged-in business)

| Path                    | Page / purpose |
|-------------------------|----------------|
| `/business`             | Dashboard – overview (today’s listings, requests, stats). |
| `/business/listings`    | Listings – list/create/edit surplus offers (item, qty, price, deadline). |
| `/business/listings/new`| Create listing form. |
| `/business/listings/:id`| Edit listing + see requests for this listing. |
| `/business/requests`    | All requests – by listing, status, time. |
| `/business/orders`      | Orders / allocations – who got what, pickup status (optional). |
| `/business/pickups`     | Pickup flow – scan/confirm handoff (optional for MVP). |

Use a single layout for buyer and one for business (e.g. `BuyerLayout`, `BusinessLayout`) with nav that only shows the relevant links.

---

## 3. Backend API (apps/api – FastAPI)

Same API serves both sides. Group routes by domain; auth (later) can restrict by role.

### Buyer-facing endpoints

| Method + path              | Purpose |
|----------------------------|--------|
| `GET /api/listings` or `GET /api/market` | List listings (filters: near me, available, etc.). |
| `GET /api/listings/:id`    | One listing detail. |
| `POST /api/listings/:id/request` or `POST /api/orders` | Create a request/order (reserve a bag). |
| `GET /api/orders`          | Current user’s orders (buyer). |
| `GET /api/orders/:id`      | One order detail. |

### Business-facing endpoints

| Method + path              | Purpose |
|----------------------------|--------|
| `POST /api/listings`       | Create listing. |
| `GET /api/listings`        | List my listings (business). |
| `PATCH /api/listings/:id`  | Update listing (qty, deadline, deactivate). |
| `GET /api/listings/:id/requests` | Requests for one listing. |
| `POST /api/listings/:id/allocate` | Run allocation (e.g. lottery), create allocations. |
| `GET /api/requests`       | All my requests (business). |
| `GET /api/allocations`     | Allocations / pickups for my listings. |
| `POST /api/pickup/scan`    | Confirm pickup (scan or mark done). |

Optional: prefix business routes, e.g. `GET /api/business/listings`, or keep flat and restrict by role in the handler.

---

## 4. Data / entities (backend)

Minimal set that supports both sides:

- **User** – id, email, role (`buyer` | `business`), profile fields.
- **Listing** – id, business_id, item_name, total_qty, partner_qty, public_qty, price, request_deadline, status.
- **Request** – id, listing_id, user_id (buyer), status (e.g. pending, allocated, cancelled).
- **Allocation** – id, listing_id, user_id, request_id, status, qr_token, picked_up_at.

Business side creates listings and allocations; buyer side creates requests and sees orders (their requests + allocations).

---

## 5. Folder structure (apps/web)

Keep one app; split by feature and by “side” in nav/routes only.

```
apps/web/src/
├── api/              # API client (axios/fetch) – market, listings, orders, business
├── components/       # Shared (Button, Card, Layout, …)
├── pages/            # One component per route (or use route config)
│   ├── buyer/
│   │   ├── Marketplace.tsx    # /
│   │   ├── ListingDetail.tsx # /listing/:id
│   │   ├── Cart.tsx          # /cart
│   │   └── Orders.tsx        # /orders
│   └── business/
│       ├── Dashboard.tsx     # /business
│       ├── Listings.tsx      # /business/listings
│       ├── ListingEdit.tsx   # /business/listings/:id
│       ├── NewListing.tsx    # /business/listings/new
│       ├── Requests.tsx      # /business/requests
│       └── Pickups.tsx       # /business/pickups (optional)
├── layouts/
│   ├── BuyerLayout.tsx       # Header/nav for buyer
│   └── BusinessLayout.tsx    # Header/nav for business
├── App.tsx                   # Router, route list, layout per section
└── main.tsx
```

You can use `pages/` as above or map routes to `app/` if you adopt Next-style file-based routing later; the important part is clear separation of buyer vs business pages and layouts.

---

## 6. Navigation and entry

- **Buyer:** Nav links to Marketplace, Orders, (Account). Default entry `/` = marketplace.
- **Business:** Nav links to Dashboard, Listings, Requests, (Pickups). All under `/business/*`.
- **Switching:** If you support both roles, a role switcher or “For businesses” link can go to `/business`; “Shop” or “Market” goes to `/`. No need to mention any external brand name.

---

## 7. MVP order

1. **Backend:** Models (User, Listing, Request, Allocation), stub or real DB. Endpoints: `GET/POST /api/listings`, `GET /api/market`, `POST /api/listings/:id/request`, `GET /api/orders`.
2. **Frontend buyer:** Routes and pages for `/`, `/listing/:id`, `/cart`, `/orders`; call API; minimal UI.
3. **Frontend business:** Routes and pages for `/business`, `/business/listings`, `/business/listings/new`; create listing form; call `POST /api/listings`.
4. **Then:** Allocation flow, pickup scan, auth (login, role), EBT/payment wiring.

This gives you the basics of an MPA with a clear business side and buyer side and a structure you can grow without naming any third-party brand.
