/**
 * Orders for one listing (FastAPI/Mongo). Requires business login.
 */
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { getStoredBusinessId, businessListingOrders } from "../../api/business";
import type { BusinessOrder } from "../../api/business";

export function BusinessListingOrders() {
  const { id } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<BusinessOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getStoredBusinessId()) {
      navigate("/business/login");
      return;
    }
    if (!id) return;
    businessListingOrders(id)
      .then(setOrders)
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Orders for this listing</h1>
      <p className="text-gray-600 mb-6">Listing ID: {id}</p>
      <Link to="/business/m/listings" className="text-emerald-600 font-medium mb-4 inline-block">← Back to listings</Link>
      <ul className="space-y-3">
        {orders.length === 0 && <p className="text-gray-500">No orders yet.</p>}
        {orders.map((o) => (
          <li key={o.id} className="p-4 bg-white rounded-xl border flex justify-between items-center">
            <div>
              <span className="font-medium">{o.user_name}</span> · {o.status}
              {o.picked_up_at && <span className="text-gray-500 text-sm"> · Picked up</span>}
            </div>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{o.qr_token?.slice(0, 8)}…</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
