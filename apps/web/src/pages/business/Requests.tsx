import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getRequests, allocateListing } from "../../api";
import type { Request } from "../../api";
import { ListOrdered } from "lucide-react";

const DEFAULT_BUSINESS_ID = 2;

export function Requests() {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get("listing");
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocating, setAllocating] = useState<number | null>(null);

  useEffect(() => {
    getRequests(DEFAULT_BUSINESS_ID)
      .then((r) => {
        if (listingId) {
          setRequests(r.filter((req) => req.listing_id === Number(listingId)));
        } else {
          setRequests(r);
        }
      })
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleAllocate = (id: number) => {
    setAllocating(id);
    allocateListing(id)
      .then(() =>
        getRequests(DEFAULT_BUSINESS_ID).then((r) => {
          setRequests(
            listingId ? r.filter((req) => req.listing_id === Number(listingId)) : r
          );
        })
      )
      .catch((e) => setError(e.response?.data?.error || e.message || "Failed"))
      .finally(() => setAllocating(null));
  };

  const byListing = requests.reduce<Record<number, Request[]>>((acc, r) => {
    const lid = r.listing_id;
    if (!acc[lid]) acc[lid] = [];
    acc[lid].push(r);
    return acc;
  }, {});

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <ListOrdered size={28} /> Requests
      </h1>
      <p className="text-gray-600 mb-6">
        Run allocation to assign bags to buyers (weighted lottery).
      </p>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
          No requests yet.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byListing).map(([lid, reqs]) => {
            const pending = reqs.filter((r) => r.status === "pending");
            const listingName = reqs[0]?.listing?.item_name ?? `Listing ${lid}`;
            return (
              <div
                key={lid}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
              >
                <h3 className="font-bold text-gray-900 mb-2">{listingName}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {pending.length} pending • {reqs.length} total
                </p>
                {pending.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleAllocate(Number(lid))}
                    disabled={allocating !== null}
                    className="mb-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
                  >
                    {allocating === Number(lid)
                      ? "Allocating…"
                      : "Run allocation"}
                  </button>
                )}
                <ul className="space-y-2">
                  {reqs.map((r) => (
                    <li
                      key={r.id}
                      className="flex justify-between items-center text-sm py-2 border-b border-gray-50 last:border-0"
                    >
                      <span>Request #{r.id} • {r.payment_method ?? "standard"}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.status === "allocated"
                            ? "bg-emerald-50 text-emerald-700"
                            : r.status === "pending"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
