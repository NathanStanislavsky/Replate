/**
 * Donation routing simulation visualizer.
 * Shows restaurants (green), food banks (purple), and allocation lines between them.
 * Route: /demo
 */
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getSimulation } from "../api/simulation";
import type { SimulationData, SimFoodBank } from "../api/simulation";

const BOSTON_CENTER: [number, number] = [42.3601, -71.0589];

const restaurantIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;background:#16a34a;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.25);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  popupAnchor: [0, -10],
});

const foodBankIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;background:#7c3aed;border:2.5px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

function SimMapView({ data }: { data: SimulationData }) {
  // Build a lookup of food bank id → food bank
  const fbById = new Map<string, SimFoodBank>();
  for (const fb of data.food_banks) {
    fbById.set(fb.id, fb);
  }

  // Build polylines: one per (listing, allocation) pair
  const lines: { points: [[number, number], [number, number]]; label: string }[] = [];
  for (const listing of data.listings) {
    if (!listing.location) continue;
    const [lngR, latR] = listing.location.coordinates;
    for (const alloc of listing.donation_plan) {
      const fb = fbById.get(alloc.food_bank_id);
      if (!fb?.location) continue;
      const [lngFB, latFB] = fb.location.coordinates;
      lines.push({
        points: [
          [latR, lngR],
          [latFB, lngFB],
        ],
        label: `${listing.business_name} → ${fb.name}`,
      });
    }
  }

  return (
    <MapContainer
      center={BOSTON_CENTER}
      zoom={13}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />

      {/* Allocation lines */}
      {lines.map((line, i) => (
        <Polyline
          key={i}
          positions={line.points}
          pathOptions={{ color: "#6366f1", weight: 1.5, dashArray: "5 5", opacity: 0.6 }}
        />
      ))}

      {/* Restaurant markers (green) */}
      {data.listings.map((listing) => {
        if (!listing.location) return null;
        const [lng, lat] = listing.location.coordinates;
        const donatedQty = Math.floor(listing.qty_available * listing.donate_percent);
        const assignedNames = listing.donation_plan.map((a) => a.name).join(", ");
        const firstDur = listing.donation_plan[0]?.duration_minutes;
        return (
          <Marker key={listing.id} position={[lat, lng]} icon={restaurantIcon}>
            <Popup>
              <div className="text-sm space-y-1 min-w-[160px]">
                <p className="font-bold text-emerald-800">{listing.business_name}</p>
                <p className="text-gray-700">{listing.title}</p>
                <p className="text-gray-500">
                  Donating <strong>{donatedQty}</strong> units ({Math.round(listing.donate_percent * 100)}%)
                </p>
                {assignedNames && (
                  <p className="text-indigo-700 text-xs">→ {assignedNames}</p>
                )}
                {firstDur != null && (
                  <p className="text-gray-400 text-xs">~{firstDur} min drive</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Food bank markers (purple) */}
      {data.food_banks.map((fb) => {
        if (!fb.location) return null;
        const [lng, lat] = fb.location.coordinates;
        return (
          <Marker key={fb.id} position={[lat, lng]} icon={foodBankIcon}>
            <Popup>
              <div className="text-sm space-y-1 min-w-[160px]">
                <p className="font-bold text-violet-800">{fb.name}</p>
                <p className="text-gray-600 text-xs">{fb.address}</p>
                <p className="text-gray-500 text-xs">
                  Need weight: <strong>{fb.need_weight?.toFixed(3)}</strong>
                </p>
                <p className="text-emerald-700 font-medium">
                  Incoming: <strong>{fb.total_incoming}</strong> units
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export function SimulationMap() {
  const [data, setData] = useState<SimulationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSimulation()
      .then(setData)
      .catch((e) => setError(e.message || "Failed to load simulation"))
      .finally(() => setLoading(false));
  }, []);

  const fbById = new Map<string, SimFoodBank>();
  if (data) {
    for (const fb of data.food_banks) fbById.set(fb.id, fb);
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Donation Routing — Live Demo</h1>
        <p className="text-gray-500 text-sm">
          Green markers = restaurants with surplus food. Purple markers = food banks receiving donations.
          Lines show the OSRM-routed allocation.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-96 text-gray-400">Loading simulation…</div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {data && (
        <>
          {/* Legend */}
          <div className="flex gap-6 mb-3 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
              Restaurants ({data.listings.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-violet-500" />
              Food banks ({data.food_banks.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-5 border-t-2 border-dashed border-indigo-400" />
              Allocations
            </span>
          </div>

          {/* Map */}
          <div className="w-full h-[480px] rounded-xl overflow-hidden border border-gray-200 z-0 mb-8">
            <SimMapView data={data} />
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{data.listings.length}</p>
              <p className="text-sm text-emerald-600">Restaurants donating</p>
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-violet-700">{data.food_banks.length}</p>
              <p className="text-sm text-violet-600">Food banks receiving</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-indigo-700">
                {data.food_banks.reduce((s, fb) => s + fb.total_incoming, 0)}
              </p>
              <p className="text-sm text-indigo-600">Total units allocated</p>
            </div>
          </div>

          {/* Allocation table */}
          <h2 className="text-lg font-bold text-gray-900 mb-3">Allocation breakdown</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">Restaurant</th>
                  <th className="text-left p-3 font-medium text-gray-600">Food bank</th>
                  <th className="text-right p-3 font-medium text-gray-600">Units</th>
                  <th className="text-right p-3 font-medium text-gray-600">Drive time</th>
                  <th className="text-right p-3 font-medium text-gray-600">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.listings.flatMap((listing) =>
                  listing.donation_plan.map((alloc, i) => {
                    const fb = fbById.get(alloc.food_bank_id);
                    return (
                      <tr key={`${listing.id}-${i}`} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-800">
                          <span className="font-medium">{listing.business_name}</span>
                        </td>
                        <td className="p-3 text-violet-700">
                          {alloc.name}
                          {fb && (
                            <span className="text-gray-400 text-xs ml-1">
                              (need: {fb.need_weight?.toFixed(3)})
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-medium text-emerald-700">{alloc.qty}</td>
                        <td className="p-3 text-right text-gray-500">
                          {alloc.duration_minutes != null ? `${alloc.duration_minutes} min` : "—"}
                        </td>
                        <td className="p-3 text-right text-gray-400">
                          {alloc.score != null ? alloc.score.toFixed(4) : "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
                {data.listings.every((l) => l.donation_plan.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-400">
                      No allocation data yet. Run the seed script first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
