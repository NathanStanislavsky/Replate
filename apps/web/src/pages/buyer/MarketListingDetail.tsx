/**
 * Detail + reserve for one listing (FastAPI/MongoDB market). ID is string (MongoDB ObjectId).
 */
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getListingById, reserveListing } from "../../api/market";
import type { MarketListing } from "../../api/market";

const BUYER_NAME_KEY = "replate_buyer_name";

export function MarketListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<MarketListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getListingById(id)
      .then(setListing)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReserve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !userName.trim()) return;
    setSubmitting(true);
    setError(null);
    reserveListing(id, userName.trim())
      .then((order) => {
        localStorage.setItem(BUYER_NAME_KEY, userName.trim());
        setSuccess(`Reserved! Show this code at pickup: ${order.qr_token.slice(0, 8)}…`);
      })
      .catch((e) =>
        setError(e.response?.data?.detail ?? e.message ?? "Failed to reserve")
      )
      .finally(() => setSubmitting(false));
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (error && !listing) return <div className="text-red-600">{error}</div>;
  if (!listing) return null;

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
          <p className="text-gray-600">{listing.business_name}</p>
          <p className="text-xl font-bold text-emerald-700 mt-2">
            ${(listing.price_cents / 100).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500">{listing.qty_available} left</p>
          {listing.address && (
            <p className="text-sm text-gray-500 mt-2">{listing.address}</p>
          )}

          {success ? (
            <div className="mt-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl">
              {success}
              <div className="mt-2">
                <Link to="/orders" className="font-medium underline">
                  View my orders
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReserve} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your name (for pickup)
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="e.g. Alex"
                  required
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting || listing.qty_available < 1}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded-xl font-bold"
              >
                {submitting ? "Reserving…" : "Reserve"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-4 text-gray-600 hover:underline text-sm"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
