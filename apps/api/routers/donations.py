"""
Donation routing endpoints.

POST /api/listings/{listing_id}/donation/plan
POST /api/donations/trigger-expiring
"""
import math
import os
import logging
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from schemas import (
    DonationPlanRequest,
    DonationPlanResponse,
    TriggerExpiringRequest,
    TriggerExpiringResponse,
)
from services.donation_routing_service import (
    pick_candidates,
    score_candidates,
    allocate_units,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["donations"])

OSRM_MAX_MINUTES = int(os.environ.get("OSRM_MAX_MINUTES", 20))
OSRM_TOP_K = int(os.environ.get("OSRM_TOP_K", 5))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/listings/{listing_id}/donation/plan", response_model=DonationPlanResponse)
async def create_donation_plan(
    listing_id: str,
    body: DonationPlanRequest,
    db=Depends(get_db),
):
    """
    Compute a donation plan for a listing and persist it.

    - Finds candidate food banks within max_minutes driving time (OSRM).
    - Scores them by need_weight / (duration_minutes + 1).
    - Allocates floor(qty_available * donate_percent) units.
    - Persists donation records with status='planned'.
    - Updates listing with donation_mode='planned' and donation_plan.
    """
    try:
        oid = ObjectId(listing_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid listing id")

    listing = await db.listings.find_one({"_id": oid})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    location = listing.get("location")
    if not location or location.get("type") != "Point":
        raise HTTPException(status_code=422, detail="Listing has no valid location")

    qty_available = listing.get("qty_available", 0)
    donation_qty = math.floor(qty_available * body.donate_percent)
    if donation_qty < 1:
        raise HTTPException(status_code=422, detail="donation_qty rounds to 0; nothing to donate")

    max_minutes = body.max_minutes or OSRM_MAX_MINUTES
    top_k = body.top_k or OSRM_TOP_K

    candidates, routing_used = await pick_candidates(location, db, top_k=top_k, max_minutes=max_minutes)

    if not candidates and routing_used:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "routing_unavailable",
                "message": "No reachable food banks found within the time constraint",
                "fallback": "use /map view",
            },
        )

    if not candidates:
        raise HTTPException(
            status_code=404,
            detail="No active food banks found near this listing",
        )

    scored = score_candidates(candidates)
    allocations = allocate_units(donation_qty, scored)

    if not allocations:
        raise HTTPException(status_code=422, detail="Could not allocate units to any food bank")

    now = _now_iso()

    # Persist donation records
    donation_docs = []
    for alloc in allocations:
        donation_docs.append({
            "listing_id": listing_id,
            "food_bank_id": alloc["food_bank_id"],
            "qty": alloc["qty"],
            "status": "planned",
            "created_at": now,
        })
    if donation_docs:
        await db.donations.insert_many(donation_docs)

    # Update listing
    await db.listings.update_one(
        {"_id": oid},
        {
            "$set": {
                "donation_mode": "planned",
                "donation_plan": allocations,
                "donate_percent": body.donate_percent,
            }
        },
    )

    remaining_public_qty = qty_available - donation_qty

    return DonationPlanResponse(
        donation_qty=donation_qty,
        remaining_public_qty=remaining_public_qty,
        routing_used=routing_used,
        allocations=allocations,
    )


@router.post("/donations/trigger-expiring", response_model=TriggerExpiringResponse)
async def trigger_expiring_donations(
    body: TriggerExpiringRequest,
    db=Depends(get_db),
):
    """
    Find open listings with qty_available > 0 whose pickup_end is within
    `minutes_before_end` minutes. For each, compute and persist a donation plan.
    """
    now = datetime.now(timezone.utc)
    threshold_iso = now.isoformat()

    # Find listings expiring soon (pickup_end stored as ISO string)
    pipeline = [
        {
            "$match": {
                "status": "open",
                "qty_available": {"$gt": 0},
                "pickup_end": {"$gte": threshold_iso},
                "donation_mode": {"$nin": ["planned", "pending", "assigned"]},
            }
        },
        {"$addFields": {"pickup_end_date": {"$dateFromString": {"dateString": "$pickup_end"}}}},
        {
            "$match": {
                "pickup_end_date": {
                    "$lte": {
                        "$dateAdd": {
                            "startDate": "$$NOW",
                            "unit": "minute",
                            "amount": body.minutes_before_end,
                        }
                    }
                }
            }
        },
    ]

    expiring = await db.listings.aggregate(pipeline).to_list(length=100)

    max_minutes = body.max_minutes or OSRM_MAX_MINUTES
    plans = []
    processed = 0

    for listing in expiring:
        location = listing.get("location")
        if not location:
            continue

        qty_available = listing.get("qty_available", 0)
        donation_qty = math.floor(qty_available * body.donate_percent)
        if donation_qty < 1:
            continue

        candidates, routing_used = await pick_candidates(location, db, max_minutes=max_minutes)
        if not candidates:
            continue

        scored = score_candidates(candidates)
        allocations = allocate_units(donation_qty, scored)
        if not allocations:
            continue

        now_iso = _now_iso()
        listing_id_str = str(listing["_id"])

        donation_docs = [
            {
                "listing_id": listing_id_str,
                "food_bank_id": a["food_bank_id"],
                "qty": a["qty"],
                "status": "planned",
                "created_at": now_iso,
            }
            for a in allocations
        ]
        if donation_docs:
            await db.donations.insert_many(donation_docs)

        await db.listings.update_one(
            {"_id": listing["_id"]},
            {
                "$set": {
                    "donation_mode": "pending",
                    "donation_plan": allocations,
                    "donate_percent": body.donate_percent,
                }
            },
        )

        plans.append({
            "listing_id": listing_id_str,
            "title": listing.get("title"),
            "donation_qty": donation_qty,
            "routing_used": routing_used,
            "allocations": allocations,
        })
        processed += 1

    return TriggerExpiringResponse(processed=processed, plans=plans)
