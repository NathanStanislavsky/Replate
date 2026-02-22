"""
Seed and clean test listings for the Boston map.

Usage (from apps/api, with .venv active and uvicorn running on 8000):
  python seed_test_listings.py seed    # create test listings, save IDs to seed_ids.json
  python seed_test_listings.py clean   # delete all listings saved in seed_ids.json
"""
import asyncio
import json
import sys
from pathlib import Path

import httpx

BASE_URL = "http://127.0.0.1:8000"
BUSINESS_CODE = "DEMO"
IDS_FILE = Path(__file__).parent / "seed_ids.json"

TEST_LISTINGS = [
    {
        "business_name": "Flour Bakery",
        "title": "Surprise Bag – Flour Bakery",
        "price_cents": 299,
        "qty_available": 65,
        "address": "1595 Washington St, Boston, MA 02118",
        "category": "bakery",
    },
    {
        "business_name": "Pavement Coffeehouse",
        "title": "Surprise Bag – Pavement Coffeehouse",
        "price_cents": 249,
        "qty_available": 55,
        "address": "44 Gainsborough St, Boston, MA 02115",
        "category": "cafe",
    },
    {
        "business_name": "Tatte Bakery",
        "title": "Surprise Bag – Tatte Bakery",
        "price_cents": 349,
        "qty_available": 70,
        "address": "1003 Beacon St, Brookline, MA 02446",
        "category": "bakery",
    },
    {
        "business_name": "Mei Mei Restaurant",
        "title": "Surprise Bag – Mei Mei",
        "price_cents": 399,
        "qty_available": 50,
        "address": "506 Park Dr, Boston, MA 02215",
        "category": "restaurant",
    },
    {
        "business_name": "Veggie Galaxy",
        "title": "Surprise Bag – Veggie Galaxy",
        "price_cents": 329,
        "qty_available": 60,
        "address": "450 Massachusetts Ave, Cambridge, MA 02139",
        "category": "restaurant",
    },
    {
        "business_name": "Clear Flour Bread",
        "title": "Surprise Bag – Clear Flour",
        "price_cents": 269,
        "qty_available": 58,
        "address": "178 Thorndike St, Brookline, MA 02446",
        "category": "bakery",
    },
    {
        "business_name": "Mike's Pastry",
        "title": "Surprise Bag – Mike's Pastry",
        "price_cents": 499,
        "qty_available": 80,
        "address": "300 Hanover St, Boston, MA 02113",
        "category": "bakery",
    },
    {
        "business_name": "Harvest Co-op",
        "title": "Surprise Bag – Harvest Co-op",
        "price_cents": 349,
        "qty_available": 75,
        "address": "57 South Ave, Jamaica Plain, MA 02130",
        "category": "grocery",
    },
    {
        "business_name": "Clover Food Lab",
        "title": "Surprise Bag – Clover Food Lab",
        "price_cents": 299,
        "qty_available": 52,
        "address": "1073 Massachusetts Ave, Cambridge, MA 02138",
        "category": "restaurant",
    },
    {
        "business_name": "Bon Me",
        "title": "Surprise Bag – Bon Me",
        "price_cents": 349,
        "qty_available": 60,
        "address": "100 Cambridgeside Pl, Cambridge, MA 02141",
        "category": "Asian",
    },
    {
        "business_name": "Life Alive",
        "title": "Surprise Bag – Life Alive",
        "price_cents": 379,
        "qty_available": 55,
        "address": "765 Massachusetts Ave, Cambridge, MA 02139",
        "category": "restaurant",
    },
    {
        "business_name": "Blackbird Donuts",
        "title": "Surprise Bag – Blackbird Donuts",
        "price_cents": 329,
        "qty_available": 65,
        "address": "492 Tremont St, Boston, MA 02116",
        "category": "bakery",
    },
    {
        "business_name": "Thinking Cup",
        "title": "Surprise Bag – Thinking Cup",
        "price_cents": 279,
        "qty_available": 50,
        "address": "165 Tremont St, Boston, MA 02111",
        "category": "cafe",
    },
    {
        "business_name": "Parish Cafe",
        "title": "Surprise Bag – Parish Cafe",
        "price_cents": 449,
        "qty_available": 58,
        "address": "361 Boylston St, Boston, MA 02116",
        "category": "American",
    },
    {
        "business_name": "Giacomo's Ristorante",
        "title": "Surprise Bag – Giacomo's",
        "price_cents": 549,
        "qty_available": 50,
        "address": "355 Hanover St, Boston, MA 02113",
        "category": "restaurant",
    },
]


async def get_business_id(client: httpx.AsyncClient) -> str:
    r = await client.get(f"{BASE_URL}/api/business/lookup", params={"business_code": BUSINESS_CODE})
    if r.status_code != 200:
        print(f"  ERROR: could not look up business code '{BUSINESS_CODE}': {r.text}")
        sys.exit(1)
    return r.json()["business_id"]


async def seed():
    async with httpx.AsyncClient(timeout=15.0) as client:
        print(f"Looking up business code '{BUSINESS_CODE}'...")
        business_id = await get_business_id(client)
        print(f"  business_id = {business_id}")

        created_ids = []
        for listing in TEST_LISTINGS:
            print(f"  Creating: {listing['title']} @ {listing['address']}")
            r = await client.post(
                f"{BASE_URL}/api/business/listings",
                json=listing,
                headers={"X-Business-Id": business_id},
            )
            if r.status_code in (200, 201):
                data = r.json()
                created_ids.append(data["id"])
                geocoded = data.get("location") is not None
                print(f"    -> id={data['id']}  geocoded={geocoded}")
            else:
                print(f"    -> FAILED ({r.status_code}): {r.text}")

        IDS_FILE.write_text(json.dumps({"business_id": business_id, "ids": created_ids}, indent=2))
        print(f"\nCreated {len(created_ids)} listings. IDs saved to {IDS_FILE.name}")
        print("Run 'python seed_test_listings.py clean' to delete them.")


async def clean():
    if not IDS_FILE.exists():
        print(f"No {IDS_FILE.name} found. Run 'seed' first.")
        sys.exit(1)

    data = json.loads(IDS_FILE.read_text())
    business_id = data["business_id"]
    ids = data["ids"]

    if not ids:
        print("No IDs to delete.")
        IDS_FILE.unlink()
        return

    print(f"Deleting {len(ids)} test listings (business_id={business_id})...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        for listing_id in ids:
            r = await client.delete(
                f"{BASE_URL}/api/business/listings/{listing_id}",
                headers={"X-Business-Id": business_id},
            )
            if r.status_code == 204:
                print(f"  Deleted {listing_id}")
            elif r.status_code == 404:
                print(f"  Already gone: {listing_id}")
            else:
                print(f"  FAILED ({r.status_code}) {listing_id}: {r.text}")

    IDS_FILE.unlink()
    print(f"\nDone. {IDS_FILE.name} removed.")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("seed", "clean"):
        print("Usage: python seed_test_listings.py [seed|clean]")
        sys.exit(1)
    if sys.argv[1] == "seed":
        asyncio.run(seed())
    else:
        asyncio.run(clean())


if __name__ == "__main__":
    main()
