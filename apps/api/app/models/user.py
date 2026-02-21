from app import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    role = db.Column(db.String(32), nullable=False, default="buyer")  # buyer | business
    business_name = db.Column(db.String(255), nullable=True)
    pickups_last_7_days = db.Column(db.Integer, default=0)
    no_show_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    listings = db.relationship("Listing", backref="business", lazy="dynamic", foreign_keys="Listing.business_id")
    requests = db.relationship("Request", backref="user", lazy="dynamic")
    allocations = db.relationship("Allocation", backref="user", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "business_name": self.business_name,
            "pickups_last_7_days": self.pickups_last_7_days,
            "no_show_count": self.no_show_count,
        }
