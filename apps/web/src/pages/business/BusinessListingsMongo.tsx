/**
 * Business listings (FastAPI/Mongo): list + create. Requires login (X-Business-Id in localStorage).
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getStoredBusinessId,
  businessListListings,
  businessCreateListing,
} from "../../api/business";
import type { MarketListing } from "../../api/business";

export function BusinessListingsMongo() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    title: "",
    price_cents: 0,
    qty_available: 1,
    address: "",
    category: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getStoredBusinessId()) {
      navigate("/business/login");
      return;
    }
    businessListListings()
      .then(setListings)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await businessCreateListing({
        business_name: form.business_name,
        title: form.title,
        price_cents: form.price_cents,
        qty_available: form.qty_available,
        address: form.address || undefined,
        category: form.category || undefined,
      });
      setListings(await businessListListings());
      setShowForm(false);
      setForm({ business_name: "", title: "", price_cents: 0, qty_available: 1, address: "", category: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My listings</h1>
      <p className="text-gray-600 mb-6">Create and manage surplus listings (map API).</p>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="mb-6 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium"
      >
        {showForm ? "Cancel" : "+ New listing"}
      </button>
      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 p-6 bg-white rounded-xl border space-y-4 max-w-lg">
          <input
            placeholder="Business name"
            value={form.business_name}
            onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
            className="w-full border rounded-lg p-2"
            required
          />
          <input
            placeholder="Title (e.g. Surprise Bag)"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full border rounded-lg p-2"
            required
          />
          <input
            type="number"
            placeholder="Price (cents, e.g. 500 = $5.00)"
            value={form.price_cents || ""}
            min={0}
            onChange={(e) => setForm((f) => ({ ...f, price_cents: Number(e.target.value) }))}
            className="w-full border rounded-lg p-2"
          />
          <input
            type="number"
            placeholder="Quantity available"
            value={form.qty_available || ""}
            min={1}
            onChange={(e) => setForm((f) => ({ ...f, qty_available: Number(e.target.value) }))}
            className="w-full border rounded-lg p-2"
          />
          <input
            placeholder="Address (for map)"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full border rounded-lg p-2"
          />
          <input
            placeholder="Category (optional)"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full border rounded-lg p-2"
          />
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg">
            {submitting ? "Creating…" : "Create"}
          </button>
        </form>
      )}
      <ul className="space-y-4">
        {listings.map((l) => (
          <li key={l.id} className="flex justify-between items-center p-4 bg-white rounded-xl border">
            <div>
              <span className="font-medium">{l.title}</span> · ${(l.price_cents / 100).toFixed(2)} · {l.qty_available} left
            </div>
            <Link to={`/business/m/listings/${l.id}/orders`} className="text-emerald-600 text-sm font-medium">
              View orders →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
