import { useEffect, useState } from "react";
import { getOrders } from "../../api";
import type { Request } from "../../api";
import { ListOrdered } from "lucide-react";

const DEFAULT_BUYER_ID = 1;

export function Orders() {
  const [orders, setOrders] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrders(DEFAULT_BUYER_ID)
      .then(setOrders)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <ListOrdered size={28} /> My orders
      </h1>
      <p className="text-gray-600 mb-6">Your reservations and pickup status.</p>
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-500">
          No orders yet. Reserve a bag from the marketplace.
        </div>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li
              key={order.id}
              className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">
                    {order.listing?.item_name ?? "Listing"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {order.listing?.business_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ${order.listing?.standard_price != null
                      ? Number(order.listing.standard_price).toFixed(2)
                      : "—"}{" "}
                    • {order.payment_method ?? "standard"}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    order.status === "allocated"
                      ? "bg-emerald-50 text-emerald-700"
                      : order.status === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Order #{order.id} •{" "}
                {order.created_at
                  ? new Date(order.created_at).toLocaleString()
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
