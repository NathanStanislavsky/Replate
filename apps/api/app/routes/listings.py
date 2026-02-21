from flask import Blueprint, request, jsonify
from app import db
from app.models import Listing, User

listings_bp = Blueprint("listings", __name__)


@listings_bp.route("/market", methods=["GET"])
def get_market():
    """Listings available for buyers (public, with availability)."""
    listings = Listing.query.all()
    return jsonify([l.to_dict() for l in listings if l.available_qty > 0])


@listings_bp.route("/listings", methods=["GET"])
def list_listings():
    """Business: list my listings. Optional ?business_id= for dev."""
    business_id = request.args.get("business_id", type=int)
    if not business_id:
        return jsonify({"error": "business_id required"}), 400
    listings = Listing.query.filter_by(business_id=business_id).all()
    return jsonify([l.to_dict() for l in listings])


@listings_bp.route("/listings", methods=["POST"])
def create_listing():
    """Business: create a listing."""
    data = request.get_json() or {}
    business_id = data.get("business_id")
    if not business_id:
        return jsonify({"error": "business_id required"}), 400
    user = User.query.get(business_id)
    if not user or user.role != "business":
        return jsonify({"error": "business user not found"}), 400

    listing = Listing(
        business_id=business_id,
        item_name=data.get("item_name", ""),
        total_qty=data.get("total_qty", 0),
        partner_qty=data.get("partner_qty", 0),
        public_qty=data.get("public_qty", 0),
        standard_price=data.get("standard_price", 0),
        ebt_price=data.get("ebt_price"),
        retail_value=data.get("retail_value"),
        snap_eligible=data.get("snap_eligible", False),
        address=data.get("address"),
    )
    db.session.add(listing)
    db.session.commit()
    return jsonify(listing.to_dict()), 201


@listings_bp.route("/listings/<int:listing_id>", methods=["GET"])
def get_listing(listing_id):
    """Get one listing by id."""
    listing = Listing.query.get_or_404(listing_id)
    return jsonify(listing.to_dict())


@listings_bp.route("/listings/<int:listing_id>", methods=["PATCH"])
def update_listing(listing_id):
    """Business: update listing (qty, deadline, etc.)."""
    listing = Listing.query.get_or_404(listing_id)
    data = request.get_json() or {}
    for key in ("item_name", "total_qty", "partner_qty", "public_qty", "standard_price", "ebt_price", "retail_value", "snap_eligible", "address"):
        if key in data:
            setattr(listing, key, data[key])
    db.session.commit()
    return jsonify(listing.to_dict())
