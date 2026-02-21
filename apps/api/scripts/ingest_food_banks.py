"""
Ingest food banks from boston_food_distributors.csv into MongoDB food_banks collection.
Assigns need_weight from the nearest census tract's SNAP rate (greater_boston_snap_food_insecurity.csv).

Run once from apps/api (with .venv active and MongoDB running):
  python scripts/ingest_food_banks.py
"""
import asyncio
import csv
import math
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = (
    os.environ.get("MONGODB_URI")
    or os.environ.get("MONGO_URI")
    or "mongodb://localhost:27017"
)
DB_NAME = os.environ.get("DB_NAME", "replate")

DATA_DIR = Path(__file__).parent.parent / "food_data"
DISTRIBUTORS_CSV = DATA_DIR / "boston_food_distributors.csv"
SNAP_CSV = DATA_DIR / "greater_boston_snap_food_insecurity.csv"


def load_snap_tracts() -> list[dict]:
    tracts = []
    with open(SNAP_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                tracts.append({
                    "lat": float(row["lat"]),
                    "lng": float(row["lng"]),
                    "snap_rate": float(row["snap_rate"]),
                    "geoid": row["geoid"],
                })
            except (ValueError, KeyError):
                continue
    return tracts


def nearest_snap_rate(lat: float, lng: float, tracts: list[dict]) -> float:
    """Return snap_rate of the nearest tract centroid (Euclidean on lat/lng)."""
    best_dist = float("inf")
    best_rate = 1.0
    for t in tracts:
        d = math.hypot(lat - t["lat"], lng - t["lng"])
        if d < best_dist:
            best_dist = d
            best_rate = t["snap_rate"]
    return best_rate


def load_food_banks(tracts: list[dict]) -> list[dict]:
    banks = []
    with open(DISTRIBUTORS_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            lat_str = row.get("latitude", "").strip()
            lng_str = row.get("longitude", "").strip()
            if not lat_str or not lng_str:
                continue
            try:
                lat = float(lat_str)
                lng = float(lng_str)
            except ValueError:
                continue

            need_weight = nearest_snap_rate(lat, lng, tracts)

            banks.append({
                "name": row.get("name", "").strip(),
                "category": row.get("category", "").strip(),
                "address": row.get("full_address", row.get("street_address", "")).strip(),
                "neighborhood": row.get("neighborhood", "").strip(),
                "phone": row.get("phone", "").strip(),
                "hours": row.get("hours", "").strip(),
                "location": {
                    "type": "Point",
                    "coordinates": [lng, lat],
                },
                "need_weight": round(need_weight, 6),
                "active": True,
            })
    return banks


async def ingest():
    print("Loading SNAP tract data...")
    tracts = load_snap_tracts()
    print(f"  {len(tracts)} tracts loaded.")

    print("Loading food banks...")
    banks = load_food_banks(tracts)
    print(f"  {len(banks)} food banks with lat/lng.")

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    # Ensure indexes
    await db.food_banks.create_index([("location", "2dsphere")])
    await db.food_banks.create_index([("active", 1)])
    await db.food_banks.create_index([("name", 1), ("address", 1)], unique=True)

    inserted = 0
    updated = 0
    skipped = 0
    for bank in banks:
        if not bank["name"]:
            skipped += 1
            continue
        key = {"name": bank["name"], "address": bank["address"]}
        result = await db.food_banks.update_one(key, {"$set": bank}, upsert=True)
        if result.upserted_id:
            inserted += 1
        else:
            updated += 1

    client.close()
    print(f"\nDone. Inserted: {inserted}  Updated: {updated}  Skipped: {skipped}")
    print(f"Total food banks in DB: {inserted + updated}")


if __name__ == "__main__":
    asyncio.run(ingest())
