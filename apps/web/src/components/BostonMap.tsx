/**
 * Boston map: Leaflet + OSM. Center 42.3601, -71.0589, zoom 13.
 * Calls onBoundsChange when map moves (debounced). Renders markers for listings with location.
 * Uses a unique key per mount so Leaflet always gets a fresh container (avoids
 * "Map container is already initialized" under React Strict Mode).
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MarketListing } from "../api/market";

const BOSTON_CENTER: [number, number] = [42.3601, -71.0589];
const DEFAULT_ZOOM = 13;

// Unique id per map instance so React never reuses the MapContainer DOM (fixes Strict Mode).
let mapInstanceId = 0;

// Fix default marker icons in Leaflet with bundlers
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Props = {
  listings: MarketListing[];
  onBoundsChange: (bounds: {
    sw_lat: number;
    sw_lng: number;
    ne_lat: number;
    ne_lng: number;
  }) => void;
  debounceMs?: number;
};

function MapController({
  onBoundsChange,
  debounceMs = 400,
}: {
  onBoundsChange: Props["onBoundsChange"];
  debounceMs: number;
}) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const map = useMapEvents({
    moveend() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        onBoundsChange({
          sw_lat: b.getSouthWest().lat,
          sw_lng: b.getSouthWest().lng,
          ne_lat: b.getNorthEast().lat,
          ne_lng: b.getNorthEast().lng,
        });
      }, debounceMs);
    },
  });
  useEffect(() => {
    const b = map.getBounds();
    onBoundsChange({
      sw_lat: b.getSouthWest().lat,
      sw_lng: b.getSouthWest().lng,
      ne_lat: b.getNorthEast().lat,
      ne_lng: b.getNorthEast().lng,
    });
  }, []);
  return null;
}

export function BostonMap({ listings, onBoundsChange, debounceMs = 400 }: Props) {
  const [mapKey, setMapKey] = useState(0);
  const listingsWithLocation = listings.filter(
    (l) => l.location?.coordinates?.length === 2
  );

  useEffect(() => {
    mapInstanceId += 1;
    setMapKey(mapInstanceId);
  }, []);

  if (mapKey === 0) {
    return (
      <div className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-200 z-0" />
    );
  }

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-200 z-0">
      <MapContainer
        key={mapKey}
        center={BOSTON_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController onBoundsChange={onBoundsChange} debounceMs={debounceMs} />
        {listingsWithLocation.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.location!.coordinates[1], listing.location!.coordinates[0]]}
            icon={icon}
          >
            <Popup>
              <div className="text-sm">
                <strong>{listing.business_name}</strong>
                <br />
                {listing.title} · ${(listing.price_cents / 100).toFixed(2)}
                <br />
                <Link to={`/listing/m/${listing.id}`}>View & reserve</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
