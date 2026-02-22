"""
Listings: POST (create), GET /market with optional bounds and filters (open_now, price, category).
"""
from datetime import datetime
from typing import Optional
import json
import os
import re

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
import httpx

from database import get_db
from schemas import (
    ListingCreate,
    ListingResponse,
    GeoPoint,
    MarketIntentRequest,
    MarketIntentResponse,
    BoundsPayload,
)
from services.geocode import geocode_address

router = APIRouter(prefix="/api", tags=["listings"])

_GEMINI_MODEL = "gemini-1.5-flash"
_GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{_GEMINI_MODEL}:generateContent"


def _listing_to_response(doc: dict) -> dict:
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    if "location" in doc and doc["location"]:
        doc["location"] = {"type": "Point", "coordinates": doc["location"]["coordinates"]}
    return doc


def _extract_json_object(text: str) -> dict:
    """Accept either raw JSON or fenced JSON and return a dict."""
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped)
        stripped = re.sub(r"\s*```$", "", stripped)
    try:
        return json.loads(stripped)
    except Exception:
        pass

    start = stripped.find("{")
    end = stripped.rfind("}")
    if start >= 0 and end > start:
        return json.loads(stripped[start:end + 1])
    raise ValueError("No valid JSON object in model output")


def _normalize_market_intent(payload: dict) -> MarketIntentResponse:
    out = MarketIntentResponse()

    category = payload.get("category")
    if isinstance(category, str) and category.strip():
        out.category = category.strip().lower()

    min_price_cents = payload.get("min_price_cents")
    if isinstance(min_price_cents, (int, float)):
        out.min_price_cents = max(int(min_price_cents), 0)

    max_price_cents = payload.get("max_price_cents")
    if isinstance(max_price_cents, (int, float)):
        out.max_price_cents = max(int(max_price_cents), 0)

    if (
        out.min_price_cents is not None
        and out.max_price_cents is not None
        and out.min_price_cents > out.max_price_cents
    ):
        out.min_price_cents, out.max_price_cents = out.max_price_cents, out.min_price_cents

    if isinstance(payload.get("open_now"), bool):
        out.open_now = payload.get("open_now")

    if isinstance(payload.get("near_me"), bool):
        out.near_me = payload.get("near_me")

    radius_km = payload.get("radius_km")
    if isinstance(radius_km, (int, float)):
        out.radius_km = float(min(max(radius_km, 0.5), 20.0))

    bounds = payload.get("bounds")
    if isinstance(bounds, dict):
        keys = ("sw_lat", "sw_lng", "ne_lat", "ne_lng")
        if all(isinstance(bounds.get(k), (int, float)) for k in keys):
            out.bounds = BoundsPayload(
                sw_lat=float(bounds["sw_lat"]),
                sw_lng=float(bounds["sw_lng"]),
                ne_lat=float(bounds["ne_lat"]),
                ne_lng=float(bounds["ne_lng"]),
            )

    note = payload.get("note")
    if isinstance(note, str) and note.strip():
        out.note = note.strip()[:200]

    return out


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


@router.post("/market/intent", response_model=MarketIntentResponse)
async def parse_market_intent(body: MarketIntentRequest):
    query = body.query.strip()
    if not query:
        return MarketIntentResponse(note="Empty query")

    gemini_key = os.environ.get("GEMENI_KEY") or os.environ.get("GEMINI_KEY")
    if not gemini_key:
        raise HTTPException(status_code=503, detail="Missing GEMENI_KEY")

    prompt = f"""
You convert buyer search text into filters for a food marketplace.
Return ONLY valid JSON with this schema:
{{
  "category": string|null,
  "min_price_cents": number|null,
  "max_price_cents": number|null,
  "open_now": boolean|null,
  "near_me": boolean|null,
  "radius_km": number|null,
  "bounds": {{
    "sw_lat": number,
    "sw_lng": number,
    "ne_lat": number,
    "ne_lng": number
  }} | null,
  "note": string|null
}}

Rules:
- If query says "under $X", set max_price_cents.
- If query says "over $X" or "at least $X", set min_price_cents.
- If query says "cheap" with no explicit max, use max_price_cents=1000.
- If query says "open now", set open_now=true.
- If query says "near me"/"nearby"/"around me", set near_me=true and radius_km if stated.
- If query mentions a Boston area neighborhood (Fenway, Back Bay, Cambridge, Allston, etc),
  return approximate map bounds in "bounds".
- Keep null for fields not specified.

Query: {query}
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                _GEMINI_URL,
                params={"key": gemini_key},
                json=payload,
            )
        resp.raise_for_status()
        data = resp.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        parsed = _extract_json_object(text)
        return _normalize_market_intent(parsed)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Intent parse failed: {str(exc)}")


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
