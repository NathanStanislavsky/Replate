from flask import Blueprint, request, jsonify
from app import db
from app.models import User

users_bp = Blueprint("users", __name__)


@users_bp.route("/users", methods=["GET"])
def list_users():
    """Dev: list users."""
    users = User.query.all()
    return jsonify([u.to_dict() for u in users])


@users_bp.route("/users", methods=["POST"])
def create_user():
    """Dev: create a buyer or business user."""
    data = request.get_json() or {}
    email = data.get("email", "user@example.com")
    role = data.get("role", "buyer")
    business_name = data.get("business_name")
    user = User(email=email, role=role, business_name=business_name)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201
