"""
Donation routing logic: candidate selection, scoring, and unit allocation.
"""
import math
import os
import logging
from typing import Optional

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
    Allocate donation_qty units across scored candidates in proportion to score.

    Higher-need (and/or closer) banks get a larger share instead of winner-take-all.
    Uses largest-remainder for integer rounding so sum(allocations) == donation_qty.
    Respects capacity_daily / capacities when set (caps allocation, spill goes to others).

    Args:
        donation_qty: total units to allocate
        scored_candidates: sorted list from score_candidates()
        capacities: optional {food_bank_id: remaining_capacity} override

    Returns:
        List of allocation dicts: {food_bank_id, name, qty, duration_minutes, score}
    """
    if not scored_candidates or donation_qty <= 0:
        return []

    total_score = sum(b.get("score") or 0 for b in scored_candidates)
    if total_score <= 0:
        total_score = len(scored_candidates)
        score_per_bank = [1.0] * len(scored_candidates)
    else:
        score_per_bank = [b.get("score") or 0 for b in scored_candidates]

    # Proportional shares (floats)
    raw_shares = [(s / total_score) * donation_qty for s in score_per_bank]
    floors = [int(math.floor(s)) for s in raw_shares]
    remainder_units = donation_qty - sum(floors)

    # Largest-remainder: give one extra unit to banks with largest fractional part
    fractional_parts = [(i, raw_shares[i] - floors[i]) for i in range(len(floors))]
    fractional_parts.sort(key=lambda x: -x[1])
    for i in range(remainder_units):
        idx = fractional_parts[i][0]
        floors[idx] += 1

    # Apply capacity caps and build (index -> alloc) then redistribute spill
    allocs = list(floors)
    spill = 0
    for i, bank in enumerate(scored_candidates):
        fid = bank["_id"]
        cap = None
        if capacities and fid in capacities:
            cap = capacities[fid]
        elif bank.get("capacity_daily") is not None:
            cap = bank["capacity_daily"]
        if cap is not None and allocs[i] > cap:
            spill += allocs[i] - cap
            allocs[i] = cap

    # Redistribute spill by score to banks that haven't hit cap
    while spill > 0:
        gave = 0
        for i in sorted(range(len(scored_candidates)), key=lambda j: -(score_per_bank[j] or 0)):
            if spill <= 0:
                break
            fid = scored_candidates[i]["_id"]
            cap = None
            if capacities and fid in capacities:
                cap = capacities[fid]
            elif scored_candidates[i].get("capacity_daily") is not None:
                cap = scored_candidates[i]["capacity_daily"]
            if cap is None or allocs[i] < cap:
                allocs[i] += 1
                spill -= 1
                gave += 1
        if gave == 0:
            break

    allocations = []
    for i, bank in enumerate(scored_candidates):
        if allocs[i] <= 0:
            continue
        allocations.append({
            "food_bank_id": bank["_id"],
            "name": bank.get("name", "Unknown"),
            "address": bank.get("address", ""),
            "phone": bank.get("phone", ""),
            "qty": allocs[i],
            "duration_minutes": bank.get("duration_minutes"),
            "score": bank.get("score"),
        })
    return allocations
