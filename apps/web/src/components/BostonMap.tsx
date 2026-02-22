/**
 * Boston map: Leaflet + CartoDB Positron (light, minimal tiles).
 * Custom circle markers, debounced bounds callback.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MarketListing } from "../api/market";

const BOSTON_CENTER: [number, number] = [42.3601, -71.0589];
const DEFAULT_ZOOM = 13;

let mapInstanceId = 0;

// Minimal green circle marker
const circleIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:14px;height:14px;
    background:#16a34a;
    border:2.5px solid #fff;
    border-radius:50%;
    box-shadow:0 1px 4px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -10],
});

type Bounds = { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number };

type Props = {
  listings: MarketListing[];
  onBoundsChange: (bounds: Bounds) => void;
  debounceMs?: number;
};

function MapController({ onBoundsChange, debounceMs = 400 }: { onBoundsChange: Props["onBoundsChange"]; debounceMs: number }) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const map = useMapEvents({
    moveend() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        onBoundsChange({ sw_lat: b.getSouthWest().lat, sw_lng: b.getSouthWest().lng, ne_lat: b.getNorthEast().lat, ne_lng: b.getNorthEast().lng });
      }, debounceMs);
    },
  });
  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange({ sw_lat: b.getSouthWest().lat, sw_lng: b.getSouthWest().lng, ne_lat: b.getNorthEast().lat, ne_lng: b.getNorthEast().lng });
  }, []);
  return null;
}

export function BostonMap({ listings, onBoundsChange, debounceMs = 400 }: Props) {
  const [mapKey, setMapKey] = useState(0);
  const listingsWithLocation = listings.filter((l) => l.location?.coordinates?.length === 2);

  useEffect(() => {
    mapInstanceId += 1;
    setMapKey(mapInstanceId);
  }, []);

  if (mapKey === 0) return <div className="w-full h-full bg-gray-100" />;

  return (
    <MapContainer
      key={mapKey}
      center={BOSTON_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
      zoomControl={false}
    >
      {/* CartoDB Positron — clean light gray tiles, no API key needed */}
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <MapController onBoundsChange={onBoundsChange} debounceMs={debounceMs} />
      {listingsWithLocation.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.location!.coordinates[1], listing.location!.coordinates[0]]}
          icon={circleIcon}
        >
          <Popup closeButton={false} className="minimal-popup">
            <div style={{ minWidth: 160 }}>
              <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{listing.business_name}</p>
              <p style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>{listing.title}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: "#16a34a", fontSize: 13 }}>${(listing.price_cents / 100).toFixed(2)}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{listing.qty_available} left</span>
              </div>
              <Link
                to={`/listing/m/${listing.id}`}
                style={{ display: "block", textAlign: "center", background: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 600, padding: "5px 0", borderRadius: 8, textDecoration: "none" }}
              >
                Reserve
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
