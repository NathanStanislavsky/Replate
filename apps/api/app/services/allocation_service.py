import random
from app.models import Listing, Request, User
from app import db


def weighted_lottery(listing_id: int, slots: int) -> list[int]:
    """
    Select up to `slots` user IDs from pending requests for this listing.
    Weight = 1 / (1 + pickups_last_7_days). Higher weight = more likely to be chosen.
    """
    requests = (
        Request.query.filter_by(listing_id=listing_id, status="pending")
        .join(User)
        .all()
    )
    if not requests:
        return []

    weights = []
    for r in requests:
        u = r.user
        w = 1.0 / (1.0 + (u.pickups_last_7_days or 0))
        weights.append(w)

    total = sum(weights)
    if total <= 0:
        return []

    probs = [w / total for w in weights]
    k = min(slots, len(requests))
    chosen_indices = random.choices(range(len(requests)), weights=probs, k=k)
    chosen_ids = list(dict.fromkeys(requests[i].user_id for i in chosen_indices))
    return chosen_ids[:slots]
