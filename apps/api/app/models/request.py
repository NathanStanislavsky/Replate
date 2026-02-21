from app import db


class Request(db.Model):
    __tablename__ = "requests"

    id = db.Column(db.Integer, primary_key=True)
    listing_id = db.Column(db.Integer, db.ForeignKey("listings.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    status = db.Column(db.String(32), default="pending")  # pending | allocated | cancelled
    payment_method = db.Column(db.String(32), nullable=True)  # standard | ebt
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    allocation = db.relationship("Allocation", backref="request", uselist=False, lazy="joined")

    def to_dict(self):
        return {
            "id": self.id,
            "listing_id": self.listing_id,
            "user_id": self.user_id,
            "status": self.status,
            "payment_method": self.payment_method,
            "listing": self.listing.to_dict() if self.listing else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
