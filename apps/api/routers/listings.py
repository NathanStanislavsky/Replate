"""
Listings: POST (create), GET /market with optional bounds and filters (open_now, price, category).
"""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from database import get_db
from schemas import ListingCreate, ListingResponse, GeoPoint
from services.geocode import geocode_address

router = APIRouter(prefix="/api", tags=["listings"])


def _listing_to_response(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    if "location" in doc and doc["location"]:
        doc["location"] = {"type": "Point", "coordinates": doc["location"]["coordinates"]}
    return doc


@router.get("/market", response_model=list[ListingResponse])
async def get_market(
    sw_lat: Optional[float] = Query(None),
    sw_lng: Optional[float] = Query(None),
    ne_lat: Optional[float] = Query(None),
    ne_lng: Optional[float] = Query(None),
    open_now: Optional[bool] = Query(None),
    min_price_cents: Optional[int] = Query(None),
    max_price_cents: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    db=Depends(get_db),
):
    """Public feed. Optional bounds + filters: open_now, min/max_price_cents, category."""
    filter: dict = {"status": "open"}
    if all(x is not None for x in (sw_lat, sw_lng, ne_lat, ne_lng)):
        filter["location"] = {
            "$geoWithin": {
                "$geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [sw_lng, sw_lat],
                        [ne_lng, sw_lat],
                        [ne_lng, ne_lat],
                        [sw_lng, ne_lat],
                        [sw_lng, sw_lat],
                    ]]
                }
            }
        }
    if open_now:
        now = datetime.utcnow().isoformat() + "Z"
        filter["$and"] = filter.get("$and", [])
        filter["$and"].append({"pickup_start": {"$lte": now}})
        filter["$and"].append({"pickup_end": {"$gte": now}})
    if min_price_cents is not None or max_price_cents is not None:
        p: dict = {}
        if min_price_cents is not None:
            p["$gte"] = min_price_cents
        if max_price_cents is not None:
            p["$lte"] = max_price_cents
        filter["price_cents"] = p
    if category:
        filter["category"] = category
    cursor = db.listings.find(filter)
    out = []
    async for doc in cursor:
        out.append(_listing_to_response(doc))
    return out


@router.post("/listings", response_model=ListingResponse)
async def create_listing(body: ListingCreate, db=Depends(get_db)):
    """Business creates listing. If address given and no location, geocode once and store."""
    doc = {
        "business_id": body.business_id,
        "business_name": body.business_name,
        "title": body.title,
        "price_cents": body.price_cents,
        "qty_available": body.qty_available,
        "pickup_start": body.pickup_start,
        "pickup_end": body.pickup_end,
        "status": "open",
        "address": body.address,
        "category": body.category,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    if body.location:
        doc["location"] = {"type": "Point", "coordinates": body.location.coordinates}
    elif body.address:
        coords = await geocode_address(body.address)
        if coords:
            doc["location"] = {"type": "Point", "coordinates": list(coords)}
    result = await db.listings.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _listing_to_response(doc)


@router.get("/listings/{listing_id}", response_model=ListingResponse)
async def get_listing(listing_id: str, db=Depends(get_db)):
    try:
        oid = ObjectId(listing_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid listing id")
    doc = await db.listings.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Listing not found")
    return _listing_to_response(doc)
