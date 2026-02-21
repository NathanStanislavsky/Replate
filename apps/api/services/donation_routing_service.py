"""
Donation routing logic: candidate selection, scoring, and unit allocation.
"""
import math
import os
import logging
from typing import Optional

from bson import ObjectId

from services.osrm_service import table_durations

logger = logging.getLogger(__name__)

OSRM_MAX_MINUTES = float(os.environ.get("OSRM_MAX_MINUTES", 20))
OSRM_TOP_K = int(os.environ.get("OSRM_TOP_K", 5))

# Rough fallback: max_minutes at 30 mph ≈ 0.8 km/min → prefilter radius in meters
_KM_PER_MINUTE_ESTIMATE = 0.8


def _euclidean_dist(lat1, lng1, lat2, lng2) -> float:
    return math.hypot(lat1 - lat2, lng1 - lng2)


async def pick_candidates(
    listing_location: dict,
    db,
    top_k: int = OSRM_TOP_K,
    max_minutes: float = OSRM_MAX_MINUTES,
) -> tuple[list[dict], bool]:
    """
    Find reachable food banks within max_minutes driving time.

    Returns:
        (candidates, routing_used)
        candidates: list of food bank dicts with 'duration_seconds' and 'duration_minutes' added
        routing_used: True if OSRM returned results, False if fallback was used
    """
    lng, lat = listing_location["coordinates"]

    # Prefilter: $near with rough max distance to reduce OSRM calls
    max_distance_m = int(max_minutes * _KM_PER_MINUTE_ESTIMATE * 1000 * 2)  # generous 2x

    cursor = db.food_banks.find(
        {
            "active": True,
            "location": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                    "$maxDistance": max_distance_m,
                }
            },
        },
        limit=top_k * 4,  # fetch extra; OSRM will thin down
    )
    nearby = await cursor.to_list(length=top_k * 4)

    if not nearby:
        logger.info("No food banks found within prefilter radius of %dm", max_distance_m)
        return [], True

    dest_coords = [
        (bank["location"]["coordinates"][0], bank["location"]["coordinates"][1])
        for bank in nearby
    ]

    durations = await table_durations((lng, lat), dest_coords)

    routing_used = any(d is not None for d in durations)

    candidates = []
    if routing_used:
        for bank, dur_secs in zip(nearby, durations):
            if dur_secs is None:
                continue
            dur_min = dur_secs / 60.0
            if dur_min <= max_minutes:
                candidates.append({
                    **bank,
                    "_id": str(bank["_id"]),
                    "duration_seconds": dur_secs,
                    "duration_minutes": round(dur_min, 1),
                })
    else:
        # OSRM down — fall back to Euclidean distance, mark duration_minutes=None
        logger.warning("OSRM unavailable; falling back to Euclidean distance prefilter")
        for bank in nearby[:top_k]:
            b_lng, b_lat = bank["location"]["coordinates"]
            candidates.append({
                **bank,
                "_id": str(bank["_id"]),
                "duration_seconds": None,
                "duration_minutes": None,
            })

    # Trim to top_k
    return candidates[:top_k], routing_used


def score_candidates(candidates: list[dict]) -> list[dict]:
    """
    Score each candidate: score = need_weight / (duration_minutes + 1).
    Returns list sorted descending by score.
    """
    scored = []
    for bank in candidates:
        dur = bank.get("duration_minutes")
        need = bank.get("need_weight", 1.0)
        if dur is None:
            # Fallback: score on need only
            score = need
        else:
            score = need / (dur + 1)
        scored.append({**bank, "score": round(score, 6)})
    return sorted(scored, key=lambda b: b["score"], reverse=True)


def allocate_units(
    donation_qty: int,
    scored_candidates: list[dict],
    capacities: Optional[dict] = None,
) -> list[dict]:
    """
    Allocate donation_qty units across scored candidates.

    MVP: all units go to the top candidate; if capacity_daily is set and fills,
    spill remainder to next best.

    Args:
        donation_qty: total units to allocate
        scored_candidates: sorted list from score_candidates()
        capacities: optional {food_bank_id: remaining_capacity} override

    Returns:
        List of allocation dicts: {food_bank_id, name, qty, duration_minutes, score}
    """
    allocations = []
    remaining = donation_qty

    for bank in scored_candidates:
        if remaining <= 0:
            break

        fid = bank["_id"]
        capacity = None
        if capacities and fid in capacities:
            capacity = capacities[fid]
        elif bank.get("capacity_daily") is not None:
            capacity = bank["capacity_daily"]

        if capacity is not None:
            alloc = min(remaining, capacity)
        else:
            alloc = remaining

        if alloc <= 0:
            continue

        allocations.append({
            "food_bank_id": fid,
            "name": bank.get("name", "Unknown"),
            "address": bank.get("address", ""),
            "qty": alloc,
            "duration_minutes": bank.get("duration_minutes"),
            "score": bank.get("score"),
        })
        remaining -= alloc

    return allocations
