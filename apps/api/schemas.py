"""
Pydantic schemas for API. GeoJSON Point: { type: "Point", coordinates: [lng, lat] }.
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal

# --- GeoJSON ---
class GeoPoint(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: list[float]  # [lng, lat]

# --- Listings ---
class ListingCreate(BaseModel):
    business_id: str
    business_name: str
    title: str
    price_cents: int
    qty_available: int
    pickup_start: Optional[str] = None
    pickup_end: Optional[str] = None
    address: Optional[str] = None
    location: Optional[GeoPoint] = None
    category: Optional[str] = None


class ListingResponse(BaseModel):
    id: str
    business_id: str
    business_name: str
    title: str
    price_cents: int
    qty_available: int
    pickup_start: Optional[str] = None
    pickup_end: Optional[str] = None
    status: str
    address: Optional[str] = None
    location: Optional[GeoPoint] = None
    category: Optional[str] = None
    created_at: Optional[str] = None

# --- Orders ---
class ReserveBody(BaseModel):
    user_name: str


class PickupScanBody(BaseModel):
    qr_token: str


class OrderResponse(BaseModel):
    id: str
    listing_id: str
    business_id: Optional[str] = None
    user_name: str
    status: str
    qr_token: str
    created_at: Optional[str] = None
    picked_up_at: Optional[str] = None
    canceled_at: Optional[str] = None
    no_show_at: Optional[str] = None
    cancel_reason: Optional[str] = None


class PickupScanResponse(BaseModel):
    ok: bool = True
    already_picked_up: bool = False
    order: Optional[OrderResponse] = None
