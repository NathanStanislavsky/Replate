import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getListings, getRequests } from "../../api";
import type { Listing, Request } from "../../api";
import { Package, ListOrdered, PlusCircle } from "lucide-react";

const DEFAULT_BUSINESS_ID = 2;

export function Dashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getListings(DEFAULT_BUSINESS_ID),
      getRequests(DEFAULT_BUSINESS_ID),
    ])
      .then(([l, r]) => {
        setListings(l);
        setRequests(r);
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const activeListings = listings.filter((l) => l.available_qty > 0).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Business dashboard</h1>
      <p className="text-gray-600 mb-6">Manage your surplus listings and requests.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-slate-600" size={28} />
            <h2 className="font-bold text-gray-900">Listings</h2>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{listings.length}</p>
          <p className="text-sm text-gray-500">{activeListings} with availability</p>
          <Link
            to="/business/listings"
            className="mt-4 inline-flex items-center gap-2 text-emerald-600 font-medium text-sm"
          >
            View all <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <ListOrdered className="text-slate-600" size={28} />
            <h2 className="font-bold text-gray-900">Requests</h2>
          </div>
          <p className="text-3xl font-bold text-amber-600">{requests.length}</p>
          <p className="text-sm text-gray-500">{pendingCount} pending</p>
          <Link
            to="/business/requests"
            className="mt-4 inline-flex items-center gap-2 text-emerald-600 font-medium text-sm"
          >
            View all <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <Link
        to="/business/listings/new"
        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-medium"
      >
        <PlusCircle size={20} /> New listing
      </Link>
    </div>
  );
}
