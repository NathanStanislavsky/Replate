"""
MongoDB connection via Motor (async).
Used by FastAPI dependency get_db(). Create 2dsphere index on startup in main.py.
"""
import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env when running locally (uvicorn does not auto-load it)
load_dotenv()

# Support both names while standardizing on MONGODB_URI
MONGODB_URI = (
    os.environ.get("MONGODB_URI")
    or os.environ.get("MONGO_URI")
    or "mongodb://localhost:27017"
)
DB_NAME = os.environ.get("DB_NAME", "replate")

client: Optional[AsyncIOMotorClient] = None


def get_client() -> AsyncIOMotorClient:
    global client
    if client is None:
        client = AsyncIOMotorClient(MONGODB_URI)
    return client


def get_db():
    return get_client()[DB_NAME]


async def ensure_indexes(db):
    """Create indexes for map and filters."""
    await db.listings.create_index([("location", "2dsphere")])
    await db.listings.create_index([("status", 1), ("pickup_start", 1), ("pickup_end", 1)])
    await db.listings.create_index([("status", 1), ("price_cents", 1)])
    await db.listings.create_index([("status", 1), ("category", 1)])
    await db.businesses.create_index([("business_code", 1)], unique=True)
