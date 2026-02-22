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
    business_id: Optional[str] = None
    business_name: str
    title: str
    price_cents: int
    qty_available: int
    donate_percent: Optional[float] = Field(None, ge=0.0, le=1.0)  # 0-1; if set, run allocation and set qty_available to remainder
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
    donate_percent: Optional[float] = None
    donation_plan: Optional[list] = None  # list of AllocationItem-like dicts

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


# --- Donations ---
class DonationPlanRequest(BaseModel):
    donate_percent: float = Field(..., gt=0.0, le=1.0)
    max_minutes: Optional[int] = None
    top_k: Optional[int] = None


class AllocationItem(BaseModel):
    food_bank_id: str
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    qty: int
    duration_minutes: Optional[float] = None
    score: Optional[float] = None


class DonationPlanResponse(BaseModel):
    donation_qty: int
    remaining_public_qty: int
    routing_used: bool = True
    allocations: list[AllocationItem]


class BusinessCreateListingResponse(BaseModel):
    """Create listing response: listing plus allocations when donate_percent was used."""
    listing: ListingResponse
    allocations: list[AllocationItem] = []


class TriggerExpiringRequest(BaseModel):
    minutes_before_end: int = 30
    max_minutes: Optional[int] = None
    donate_percent: float = Field(default=1.0, gt=0.0, le=1.0)


class TriggerExpiringResponse(BaseModel):
    processed: int
    plans: list[dict]
