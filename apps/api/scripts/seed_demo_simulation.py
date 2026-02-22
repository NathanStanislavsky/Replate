"""
Demo simulation seed script.
Creates 40 Boston restaurant listings with pre-known lat/lng (no geocoding),
then runs the donation allocation algorithm on each one.

Usage (from apps/api/):
  python scripts/seed_demo_simulation.py seed    # create listings + compute plans
  python scripts/seed_demo_simulation.py clean   # delete everything seeded
"""
import asyncio
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import httpx

BASE_URL = "http://127.0.0.1:5001"
BUSINESS_CODE = "DEMO"
IDS_FILE = Path(__file__).parent.parent / "demo_sim_ids.json"
DONATE_PERCENT = 0.5

# 40 real Boston restaurants with verified lat/lng
# pickup window: starts now, ends in 2 hours
RESTAURANTS = [
    {"name": "Myers + Chang",        "address": "1145 Washington St, Boston, MA",       "lat": 42.3441, "lng": -71.0688, "category": "Asian", "price_cents": 800, "qty": 12},
    {"name": "Tatte Bakery - Back Bay","address": "70 E India Row, Boston, MA",         "lat": 42.3604, "lng": -71.0493, "category": "Bakery", "price_cents": 600, "qty": 8},
    {"name": "Flour Bakery + Cafe",   "address": "1595 Washington St, Boston, MA",      "lat": 42.3393, "lng": -71.0794, "category": "Bakery", "price_cents": 550, "qty": 10},
    {"name": "Pavement Coffeehouse",  "address": "44 Gainsborough St, Boston, MA",      "lat": 42.3424, "lng": -71.0869, "category": "Cafe", "price_cents": 400, "qty": 6},
    {"name": "Veggie Galaxy",         "address": "450 Massachusetts Ave, Cambridge, MA","lat": 42.3636, "lng": -71.1044, "category": "Vegan", "price_cents": 700, "qty": 9},
    {"name": "Mei Mei Restaurant",    "address": "506 Park Dr, Boston, MA",             "lat": 42.3451, "lng": -71.0979, "category": "Asian", "price_cents": 900, "qty": 7},
    {"name": "El Pelon Taqueria",     "address": "92 Peterborough St, Boston, MA",      "lat": 42.3449, "lng": -71.0979, "category": "Mexican", "price_cents": 650, "qty": 11},
    {"name": "The Salty Pig",         "address": "130 Dartmouth St, Boston, MA",        "lat": 42.3491, "lng": -71.0752, "category": "American", "price_cents": 1000, "qty": 8},
    {"name": "Bricco",                "address": "241 Hanover St, Boston, MA",          "lat": 42.3638, "lng": -71.0548, "category": "Italian", "price_cents": 1200, "qty": 5},
    {"name": "Giacomo's Ristorante",  "address": "355 Hanover St, Boston, MA",          "lat": 42.3648, "lng": -71.0543, "category": "Italian", "price_cents": 950, "qty": 6},
    {"name": "Neptune Oyster",        "address": "63 Salem St, Boston, MA",             "lat": 42.3635, "lng": -71.0558, "category": "Seafood", "price_cents": 1500, "qty": 4},
    {"name": "Mike & Patty's",        "address": "12 Church St, Boston, MA",            "lat": 42.3527, "lng": -71.0645, "category": "Sandwiches", "price_cents": 700, "qty": 10},
    {"name": "Sowa Farmers Market",   "address": "540 Harrison Ave, Boston, MA",        "lat": 42.3417, "lng": -71.0680, "category": "Market", "price_cents": 500, "qty": 15},
    {"name": "Toro Restaurant",       "address": "1704 Washington St, Boston, MA",      "lat": 42.3377, "lng": -71.0823, "category": "Spanish", "price_cents": 1100, "qty": 7},
    {"name": "Coda",                  "address": "329 Columbus Ave, Boston, MA",        "lat": 42.3473, "lng": -71.0739, "category": "American", "price_cents": 850, "qty": 9},
    {"name": "Franklin Cafe",         "address": "278 Shawmut Ave, Boston, MA",         "lat": 42.3455, "lng": -71.0692, "category": "American", "price_cents": 900, "qty": 8},
    {"name": "Orinoco",               "address": "477 Shawmut Ave, Boston, MA",         "lat": 42.3417, "lng": -71.0700, "category": "Venezuelan", "price_cents": 800, "qty": 6},
    {"name": "Gaslight Brasserie",    "address": "560 Harrison Ave, Boston, MA",        "lat": 42.3420, "lng": -71.0666, "category": "French", "price_cents": 1100, "qty": 5},
    {"name": "Coppa",                 "address": "253 Shawmut Ave, Boston, MA",         "lat": 42.3459, "lng": -71.0695, "category": "Italian", "price_cents": 950, "qty": 7},
    {"name": "Picco",                 "address": "513 Tremont St, Boston, MA",          "lat": 42.3431, "lng": -71.0694, "category": "Pizza", "price_cents": 750, "qty": 10},
    {"name": "Metropolis Cafe",       "address": "584 Tremont St, Boston, MA",          "lat": 42.3419, "lng": -71.0706, "category": "Cafe", "price_cents": 600, "qty": 8},
    {"name": "Tremont 647",           "address": "647 Tremont St, Boston, MA",          "lat": 42.3409, "lng": -71.0721, "category": "American", "price_cents": 1000, "qty": 6},
    {"name": "Wurstkuche",            "address": "8 Prospect St, Cambridge, MA",        "lat": 42.3666, "lng": -71.1038, "category": "German", "price_cents": 750, "qty": 9},
    {"name": "Area Four",             "address": "500 Technology Sq, Cambridge, MA",    "lat": 42.3626, "lng": -71.0897, "category": "Pizza", "price_cents": 800, "qty": 11},
    {"name": "Harvest",               "address": "44 Brattle St, Cambridge, MA",        "lat": 42.3737, "lng": -71.1212, "category": "American", "price_cents": 1300, "qty": 5},
    {"name": "Alden & Harlow",        "address": "40 Brattle St, Cambridge, MA",        "lat": 42.3737, "lng": -71.1213, "category": "American", "price_cents": 1200, "qty": 6},
    {"name": "Oleana",                "address": "134 Hampshire St, Cambridge, MA",     "lat": 42.3700, "lng": -71.1012, "category": "Mediterranean", "price_cents": 1100, "qty": 7},
    {"name": "Trina's Starlite Lounge","address": "3 Beacon St, Somerville, MA",        "lat": 42.3828, "lng": -71.1000, "category": "American", "price_cents": 850, "qty": 8},
    {"name": "Saloon",                "address": "255 Elm St, Somerville, MA",          "lat": 42.3951, "lng": -71.1218, "category": "American", "price_cents": 900, "qty": 7},
    {"name": "Highland Kitchen",      "address": "150 Highland Ave, Somerville, MA",    "lat": 42.3893, "lng": -71.1063, "category": "American", "price_cents": 800, "qty": 9},
    {"name": "Sichuan Garden",        "address": "295 Washington St, Brookline, MA",    "lat": 42.3321, "lng": -71.1215, "category": "Chinese", "price_cents": 700, "qty": 10},
    {"name": "Lineage",               "address": "242 Harvard St, Brookline, MA",       "lat": 42.3384, "lng": -71.1215, "category": "American", "price_cents": 1200, "qty": 5},
    {"name": "Cafe Belo",             "address": "181 Brighton Ave, Allston, MA",       "lat": 42.3531, "lng": -71.1318, "category": "Brazilian", "price_cents": 650, "qty": 11},
    {"name": "La Mamma",              "address": "369 Cambridge St, Allston, MA",       "lat": 42.3524, "lng": -71.1412, "category": "Italian", "price_cents": 750, "qty": 8},
    {"name": "Pho Viet",              "address": "1095 Commonwealth Ave, Boston, MA",   "lat": 42.3521, "lng": -71.1259, "category": "Vietnamese", "price_cents": 600, "qty": 12},
    {"name": "O Ya",                  "address": "9 East St, Boston, MA",               "lat": 42.3527, "lng": -71.0601, "category": "Japanese", "price_cents": 2000, "qty": 3},
    {"name": "Menton",                "address": "354 Congress St, Boston, MA",         "lat": 42.3510, "lng": -71.0488, "category": "French", "price_cents": 2200, "qty": 3},
    {"name": "Row 34",                "address": "383 Congress St, Boston, MA",         "lat": 42.3511, "lng": -71.0483, "category": "Seafood", "price_cents": 1400, "qty": 5},
    {"name": "Drink",                 "address": "348 Congress St, Boston, MA",         "lat": 42.3510, "lng": -71.0488, "category": "Bar", "price_cents": 600, "qty": 8},
    {"name": "Sportello",             "address": "348 Congress St, Boston, MA",         "lat": 42.3510, "lng": -71.0489, "category": "Italian", "price_cents": 950, "qty": 7},
]


async def get_business_id(client: httpx.AsyncClient) -> str:
    r = await client.get(f"{BASE_URL}/api/business/lookup", params={"business_code": BUSINESS_CODE})
    r.raise_for_status()
    return r.json()["business_id"]


def pickup_window() -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    start = now.isoformat()
    end = (now + timedelta(hours=2)).isoformat()
    return start, end


async def seed():
    pickup_start, pickup_end = pickup_window()
    created_ids: list[str] = []
    failed_plans: list[str] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        business_id = await get_business_id(client)
        print(f"Business ID: {business_id}")
        print(f"Creating {len(RESTAURANTS)} restaurant listings...")

        for i, r in enumerate(RESTAURANTS, 1):
            body = {
                "business_name": r["name"],
                "title": f"{r['name']} Surplus Bag",
                "price_cents": r["price_cents"],
                "qty_available": r["qty"],
                "address": r["address"],
                "category": r["category"],
                "pickup_start": pickup_start,
                "pickup_end": pickup_end,
                # Pass location directly — no geocoding needed
                "location": {
                    "type": "Point",
                    "coordinates": [r["lng"], r["lat"]],
                },
            }
            resp = await client.post(
                f"{BASE_URL}/api/business/listings",
                json=body,
                headers={"X-Business-Id": business_id},
            )
            if resp.status_code not in (200, 201):
                print(f"  [{i}/{len(RESTAURANTS)}] SKIP {r['name']}: {resp.status_code} {resp.text[:80]}")
                continue

            listing_id = resp.json()["id"]
            created_ids.append(listing_id)
            print(f"  [{i}/{len(RESTAURANTS)}] Created {r['name']} → {listing_id}")

        print(f"\nRunning donation plans on {len(created_ids)} listings...")

        for i, listing_id in enumerate(created_ids, 1):
            plan_resp = await client.post(
                f"{BASE_URL}/api/listings/{listing_id}/donation/plan",
                json={"donate_percent": DONATE_PERCENT},
            )
            if plan_resp.status_code == 200:
                data = plan_resp.json()
                allocs = data.get("allocations", [])
                names = ", ".join(a["name"] for a in allocs)
                print(f"  [{i}/{len(created_ids)}] Plan OK → {names or 'no allocs'}")
            else:
                failed_plans.append(listing_id)
                print(f"  [{i}/{len(created_ids)}] Plan FAILED {listing_id}: {plan_resp.status_code} {plan_resp.text[:80]}")

    IDS_FILE.write_text(json.dumps(created_ids, indent=2))
    print(f"\nDone. {len(created_ids)} listings created, {len(failed_plans)} plans failed.")
    print(f"IDs saved to {IDS_FILE.name}")
    print(f"Open http://localhost:3000/demo to see the simulation.")
    if failed_plans:
        print(f"No-plan listings (food banks not ingested yet?): {failed_plans}")


async def clean():
    if not IDS_FILE.exists():
        print("No demo_sim_ids.json found — nothing to clean.")
        return

    ids = json.loads(IDS_FILE.read_text())
    print(f"Cleaning {len(ids)} listings...")

    async with httpx.AsyncClient(timeout=15.0) as client:
        business_id = await get_business_id(client)

        for listing_id in ids:
            resp = await client.delete(
                f"{BASE_URL}/api/business/listings/{listing_id}",
                headers={"X-Business-Id": business_id},
            )
            status = "OK" if resp.status_code in (200, 204) else f"FAIL ({resp.status_code})"
            print(f"  DELETE {listing_id} → {status}")

    IDS_FILE.unlink()
    print("Cleaned. demo_sim_ids.json removed.")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("seed", "clean"):
        print("Usage: python scripts/seed_demo_simulation.py [seed|clean]")
        sys.exit(1)
    if sys.argv[1] == "seed":
        asyncio.run(seed())
    else:
        asyncio.run(clean())


if __name__ == "__main__":
    main()
