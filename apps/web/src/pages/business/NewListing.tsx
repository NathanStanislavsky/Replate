import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createListing } from "../../api";

const DEFAULT_BUSINESS_ID = 2;

export function NewListing() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    item_name: "",
    total_qty: 10,
    public_qty: 10,
    partner_qty: 0,
    standard_price: 4.99,
    ebt_price: "",
    retail_value: 15,
    snap_eligible: false,
    address: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    createListing({
      business_id: DEFAULT_BUSINESS_ID,
      item_name: form.item_name,
      total_qty: form.total_qty,
      public_qty: form.public_qty,
      partner_qty: form.partner_qty,
      standard_price: form.standard_price,
      ebt_price: form.ebt_price ? Number(form.ebt_price) : undefined,
      retail_value: form.retail_value,
      snap_eligible: form.snap_eligible,
      address: form.address || undefined,
    })
      .then(() => navigate("/business/listings"))
      .catch((e) =>
        setError(e.response?.data?.error || e.message || "Failed to create")
      )
      .finally(() => setSubmitting(false));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">New listing</h1>
      <p className="text-gray-600 mb-6">Add a surplus bag offer.</p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-lg space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item name *
          </label>
          <input
            type="text"
            required
            value={form.item_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, item_name: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Bakery Surprise Bag"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total quantity
            </label>
            <input
              type="number"
              min={1}
              value={form.total_qty}
              onChange={(e) =>
                setForm((f) => ({ ...f, total_qty: Number(e.target.value) }))
              }
              className="w-full border border-gray-300 rounded-lg p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Public quantity
            </label>
            <input
              type="number"
              min={0}
              value={form.public_qty}
              onChange={(e) =>
                setForm((f) => ({ ...f, public_qty: Number(e.target.value) }))
              }
              className="w-full border border-gray-300 rounded-lg p-2"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Standard price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.standard_price}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  standard_price: Number(e.target.value),
                }))
              }
              className="w-full border border-gray-300 rounded-lg p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              EBT price ($, optional)
            </label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.ebt_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, ebt_price: e.target.value }))
              }
              className="w-full border border-gray-300 rounded-lg p-2"
              placeholder="Optional"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Retail value ($)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={form.retail_value}
            onChange={(e) =>
              setForm((f) => ({ ...f, retail_value: Number(e.target.value) }))
            }
            className="w-full border border-gray-300 rounded-lg p-2"
          />
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.snap_eligible}
              onChange={(e) =>
                setForm((f) => ({ ...f, snap_eligible: e.target.checked }))
              }
            />
            <span className="text-sm font-medium text-gray-700">
              SNAP / EBT eligible
            </span>
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Address (optional)
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-lg p-2"
            placeholder="Pickup address"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate("/business/listings")}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !form.item_name.trim()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium"
          >
            {submitting ? "Creating…" : "Create listing"}
          </button>
        </div>
      </form>
    </div>
  );
}
