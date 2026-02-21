"""
Orders: atomic reserve, idempotent pickup scan, cancel + restock.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from datetime import datetime
from pymongo import ReturnDocument
import secrets
from typing import Optional

from database import get_db
from schemas import ReserveBody, PickupScanBody, OrderResponse, PickupScanResponse

router = APIRouter(prefix="/api", tags=["orders"])


def _order_to_response(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    for k in ("listing_id", "business_id"):
        if k in doc and isinstance(doc[k], ObjectId):
            doc[k] = str(doc[k])
    return doc


@router.get("/orders", response_model=list[OrderResponse])
async def buyer_orders(
    user_name: str = Query(..., min_length=1),
    status: Optional[str] = Query(None),
    db=Depends(get_db),
):
    """Buyer order history by user_name. Optional ?status=reserved|picked_up|canceled."""
    user = user_name.strip()
    if not user:
        raise HTTPException(status_code=400, detail="user_name is required")
    filter: dict = {"user_name": user}
    if status:
        filter["status"] = status
    cursor = db.orders.find(filter).sort("created_at", -1)
    out = []
    async for doc in cursor:
        out.append(_order_to_response(doc))
    return out


@router.post("/listings/{listing_id}/reserve", response_model=OrderResponse)
async def reserve(listing_id: str, body: ReserveBody, db=Depends(get_db)):
    """Reserve one unit; atomic findOneAndUpdate to prevent oversell."""
    try:
        oid = ObjectId(listing_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid listing id")
    listing = await db.listings.find_one_and_update(
        {"_id": oid, "status": "open", "qty_available": {"$gte": 1}},
        {"$inc": {"qty_available": -1}},
        return_document=ReturnDocument.AFTER,
    )
    if not listing:
        raise HTTPException(status_code=409, detail="Sold out / unavailable")
    if listing.get("qty_available", 0) <= 0:
        await db.listings.update_one({"_id": oid}, {"$set": {"status": "sold_out"}})
    business_id = listing.get("business_id")
    order_doc = {
        "listing_id": listing_id,
        "business_id": business_id,
        "user_name": body.user_name,
        "status": "reserved",
        "qr_token": secrets.token_hex(16),
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    r = await db.orders.insert_one(order_doc)
    order_doc["_id"] = r.inserted_id
    return _order_to_response(order_doc)


@router.post("/pickup/scan", response_model=PickupScanResponse)
async def pickup_scan(body: PickupScanBody, db=Depends(get_db)):
    """Idempotent: if already picked_up return 200 with already_picked_up=true."""
    order = await db.orders.find_one({"qr_token": body.qr_token})
    if not order:
        raise HTTPException(status_code=404, detail="Invalid or already used code")
    if order.get("status") == "picked_up":
        return PickupScanResponse(ok=True, already_picked_up=True, order=_order_to_response(order))
    now = datetime.utcnow().isoformat() + "Z"
    await db.orders.update_one(
        {"_id": order["_id"], "status": "reserved"},
        {"$set": {"status": "picked_up", "picked_up_at": now}},
    )
    order["status"] = "picked_up"
    order["picked_up_at"] = now
    return PickupScanResponse(ok=True, already_picked_up=False, order=_order_to_response(order))


@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(order_id: str, db=Depends(get_db)):
    """Cancel reserved order and restock listing. Only if status==reserved."""
    try:
        oid = ObjectId(order_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order id")
    order = await db.orders.find_one({"_id": oid, "status": "reserved"})
    if not order:
        raise HTTPException(status_code=400, detail="Order not found or not reservable")
    now = datetime.utcnow().isoformat() + "Z"
    await db.orders.update_one(
        {"_id": oid, "status": "reserved"},
        {"$set": {"status": "canceled", "canceled_at": now, "cancel_reason": "user_cancel"}},
    )
    lid = order.get("listing_id")
    if lid:
        try:
            lid_oid = ObjectId(lid) if isinstance(lid, str) else lid
            await db.listings.update_one(
                {"_id": lid_oid},
                {"$inc": {"qty_available": 1}, "$set": {"status": "open"}},
            )
        except Exception:
            pass
    order["status"] = "canceled"
    order["canceled_at"] = now
    order["cancel_reason"] = "user_cancel"
    return _order_to_response(order)
