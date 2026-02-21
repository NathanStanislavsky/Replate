import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getListing, createRequest } from "../../api";
import type { Listing } from "../../api";
import { CreditCard, ShieldCheck, AlertCircle } from "lucide-react";

const DEFAULT_BUYER_ID = 1;

export function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"standard" | "ebt">(
    "standard"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getListing(Number(id))
      .then(setListing)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReserve = () => {
    if (!listing || listing.available_qty <= 0) return;
    setSubmitting(true);
    setError(null);
    createRequest(listing.id, {
      user_id: DEFAULT_BUYER_ID,
      payment_method: paymentMethod,
    })
      .then(() => navigate("/orders"))
      .catch((e) => setError(e.response?.data?.error || e.message || "Failed"))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error && !listing)
    return <div className="text-red-600">{error}</div>;
  if (!listing) return null;

  const isSnapEligible = listing.snap_eligible;
  const price =
    paymentMethod === "ebt" && isSnapEligible && listing.ebt_price != null
      ? Number(listing.ebt_price)
      : Number(listing.standard_price);
  const tax = paymentMethod === "ebt" ? 0 : 0.42;
  const total = (price + tax).toFixed(2);

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-40 bg-emerald-100 flex items-center justify-center">
          <span className="text-emerald-700 font-bold text-lg">
            {listing.business_name}
          </span>
        </div>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {listing.item_name}
          </h1>
          <p className="text-gray-600 mb-4">{listing.business_name}</p>
          {listing.address && (
            <p className="text-sm text-gray-500 mb-4">{listing.address}</p>
          )}
          <p className="text-sm text-gray-600 mb-4">
            {listing.available_qty} bag(s) available • SNAP eligible:{" "}
            {listing.snap_eligible ? "Yes" : "No"}
          </p>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100 mb-6">
            <div className="font-medium">Payment method</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("standard")}
                className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                  paymentMethod === "standard"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <CreditCard size={16} /> Standard
              </button>
              <button
                type="button"
                disabled={!isSnapEligible}
                onClick={() => setPaymentMethod("ebt")}
                className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center gap-2 ${
                  !isSnapEligible
                    ? "opacity-50 cursor-not-allowed bg-gray-100"
                    : paymentMethod === "ebt"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ShieldCheck size={16} /> EBT / SNAP
              </button>
            </div>
            {!isSnapEligible && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle size={12} /> Hot/prepared items are not SNAP
                eligible.
              </p>
            )}
          </div>

          <div className="space-y-2 text-sm border-t pt-4 mb-6">
            <div className="flex justify-between text-gray-600">
              <span>Bag price</span>
              <span>${price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax {paymentMethod === "ebt" && "(waived)"}</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>${total}</span>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm mb-4">{error}</p>
          )}
          <button
            type="button"
            onClick={handleReserve}
            disabled={submitting || listing.available_qty <= 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold"
          >
            {submitting ? "Reserving…" : `Reserve for $${total}`}
          </button>
        </div>
      </div>
    </div>
  );
}
