"""
Simulation endpoint: returns all listings with donation plans + their assigned food banks.
Used by the frontend /demo page to visualize donation routing.

GET /api/simulation
"""
from fastapi import APIRouter, Depends
from bson import ObjectId

from database import get_db

router = APIRouter(prefix="/api", tags=["simulation"])


def _serialize(doc: dict) -> dict:
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("/simulation")
async def get_simulation(db=Depends(get_db)):
    """
    Returns listings that have a donation plan, plus details for each assigned food bank.

    Response shape:
    {
      "listings": [{id, title, business_name, location, qty_available, donation_plan, donate_percent}],
      "food_banks": [{id, name, address, location, need_weight, total_incoming}]
    }
    """
    # Fetch listings with a donation plan
    cursor = db.listings.find(
        {"donation_mode": {"$in": ["planned", "pending", "assigned"]}},
        limit=200,
    )
    raw_listings = await cursor.to_list(length=200)

    # Collect unique food_bank_ids referenced across all plans
    fb_id_set: set[str] = set()
    for listing in raw_listings:
        for alloc in listing.get("donation_plan", []):
            fid = alloc.get("food_bank_id")
            if fid:
                fb_id_set.add(fid)

    # Fetch food bank docs
    food_banks_by_id: dict[str, dict] = {}
    if fb_id_set:
        oids = []
        for fid in fb_id_set:
            try:
                oids.append(ObjectId(fid))
            except Exception:
                pass
        fb_cursor = db.food_banks.find({"_id": {"$in": oids}})
        async for fb in fb_cursor:
            fb_doc = _serialize(fb)
            food_banks_by_id[fb_doc["id"]] = fb_doc

    # Accumulate total_incoming units per food bank
    for fb in food_banks_by_id.values():
        fb["total_incoming"] = 0

    # Build response listings
    out_listings = []
    for listing in raw_listings:
        doc = _serialize(listing)
        # Only keep fields the frontend needs
        out_listings.append({
            "id": doc["id"],
            "title": doc.get("title", ""),
            "business_name": doc.get("business_name", ""),
            "location": doc.get("location"),
            "qty_available": doc.get("qty_available", 0),
            "donate_percent": doc.get("donate_percent", 0),
            "donation_plan": doc.get("donation_plan", []),
        })
        # Accumulate incoming units to each food bank
        for alloc in doc.get("donation_plan", []):
            fid = alloc.get("food_bank_id")
            if fid and fid in food_banks_by_id:
                food_banks_by_id[fid]["total_incoming"] += alloc.get("qty", 0)

    out_food_banks = list(food_banks_by_id.values())

    return {
        "listings": out_listings,
        "food_banks": out_food_banks,
    }
