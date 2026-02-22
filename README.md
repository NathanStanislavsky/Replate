# Replate

**Replate** is a Boston-first surplus food marketplace inspired by Too Good To Go.

It connects **restaurants and cafés with surplus food**, **buyers looking for affordable meals**, and **food banks and food rescue organizations**—all on one map—so surplus flows to where it’s needed most.

---

## Inspiration

Food waste and food insecurity are both issues in Boston today, and are often overlooked because we’re not “as bad” as LA or NYC. Restaurants and cafés throw away surplus every day while food banks and pantries struggle to keep up.

We wanted a single place where businesses could list surplus at a fixed price, buyers could grab affordable meals, and a share of surplus could go straight to local food banks by need. So we built **Replate**: a Boston-focused surplus food marketplace that connects businesses, buyers, and food banks on one map.

---

## What it does

**Replate** is a surplus food marketplace for Boston.

Businesses create listings (**title, quantity, price, address, category**) and can set a **donate %**—the app allocates those units to nearby food banks by **need and distance**, and the rest stays available for customers.

After creating a listing with donations, businesses choose:

**“Will you drop it off?”**

- If **yes**, they get  
  **“Deliver X units to [Name], [Address]”** with a **Get directions** link.
- If **no**, they see **contact info** so a driver from the food bank or a partner food rescue organization (like **Food Link MA**) can arrange pickup.

Buyers browse a **map of open listings** (filters for **open now, price, category**), reserve a bag, and pick up (e.g. **QR**).

**Less waste, more meals, and surplus flows to where it’s needed most.**

---

## How we built it

Feel free to reach out to  
**amadarap@bu.edu, cmiyai@bu.edu, ns16@bu.edu, kawgit56@bu.edu, or aaudi@bu.edu**  
if you have questions about any of the following sections.

---

## Backend & data

Our backend is **FastAPI with MongoDB**.

Listings have optional **GeoJSON location** (geocoded from address on creation). We use a **2dsphere index** so the map API returns only listings inside the current map bounds.

Business auth is handled via **X-Business-Id**. Endpoints cover:
- listings (CRUD)
- orders
- reserve / pickup / cancel
- donation plans

Donation routing runs as a **separate service**:
- Nearby food banks are sourced from a **Boston.gov food banks dataset**
- Each bank is scored by:
  - **Need** (calculated from food insecurity data)
  - **Driving time** (OSRM)
- Donated units are allocated **proportionally by score** (not winner-take-all)

An ingest script joins **food bank CSV data** with **Census tract food-insecurity data**, producing a **need weight** per bank. Allocation outputs include **name, address, and phone**, enabling drop-off or pickup coordination.

---

## Donation allocation & food bank data

We use:
- **OSRM** for driving-time estimates
- **Census ACS SNAP data (by tract)** as a proxy for food insecurity

Donation routing pipeline:
1. Select candidate food banks by proximity
2. Score using  
   `need_weight / (duration_minutes + 1)`
3. Split donated units **proportionally**

When `donate_percent > 0`:
- The pipeline runs
- A donation plan is persisted
- `qty_available` is reduced accordingly
- The API returns `{ listing, allocations }` so the UI can show  
  **“Deliver to…”** or **“Contact … to arrange pickup.”**

---

## Frontend

The web app is built with **React + TypeScript + Vite**.

The map view uses **Leaflet** with a light tile layer. Listings are fetched based on the current map bounds.

**Buyers**
- View listings as map markers
- Open listing details
- Reserve from the detail page

**Businesses**
- Log in via code
- Create and manage listings (Mongo-backed)
- Create-listing form includes:
  - business name
  - title
  - total quantity
  - donate %
  - address
  - price
  - category

On success, businesses choose **drop-off vs pickup**, and see either:
- delivery instructions + directions, or
- contact info for pickup  
along with remaining reservable quantity.

*(Organizations with currently available drivers are highlighted.)*

---

## Challenges we ran into

- **Allocation fairness**  
  Early winner-take-all logic over-allocated to a single bank. We switched to **proportional allocation** so high-need banks receive a fair share.

- **Donation plan vs create flow**  
  Standalone donation plan logic had to be kept in sync with the new “create listing with donate %” flow to ensure `qty_available` and donation state remained consistent.

- **Algorithm design**  
  It took **50+ iterations** to converge on a reliable food bank **need scoring algorithm**. Parameter tuning and experimentation were time-consuming but critical.

---

## Accomplishments that we're proud of

We shipped a **complete end-to-end loop**:
- Businesses list surplus and donate a portion by need
- Buyers discover and reserve food on a map
- The app handles both **drop-off** and **pickup** donation flows

The **OSRM + SNAP-powered proportional allocation** makes donations data-driven, and delivering a full marketplace + donation UX in a single Boston-focused app felt like a major milestone.

---

## What we learned

- **Data quality matters**: joining food bank locations with Census tract need and using **driving time instead of straight-line distance** materially improved allocation.
- **Proportional scoring** beats “closest” or “highest need only.”
- UX matters: explicitly asking **“Will you drop it off?”** made the business flow far clearer.
- We gained hands-on experience with **GeoJSON**, **2dsphere queries**, and keeping backend allocation logic aligned with frontend state.

---

## What's next for Replate

- User accounts (buyers and businesses)
- Rewards system + QR-based pickup
- Donation-side improvements:
  - driver assignment notifications
  - pickup scheduling
  - donation status tracking (“delivered”, “picked up”)
- Expansion beyond Boston
- Additional food rescue partners in the allocation pipeline
- Longer-term: **safecoins-style incentives** for donating businesses

---

## Current status

This repo is currently centered on:
- FastAPI + MongoDB backend in `apps/api`
- React + Vite frontend in `apps/web`
- Geo-enabled market feed with map bounds filtering
- Atomic reserve flow, idempotent pickup scan, and cancel + restock
- Business-side listing CRUD and order views via `X-Business-Id`

---

## Stack

- **Backend:** FastAPI, Motor, MongoDB  
- **Frontend:** React, Vite, TypeScript, Tailwind, React Router, Leaflet  
- **Monorepo:** npm workspaces + Turborepo

---

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
