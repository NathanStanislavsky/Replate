from app import db


class Listing(db.Model):
    __tablename__ = "listings"

    id = db.Column(db.Integer, primary_key=True)
    business_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    item_name = db.Column(db.String(255), nullable=False)
    total_qty = db.Column(db.Integer, nullable=False)
    partner_qty = db.Column(db.Integer, default=0)
    public_qty = db.Column(db.Integer, nullable=False)
    standard_price = db.Column(db.Numeric(10, 2), nullable=False)
    ebt_price = db.Column(db.Numeric(10, 2), nullable=True)
    retail_value = db.Column(db.Numeric(10, 2), nullable=True)
    snap_eligible = db.Column(db.Boolean, default=False)
    request_deadline = db.Column(db.DateTime, nullable=True)
    pickup_start = db.Column(db.DateTime, nullable=True)
    pickup_end = db.Column(db.DateTime, nullable=True)
    address = db.Column(db.String(512), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    requests = db.relationship("Request", backref="listing", lazy="dynamic")
    allocations = db.relationship("Allocation", backref="listing", lazy="dynamic")

    @property
    def available_qty(self):
        taken = self.allocations.count()
        return max(0, self.public_qty - taken)

    def to_dict(self):
        return {
            "id": self.id,
            "business_id": self.business_id,
            "business_name": self.business.business_name or "Business",
            "item_name": self.item_name,
            "total_qty": self.total_qty,
            "partner_qty": self.partner_qty,
            "public_qty": self.public_qty,
            "available_qty": self.available_qty,
            "standard_price": float(self.standard_price),
            "ebt_price": float(self.ebt_price) if self.ebt_price else None,
            "retail_value": float(self.retail_value) if self.retail_value else None,
            "snap_eligible": self.snap_eligible,
            "request_deadline": self.request_deadline.isoformat() if self.request_deadline else None,
            "pickup_start": self.pickup_start.isoformat() if self.pickup_start else None,
            "pickup_end": self.pickup_end.isoformat() if self.pickup_end else None,
            "address": self.address,
        }
