from flask import Blueprint, request, jsonify
from app import db
from app.models import Request, Listing, User

requests_bp = Blueprint("requests", __name__)


@requests_bp.route("/listings/<int:listing_id>/request", methods=["POST"])
def create_request(listing_id):
    """Buyer: request/reserve a bag for a listing."""
    listing = Listing.query.get_or_404(listing_id)
    if listing.available_qty <= 0:
        return jsonify({"error": "No availability"}), 400

    data = request.get_json() or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 400

    req = Request(
        listing_id=listing_id,
        user_id=user_id,
        status="pending",
        payment_method=data.get("payment_method", "standard"),
    )
    db.session.add(req)
    db.session.commit()
    return jsonify(req.to_dict()), 201


@requests_bp.route("/orders", methods=["GET"])
def get_orders():
    """Buyer: my orders (requests + allocations). Optional ?user_id= for dev."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    requests = Request.query.filter_by(user_id=user_id).order_by(Request.created_at.desc()).all()
    return jsonify([r.to_dict() for r in requests])


@requests_bp.route("/listings/<int:listing_id>/requests", methods=["GET"])
def listing_requests(listing_id):
    """Business: requests for one listing."""
    requests = Request.query.filter_by(listing_id=listing_id).all()
    return jsonify([r.to_dict() for r in requests])


@requests_bp.route("/requests", methods=["GET"])
def list_requests():
    """Business: all requests for my listings. Optional ?business_id=."""
    business_id = request.args.get("business_id", type=int)
    if not business_id:
        return jsonify({"error": "business_id required"}), 400
    requests = Request.query.join(Listing).filter(Listing.business_id == business_id).order_by(Request.created_at.desc()).all()
    return jsonify([r.to_dict() for r in requests])
