import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMarket } from "../../api";
import type { Listing } from "../../api";
import { ListingCard } from "../../components/ListingCard";

export function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMarket()
      .then(setListings)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Available surplus near you
        </h1>
        <p className="text-gray-600">
          Save food, save money, and help the planet.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.length === 0 ? (
          <p className="text-gray-500 col-span-full">
            No listings yet. Check back later or add some as a business.
          </p>
        ) : (
          listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))
        )}
      </div>
    </div>
  );
}
