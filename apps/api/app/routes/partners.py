from flask import Blueprint, request, jsonify
from app import db
from app.models import Listing

partners_bp = Blueprint("partners", __name__)


@partners_bp.route("/listings/<int:listing_id>/reserve-partner", methods=["POST"])
def reserve_partner(listing_id):
    """Partner: reserve partner share for a listing (stub: just decrement public, increment partner)."""
    listing = Listing.query.get_or_404(listing_id)
    data = request.get_json() or {}
    qty = data.get("partner_qty", 1)
    if qty <= 0:
        return jsonify({"error": "partner_qty must be positive"}), 400
    listing.partner_qty = (listing.partner_qty or 0) + qty
    listing.public_qty = max(0, (listing.public_qty or 0) - qty)
    db.session.commit()
    return jsonify(listing.to_dict())
