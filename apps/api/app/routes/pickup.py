from flask import Blueprint, request, jsonify
from datetime import datetime
from app import db
from app.models import Allocation, User

pickup_bp = Blueprint("pickup", __name__)


@pickup_bp.route("/pickup/scan", methods=["POST"])
def scan():
    """Confirm pickup by qr_token. Marks allocation picked_up and increments user pickups_last_7_days."""
    data = request.get_json() or {}
    qr_token = data.get("qr_token")
    if not qr_token:
        return jsonify({"error": "qr_token required"}), 400
    allocation = Allocation.query.filter_by(qr_token=qr_token).first()
    if not allocation:
        return jsonify({"error": "Invalid or already used code"}), 404
    if allocation.picked_up:
        return jsonify({"error": "Already picked up"}), 400

    allocation.picked_up = True
    allocation.picked_up_at = datetime.utcnow()
    allocation.status = "picked_up"
    user = User.query.get(allocation.user_id)
    if user:
        user.pickups_last_7_days = (user.pickups_last_7_days or 0) + 1
    db.session.commit()
    return jsonify(allocation.to_dict())
