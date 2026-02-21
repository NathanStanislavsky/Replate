from flask import Blueprint, request, jsonify
from app import db
from app.models import Allocation, Request, Listing
from app.services.allocation_service import weighted_lottery

allocations_bp = Blueprint("allocations", __name__)


@allocations_bp.route("/listings/<int:listing_id>/allocate", methods=["POST"])
def allocate(listing_id):
    """Business: run weighted lottery and create allocations for this listing."""
    listing = Listing.query.get_or_404(listing_id)
    slots = listing.available_qty
    if slots <= 0:
        return jsonify({"error": "No slots available"}), 400

    selected_ids = weighted_lottery(listing_id, slots)
    created = []
    for user_id in selected_ids:
        req = Request.query.filter_by(listing_id=listing_id, user_id=user_id, status="pending").first()
        if not req:
            continue
        allocation = Allocation(
            listing_id=listing_id,
            user_id=user_id,
            request_id=req.id,
            status="allocated",
        )
        db.session.add(allocation)
        req.status = "allocated"
        created.append(allocation)
    db.session.commit()
    return jsonify({"allocated": len(created), "allocations": [a.to_dict() for a in created]})


@allocations_bp.route("/allocations", methods=["GET"])
def list_allocations():
    """Business: allocations for my listings. ?business_id= required."""
    business_id = request.args.get("business_id", type=int)
    if not business_id:
        return jsonify({"error": "business_id required"}), 400
    allocations = Allocation.query.join(Listing).filter(Listing.business_id == business_id).all()
    return jsonify([a.to_dict() for a in allocations])
