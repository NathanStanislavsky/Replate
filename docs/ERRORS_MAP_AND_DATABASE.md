# Errors when accessing the map and database

Here’s what shows up in your terminals and how to fix it.

---

## 1. Map: “Failed to resolve import 'react-leaflet'”

**What you see (Vite):**  
`Failed to resolve import "react-leaflet" from "src/components/BostonMap.tsx". Does the file exist?`

**Cause:**  
`react-leaflet` (and/or `leaflet`) isn’t installed or isn’t where Vite expects it. In a monorepo that can happen if install didn’t run correctly or ran before `.npmrc` was added.

**Fix:**

1. From the **repo root** (`rePlate/`), run:
   ```bash
   npm install
   ```
   (Root has `.npmrc` with `legacy-peer-deps=true` so `react-leaflet` installs despite React 19.)

2. If it still fails, install in the web app and run dev from there:
   ```bash
   cd apps/web && npm install --legacy-peer-deps && npm run dev
   ```

3. Restart the dev server after install (`Ctrl+C` then `npm run dev --workspace=web` again).

---

## 2. Map: “connect ECONNREFUSED 127.0.0.1:5001”

**What you see (Vite proxy):**  
`[vite] http proxy error: /api/market  Error: connect ECONNREFUSED 127.0.0.1:5001`

**Cause:**  
The frontend proxies `/api` to `http://127.0.0.1:5001`. If nothing is listening on 5001, the proxy gets “connection refused.”

**Fix:**  
Start the FastAPI backend (from repo root or `apps/api`):

```bash
cd apps/api
source .venv/bin/activate
uvicorn main:app --reload --port 5001
```

Leave that running in one terminal; run the web app in another. Then open the **Map** page again.

---

## 3. Database: MongoDB not running or wrong URI

**What you see:**  
- On **startup:** Motor/MongoDB connection errors when `uvicorn` starts (e.g. when creating indexes).  
- On **first request:** 500 or connection errors when hitting `/api/market` or other endpoints.

**Cause:**  
FastAPI uses MongoDB (Motor). If MongoDB isn’t running locally or `MONGODB_URI` is wrong, the app can’t connect.

**Fix:**

1. **Local MongoDB:** Install and start MongoDB, then in `apps/api/.env` set for example:
   ```bash
   MONGODB_URI=mongodb://localhost:27017
   DB_NAME=replate
   ```

2. **MongoDB Atlas:** In Atlas, get a connection string and set:
   ```bash
   MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=replate
   ```

3. Restart the API after changing `.env`: stop uvicorn (`Ctrl+C`) and run `uvicorn main:app --reload --port 5001` again.

---

## 4. “405 Method Not Allowed” on GET /api/listings?business_id=2

**What you see (browser or Network tab):**  
`GET /api/listings?business_id=2` → **405 Method Not Allowed**

**Cause:**  
The **FastAPI** app on port 5001 does **not** define `GET /api/listings` with a query param. It has:
- `GET /api/market` (optional bounds/filters)
- `GET /api/listings/{listing_id}` (single listing)
- `GET /api/business/listings` (with `X-Business-Id` header)

The **Flask** app (which used to have `GET /api/listings?business_id=2`) is a different app and isn’t mounted on 5001. So when the frontend calls that URL against 5001, FastAPI returns 405.

**Fix (choose one):**

- **Use the Map/Boston flow:** Use **Map** and **Business → Map business (login)**. Those use FastAPI: `/api/market`, `/api/business/listings`, etc.
- **Use the old Dashboard/Listings:** Run the **Flask** app on another port (e.g. 5002) and point those pages at 5002 (e.g. via env or a second proxy). Then `GET /api/listings?business_id=2` would go to Flask.

---

## 5. “404 Not Found” on GET /api/orders and GET /api/requests

**What you see:**  
`GET /api/orders?user_id=1` or `GET /api/requests?business_id=2` → **404 Not Found**

**Cause:**  
Those routes exist only in the **Flask** app (SQLite, old flow). The **FastAPI** app (MongoDB) doesn’t have:
- `GET /api/orders`
- `GET /api/requests`

So when the frontend sends these to port 5001, FastAPI returns 404.

**Fix:**  
Same as §4: either use the Map + business login flow (FastAPI) or run Flask on another port and send those requests to Flask.

---

## Quick checklist

| Issue | Check |
|-------|--------|
| Map page blank or “react-leaflet” error | Run `npm install` from repo root; restart `npm run dev --workspace=web`. |
| Map /api requests fail with ECONNREFUSED | Start API: `cd apps/api && uvicorn main:app --reload --port 5001`. |
| API won’t start or DB errors | Start MongoDB; set `MONGODB_URI` and `DB_NAME` in `apps/api/.env`. |
| 405 on GET /api/listings | You’re calling a Flask-style URL on FastAPI; use Map + business login or run Flask on 5002. |
| 404 on /api/orders or /api/requests | Those are Flask routes; use FastAPI flows or run Flask on 5002. |
