/**
 * Marketplace with Boston map. Fetches listings from FastAPI /api/market (bounds + filters).
 * On map move: debounced refetch. Filters: open now, price range, category.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { BostonMap } from "../../components/BostonMap";
import { getMarketWithBounds } from "../../api/market";
import type { MarketListing, Bounds, MarketFilters } from "../../api/market";

const BOSTON_DEFAULT_BOUNDS: Bounds = {
  sw_lat: 42.2279,
  sw_lng: -71.1912,
  ne_lat: 42.3996,
  ne_lng: -70.986,
};

export function MarketplaceMap() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(BOSTON_DEFAULT_BOUNDS);
  const [openNow, setOpenNow] = useState(false);
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const fetchListings = useCallback(async (b: Bounds | null, f?: MarketFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMarketWithBounds(b, f);
      setListings(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const f: MarketFilters = {};
    if (openNow) f.open_now = true;
    if (minPrice !== "") f.min_price_cents = Math.round(parseFloat(minPrice) * 100) || undefined;
    if (maxPrice !== "") f.max_price_cents = Math.round(parseFloat(maxPrice) * 100) || undefined;
    if (category.trim()) f.category = category.trim();
    fetchListings(bounds, f);
  }, [bounds?.sw_lat, bounds?.sw_lng, bounds?.ne_lat, bounds?.ne_lng, openNow, minPrice, maxPrice, category, fetchListings]);

  const handleBoundsChange = useCallback((b: Bounds) => {
    setBounds(b);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Surplus near you (Boston)
        </h1>
        <p className="text-gray-600 mb-4">
          Move the map to load listings in view. Click a marker to see details and reserve.
        </p>
        <div className="flex flex-wrap gap-4 items-center p-3 bg-white rounded-xl border border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={openNow}
              onChange={(e) => setOpenNow(e.target.checked)}
            />
            <span className="text-sm font-medium">Open now</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Min $</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-20 border border-gray-300 rounded p-1.5 text-sm"
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Max $</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-20 border border-gray-300 rounded p-1.5 text-sm"
              placeholder="—"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Category</span>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-32 border border-gray-300 rounded p-1.5 text-sm"
              placeholder="e.g. bakery"
            />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <BostonMap
          listings={listings}
          onBoundsChange={handleBoundsChange}
          debounceMs={400}
        />
      </div>

      {loading && listings.length === 0 && (
        <p className="text-gray-500">Loading listings…</p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      <div className="mt-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">In this area</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.length === 0 && !loading && (
            <p className="text-gray-500 col-span-full">
              No listings in this view. Pan the map or add listings as a business.
            </p>
          )}
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
            >
              <h3 className="font-bold text-gray-900">{listing.title}</h3>
              <p className="text-sm text-gray-600">{listing.business_name}</p>
              <p className="text-emerald-700 font-medium mt-1">
                ${(listing.price_cents / 100).toFixed(2)} · {listing.qty_available} left
              </p>
              <Link
                to={`/listing/m/${listing.id}`}
                className="inline-block mt-2 text-sm font-medium text-emerald-600 hover:underline"
              >
                View & reserve →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
