/**
 * Marketplace — split view: map (left) + listing panel (right).
 * Floating filter bar overlaid on the map.
 */
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { BostonMap } from "../../components/BostonMap";
import { getMarketWithBounds, parseMarketIntent } from "../../api/market";
import type { MarketListing, Bounds, MarketFilters } from "../../api/market";
import {
  parseMarketplaceQuery,
  getCurrentPosition,
  toBoundsFromCenter,
} from "../../lib/marketQueryIntent";

const BOSTON_DEFAULT_BOUNDS: Bounds = {
  sw_lat: 42.2279, sw_lng: -71.1912,
  ne_lat: 42.3996, ne_lng: -70.986,
};

type QuerySnapshot = {
  openNow: boolean;
  minPrice: string;
  maxPrice: string;
  category: string;
  bounds: Bounds | null;
};

export function MarketplaceMap() {
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<Bounds | null>(BOSTON_DEFAULT_BOUNDS);
  const [openNow, setOpenNow] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [queryMessage, setQueryMessage] = useState<string | null>(null);
  const [parsingQuery, setParsingQuery] = useState(false);
  const [focusBounds, setFocusBounds] = useState<Bounds | null>(null);
  const [focusBoundsVersion, setFocusBoundsVersion] = useState(0);
  const [lastQuerySnapshot, setLastQuerySnapshot] = useState<QuerySnapshot | null>(null);

  const fetchListings = useCallback(async (b: Bounds | null, f?: MarketFilters) => {
    setLoading(true);
    setError(null);
    try {
      setListings(await getMarketWithBounds(b, f));
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

  const handleBoundsChange = useCallback((b: Bounds) => setBounds(b), []);

  const applyBounds = useCallback((nextBounds: Bounds) => {
    setBounds(nextBounds);
    setFocusBounds(nextBounds);
    setFocusBoundsVersion((v) => v + 1);
  }, []);

  const resolveNearMeBounds = useCallback(async (radiusKm?: number | null) => {
    const current = await getCurrentPosition();
    return toBoundsFromCenter(current.lat, current.lng, radiusKm ?? 2.5);
  }, []);

  const handleApplyQuery = useCallback(async () => {
    if (!query.trim()) {
      setQueryMessage("Type a search like 'cheap bakery near Fenway' to apply filters.");
      return;
    }

    const snapshot: QuerySnapshot = {
      openNow,
      minPrice,
      maxPrice,
      category,
      bounds: bounds ? { ...bounds } : null,
    };

    setParsingQuery(true);
    setQueryMessage(null);
    try {
      let remoteNote: string | null = null;
      let remoteSucceeded = false;
      try {
        const remote = await parseMarketIntent(query);
        remoteSucceeded = true;
        if (remote.open_now != null) setOpenNow(remote.open_now);
        if (remote.min_price_cents != null) setMinPrice((remote.min_price_cents / 100).toString());
        if (remote.max_price_cents != null) setMaxPrice((remote.max_price_cents / 100).toString());
        if (remote.category) setCategory(remote.category);
        if (remote.bounds) applyBounds(remote.bounds);
        if (remote.near_me) {
          try {
            const nearMeBounds = await resolveNearMeBounds(remote.radius_km);
            applyBounds(nearMeBounds);
          } catch {
            remoteNote = "Could not access your location. Showing current map area instead.";
          }
        }
        remoteNote = remote.note ?? remoteNote;
      } catch {
        // Fall back to local parser if backend intent parsing is unavailable.
      }

      if (!remoteSucceeded) {
        const local = await parseMarketplaceQuery(query);
        if (local.openNow != null) setOpenNow(local.openNow);
        if (local.minPriceDollars != null) setMinPrice(local.minPriceDollars.toString());
        if (local.maxPriceDollars != null) setMaxPrice(local.maxPriceDollars.toString());
        if (local.category) setCategory(local.category);
        if (local.bounds) applyBounds(local.bounds);
        setLastQuerySnapshot(snapshot);
        setQueryMessage(local.note ?? "Applied intent to map and filters.");
      } else {
        setLastQuerySnapshot(snapshot);
        setQueryMessage(remoteNote ?? "Applied intent to map and filters.");
      }
    } catch (e) {
      setQueryMessage(e instanceof Error ? e.message : "Could not parse search query.");
    } finally {
      setParsingQuery(false);
    }
  }, [query, openNow, minPrice, maxPrice, category, bounds, applyBounds, resolveNearMeBounds]);

  const handleUndoQuery = useCallback(() => {
    if (!lastQuerySnapshot) return;
    setOpenNow(lastQuerySnapshot.openNow);
    setMinPrice(lastQuerySnapshot.minPrice);
    setMaxPrice(lastQuerySnapshot.maxPrice);
    setCategory(lastQuerySnapshot.category);
    if (lastQuerySnapshot.bounds) {
      applyBounds(lastQuerySnapshot.bounds);
    } else {
      setBounds(null);
      setFocusBounds(null);
    }
    setLastQuerySnapshot(null);
    setQuery("");
    setQueryMessage("Reverted last natural-language query.");
  }, [lastQuerySnapshot, applyBounds]);

  return (
    // Full-height split: map + side panel
    <div className="flex" style={{ height: "calc(100vh - 64px)" }}>

      {/* ── Map pane ── */}
      <div className="relative flex-1 min-w-0">
        <BostonMap
          listings={listings}
          onBoundsChange={handleBoundsChange}
          debounceMs={400}
          focusBounds={focusBounds}
          focusBoundsVersion={focusBoundsVersion}
        />

        {/* Floating filter bar */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur-sm shadow-md rounded-full px-4 py-2"
          style={{ maxWidth: "90%" }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleApplyQuery();
              }
            }}
            className="w-56 text-xs border-0 outline-none bg-transparent text-gray-700 placeholder-gray-400"
            placeholder='Search: "vegan under $5 near me"'
          />
          <button
            type="button"
            onClick={() => void handleApplyQuery()}
            disabled={parsingQuery}
            className="text-xs px-2 py-1 rounded-md bg-emerald-600 text-white disabled:opacity-60"
          >
            {parsingQuery ? "..." : "Apply"}
          </button>
          {lastQuerySnapshot && (
            <button
              type="button"
              onClick={handleUndoQuery}
              className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Undo
            </button>
          )}
          <div className="w-px h-4 bg-gray-200" />
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={openNow}
              onChange={(e) => setOpenNow(e.target.checked)}
              className="accent-emerald-600"
            />
            Open now
          </label>
          <div className="w-px h-4 bg-gray-200" />
          <input
            type="number" step="0.01" min="0"
            value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
            className="w-20 text-xs border-0 outline-none bg-transparent text-gray-700 placeholder-gray-400"
            placeholder="Min $"
          />
          <span className="text-gray-300 text-xs">—</span>
          <input
            type="number" step="0.01" min="0"
            value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
            className="w-20 text-xs border-0 outline-none bg-transparent text-gray-700 placeholder-gray-400"
            placeholder="Max $"
          />
          <div className="w-px h-4 bg-gray-200" />
          <input
            type="text"
            value={category} onChange={(e) => setCategory(e.target.value)}
            className="w-24 text-xs border-0 outline-none bg-transparent text-gray-700 placeholder-gray-400"
            placeholder="Category"
          />
          {loading && <span className="text-xs text-gray-400 ml-1">•••</span>}
        </div>
        {queryMessage && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 text-[11px] text-gray-600 px-3 py-1.5 rounded-full shadow-sm">
            {queryMessage}
          </div>
        )}
      </div>

      {/* ── Side panel ── */}
      <div className="w-80 flex-shrink-0 bg-white border-l border-gray-100 overflow-y-auto">
        <div className="p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <p className="text-sm font-semibold text-gray-800">
            {loading ? "Loading…" : `${listings.length} listing${listings.length !== 1 ? "s" : ""} nearby`}
          </p>
          {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
        </div>

        <div className="divide-y divide-gray-50">
          {listings.length === 0 && !loading && (
            <p className="text-sm text-gray-400 p-6 text-center">
              No listings here. Pan the map or add one as a business.
            </p>
          )}
          {listings.map((listing) => (
            <Link
              key={listing.id}
              to={`/listing/m/${listing.id}`}
              className="flex flex-col gap-1 p-4 hover:bg-gray-50 transition-colors"
            >
              <p className="text-sm font-semibold text-gray-900 truncate">{listing.title}</p>
              <p className="text-xs text-gray-400 truncate">{listing.business_name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-bold text-emerald-700">
                  ${(listing.price_cents / 100).toFixed(2)}
                </span>
                <span className="text-xs text-gray-400">{listing.qty_available} left</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
