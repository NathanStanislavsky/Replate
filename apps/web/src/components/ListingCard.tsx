import { Link } from "react-router-dom";
import { ShoppingBag, MapPin } from "lucide-react";
import type { Listing } from "../api";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="h-32 bg-emerald-100 flex items-center justify-center p-4 relative">
        <ShoppingBag size={48} className="text-emerald-300/50" />
        <span className="absolute bottom-3 left-3 bg-white/90 text-emerald-900 text-xs font-bold px-2 py-1 rounded-md">
          {listing.available_qty} left
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg leading-tight">
            {listing.business_name}
          </h3>
          {listing.address && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin size={12} /> {listing.address.slice(0, 20)}…
            </span>
          )}
        </div>
        <p className="text-gray-600 text-sm mb-4">{listing.item_name}</p>
        {listing.snap_eligible && (
          <span className="text-xs px-2 py-1 rounded-md font-medium bg-blue-50 text-blue-700 border border-blue-100 mb-4 inline-block w-fit">
            SNAP eligible
          </span>
        )}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <div>
            <div className="text-xl font-bold text-emerald-700">
              ${Number(listing.standard_price).toFixed(2)}
            </div>
            {listing.retail_value != null && (
              <div className="text-xs text-gray-400 line-through">
                Value ${Number(listing.retail_value).toFixed(2)}
              </div>
            )}
          </div>
          <Link
            to={`/listing/${listing.id}`}
            className="bg-gray-900 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl font-medium transition-colors"
          >
            Reserve
          </Link>
        </div>
      </div>
    </div>
  );
}
