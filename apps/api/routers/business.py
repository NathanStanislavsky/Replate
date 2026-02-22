"""
Business side: listings CRUD and orders view. Require X-Business-Id header.
Lookup business_id from business_code via GET /business/lookup?business_code=.
"""
import math
import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from bson import ObjectId
from typing import Optional
from pydantic import BaseModel

from database import get_db
from schemas import (
    ListingCreate,
    ListingResponse,
    OrderResponse,
    BusinessCreateListingResponse,
    AllocationItem,
)
from routers.listings import _listing_to_response
from routers.orders import _order_to_response
from services.geocode import geocode_address
from services.donation_routing_service import (
    pick_candidates,
    score_candidates,
    allocate_units,
)

OSRM_MAX_MINUTES = float(os.environ.get("OSRM_MAX_MINUTES", 20))
OSRM_TOP_K = int(os.environ.get("OSRM_TOP_K", 5))

router = APIRouter(prefix="/api/business", tags=["business"])


class BusinessLookupResponse(BaseModel):
    business_id: str
    name: str


@router.get("/lookup", response_model=BusinessLookupResponse)
async def business_lookup(
    business_code: str = Query(..., alias="business_code"),
    db=Depends(get_db),
):
    """Get business_id and name from business_code (mock login)."""
    biz = await db.businesses.find_one({"business_code": business_code.strip()})
    if not biz:
        raise HTTPException(status_code=404, detail="Unknown business code")
    return BusinessLookupResponse(business_id=str(biz["_id"]), name=biz.get("name", ""))


async def get_business_id(
    x_business_id: Optional[str] = Header(None, alias="X-Business-Id"),
) -> str:
    if not x_business_id or not x_business_id.strip():
        raise HTTPException(status_code=401, detail="X-Business-Id required")
    return x_business_id.strip()


@router.get("/listings", response_model=list[ListingResponse])
async def business_list_listings(
    business_id: str = Depends(get_business_id),
    db=Depends(get_db),
):
    """List listings for this business."""
    cursor = db.listings.find({"business_id": business_id})
    out = []
    async for doc in cursor:
        out.append(_listing_to_response(doc))
    return out


@router.post("/listings", response_model=BusinessCreateListingResponse)
async def business_create_listing(
    body: ListingCreate,
    business_id: str = Depends(get_business_id),
    db=Depends(get_db),
):
    """Create listing; if donate_percent set, run allocation and set qty_available to remainder. Returns listing + allocations."""
    doc = {
        "business_id": business_id,
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

    if body.donate_percent is not None and body.donate_percent > 0:
        if not doc.get("location") or doc["location"].get("type") != "Point":
            raise HTTPException(
                status_code=422,
                detail="Address (or location) is required when donate_percent > 0 so we can find nearby food banks",
            )

    result = await db.listings.insert_one(doc)
    doc["_id"] = result.inserted_id
    listing_id_str = str(doc["_id"])
    allocations: list[dict] = []

    if body.donate_percent is not None and body.donate_percent > 0 and doc.get("location"):
        total_qty = doc["qty_available"]
        donation_qty = math.floor(total_qty * body.donate_percent)
        if donation_qty >= 1:
            candidates, routing_used = await pick_candidates(
                doc["location"], db, top_k=OSRM_TOP_K, max_minutes=OSRM_MAX_MINUTES
            )
            if not candidates and routing_used:
                await db.listings.delete_one({"_id": doc["_id"]})
                raise HTTPException(
                    status_code=503,
                    detail="No reachable food banks found within the time constraint. Try again or create without donation %.",
                )
            if not candidates:
                await db.listings.delete_one({"_id": doc["_id"]})
                raise HTTPException(
                    status_code=404,
                    detail="No active food banks found near this address",
                )
            scored = score_candidates(candidates)
            allocations = allocate_units(donation_qty, scored)
            if not allocations:
                await db.listings.delete_one({"_id": doc["_id"]})
                raise HTTPException(status_code=422, detail="Could not allocate units to any food bank")

            now = datetime.utcnow().isoformat() + "Z"
            donation_docs = [
                {
                    "listing_id": listing_id_str,
                    "food_bank_id": a["food_bank_id"],
                    "qty": a["qty"],
                    "status": "planned",
                    "created_at": now,
                }
                for a in allocations
            ]
            await db.donations.insert_many(donation_docs)
            remaining = total_qty - donation_qty
            update_payload = {
                "donation_mode": "planned",
                "donation_plan": allocations,
                "donate_percent": body.donate_percent,
                "qty_available": remaining,
            }
            if remaining <= 0:
                update_payload["status"] = "sold_out"
            await db.listings.update_one({"_id": doc["_id"]}, {"$set": update_payload})
            doc.update(update_payload)

    allocation_items = [
        AllocationItem(
            food_bank_id=str(a["food_bank_id"]),
            name=a["name"],
            address=a.get("address"),
            phone=a.get("phone"),
            qty=a["qty"],
            duration_minutes=a.get("duration_minutes"),
            score=a.get("score"),
        )
        for a in allocations
    ]
    return BusinessCreateListingResponse(
        listing=_listing_to_response(doc),
        allocations=allocation_items,
    )


@router.patch("/listings/{listing_id}", response_model=ListingResponse)
async def business_update_listing(
    listing_id: str,
    body: dict,
    business_id: str = Depends(get_business_id),
    db=Depends(get_db),
):
    """Update listing only if it belongs to this business."""
    try:
        oid = ObjectId(listing_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid listing id")
    listing = await db.listings.find_one({"_id": oid, "business_id": business_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    allowed = {"title", "price_cents", "qty_available", "pickup_start", "pickup_end", "address", "category"}
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        return _listing_to_response(listing)
    await db.listings.update_one({"_id": oid}, {"$set": update})
    listing.update(update)
    return _listing_to_response(listing)


@router.delete("/listings/{listing_id}", status_code=204)
async def business_delete_listing(
    listing_id: str,
    business_id: str = Depends(get_business_id),
    db=Depends(get_db),
):
    """Delete listing only if it belongs to this business."""
    try:
        oid = ObjectId(listing_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid listing id")
    result = await db.listings.delete_one({"_id": oid, "business_id": business_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")


@router.get("/listings/{listing_id}/orders", response_model=list[OrderResponse])
async def business_listing_orders(
    listing_id: str,
    business_id: str = Depends(get_business_id),
    db=Depends(get_db),
):
    """Orders for this listing (only if listing belongs to business)."""
    try:
        oid = ObjectId(listing_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid listing id")
    listing = await db.listings.find_one({"_id": oid, "business_id": business_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    cursor = db.orders.find({"listing_id": listing_id})
    out = []
    async for doc in cursor:
        out.append(_order_to_response(doc))
    return out


@router.get("/orders", response_model=list[OrderResponse])
async def business_orders(
    business_id: str = Depends(get_business_id),
    status: Optional[str] = Query(None),
    db=Depends(get_db),
):
    """All orders for this business's listings. Optional ?status=reserved|picked_up|canceled."""
    filter: dict = {"business_id": business_id}
    if status:
        filter["status"] = status
    cursor = db.orders.find(filter).sort("created_at", -1)
    out = []
    async for doc in cursor:
        out.append(_order_to_response(doc))
    return out
