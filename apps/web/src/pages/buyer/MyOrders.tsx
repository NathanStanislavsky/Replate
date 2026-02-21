import { useEffect, useState } from "react";
import { getBuyerOrders } from "../../api/market";
import type { MarketOrder } from "../../api/market";

const BUYER_NAME_KEY = "replate_buyer_name";

export function MyOrders() {
  const [name, setName] = useState("");
  const [orders, setOrders] = useState<MarketOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async (buyerName: string) => {
    const trimmed = buyerName.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBuyerOrders(trimmed);
      setOrders(data);
      localStorage.setItem(BUYER_NAME_KEY, trimmed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedName = localStorage.getItem(BUYER_NAME_KEY) ?? "";
    if (savedName) {
      setName(savedName);
      void loadOrders(savedName);
    }
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My orders</h1>
      <p className="text-gray-600 mb-6">Enter the same name used at checkout to see your reservations.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void loadOrders(name);
        }}
        className="bg-white rounded-xl border p-4 flex gap-2 mb-6"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2"
          placeholder="Your name used when reserving"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </form>

      {error && <p className="text-red-600 mb-4">{error}</p>}

      {!loading && orders.length === 0 && (
        <p className="text-gray-500">No orders found yet for this name.</p>
      )}

      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="p-4 bg-white rounded-xl border">
            <div className="font-medium text-gray-900">{o.status}</div>
            <div className="text-sm text-gray-600 mt-1">
              Order ID: <code>{o.id}</code>
            </div>
            <div className="text-sm text-gray-600">
              Listing ID: <code>{o.listing_id}</code>
            </div>
            <div className="text-sm text-gray-600">
              QR: <code>{o.qr_token}</code>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
