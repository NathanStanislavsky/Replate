import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getListings } from "../../api";
import type { Listing } from "../../api";
import { Package, PlusCircle } from "lucide-react";

const DEFAULT_BUSINESS_ID = 2;

export function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getListings(DEFAULT_BUSINESS_ID)
      .then(setListings)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Package size={28} /> Listings
          </h1>
          <p className="text-gray-600">Create and manage surplus offers.</p>
        </div>
        <Link
          to="/business/listings/new"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium"
        >
          <PlusCircle size={20} /> New listing
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
          No listings yet. Create one to start selling surplus.
        </div>
      ) : (
        <ul className="space-y-4">
          {listings.map((listing) => (
            <li
              key={listing.id}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-wrap justify-between items-center gap-4"
            >
              <div>
                <h3 className="font-bold text-gray-900">{listing.item_name}</h3>
                <p className="text-sm text-gray-600">
                  ${Number(listing.standard_price).toFixed(2)} • {listing.available_qty} / {listing.public_qty} available
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/business/listings/${listing.id}`}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium text-sm"
                >
                  Edit
                </Link>
                <Link
                  to={`/business/requests?listing=${listing.id}`}
                  className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-sm"
                >
                  Requests
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
