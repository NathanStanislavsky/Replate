from app import db
import uuid


class Allocation(db.Model):
    __tablename__ = "allocations"

    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey("listings.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    request_id = db.Column(db.Integer, db.ForeignKey("requests.id"), nullable=True)
    status = db.Column(db.String(32), default="allocated")  # allocated | picked_up | no_show
    qr_token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: uuid.uuid4().hex)
    picked_up = db.Column(db.Boolean, default=False)
    picked_up_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "listing_id": self.listing_id,
            "user_id": self.user_id,
            "request_id": self.request_id,
            "status": self.status,
            "qr_token": self.qr_token,
            "picked_up": self.picked_up,
            "picked_up_at": self.picked_up_at.isoformat() if self.picked_up_at else None,
            "listing": self.listing.to_dict() if self.listing else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
