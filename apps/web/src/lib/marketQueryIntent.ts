import type { Bounds } from "../api/market";

const DEFAULT_RADIUS_KM = 2.5;

const NEIGHBORHOOD_CENTERS: Record<string, { lat: number; lng: number; radiusKm?: number }> = {
  fenway: { lat: 42.3467, lng: -71.0972, radiusKm: 2.2 },
  "back bay": { lat: 42.3503, lng: -71.081, radiusKm: 2.2 },
  beacon: { lat: 42.3574, lng: -71.0693, radiusKm: 1.8 },
  allston: { lat: 42.3549, lng: -71.1326, radiusKm: 2.5 },
  brighton: { lat: 42.3489, lng: -71.1577, radiusKm: 2.8 },
  cambridge: { lat: 42.3736, lng: -71.1097, radiusKm: 3.5 },
  somerville: { lat: 42.3876, lng: -71.0995, radiusKm: 3.2 },
  downtown: { lat: 42.3551, lng: -71.0656, radiusKm: 1.9 },
  "south end": { lat: 42.3398, lng: -71.0749, radiusKm: 2.0 },
};

export type ParsedIntent = {
  category?: string;
  minPriceDollars?: number;
  maxPriceDollars?: number;
  openNow?: boolean;
  bounds?: Bounds;
  nearMe?: boolean;
  radiusKm?: number;
  note?: string;
};

const CATEGORY_ALIASES: Record<string, string> = {
  bakery: "bakery",
  bread: "bakery",
  pastries: "bakery",
  pastry: "bakery",
  cafe: "cafe",
  coffee: "cafe",
  pizza: "pizza",
  sushi: "sushi",
  vegan: "vegan",
  vegetarian: "vegetarian",
  dessert: "dessert",
  groceries: "grocery",
  grocery: "grocery",
};

function detectCategory(text: string): string | undefined {
  const hit = Object.keys(CATEGORY_ALIASES).find((key) => text.includes(key));
  return hit ? CATEGORY_ALIASES[hit] : undefined;
}

export function toBoundsFromCenter(lat: number, lng: number, radiusKm: number): Bounds {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(Math.cos((lat * Math.PI) / 180), 0.1));
  return {
    sw_lat: lat - latDelta,
    sw_lng: lng - lngDelta,
    ne_lat: lat + latDelta,
    ne_lng: lng + lngDelta,
  };
}

export function detectRadiusKm(text: string): number {
  const miMatch = text.match(/within\s+(\d+(?:\.\d+)?)\s*(?:mi|mile|miles)\b/);
  if (miMatch) return Math.max(parseFloat(miMatch[1]) * 1.60934, 0.5);

  const kmMatch = text.match(/within\s+(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometers)\b/);
  if (kmMatch) return Math.max(parseFloat(kmMatch[1]), 0.5);

  return DEFAULT_RADIUS_KM;
}

function detectPrice(text: string): Pick<ParsedIntent, "minPriceDollars" | "maxPriceDollars"> {
  const out: Pick<ParsedIntent, "minPriceDollars" | "maxPriceDollars"> = {};

  const between = text.match(
    /(?:between|from)\s*\$?(\d+(?:\.\d+)?)\s*(?:to|-|and)\s*\$?(\d+(?:\.\d+)?)/,
  );
  if (between) {
    out.minPriceDollars = Math.min(parseFloat(between[1]), parseFloat(between[2]));
    out.maxPriceDollars = Math.max(parseFloat(between[1]), parseFloat(between[2]));
    return out;
  }

  const under = text.match(/(?:under|below|less than|max(?:imum)?(?: price)?|up to)\s*\$?(\d+(?:\.\d+)?)/);
  if (under) out.maxPriceDollars = parseFloat(under[1]);

  const over = text.match(/(?:over|above|more than|min(?:imum)?(?: price)?|at least)\s*\$?(\d+(?:\.\d+)?)/);
  if (over) out.minPriceDollars = parseFloat(over[1]);

  if (text.includes("cheap") && out.maxPriceDollars == null) out.maxPriceDollars = 10;

  return out;
}

function detectNeighborhoodBounds(text: string): Bounds | undefined {
  const entry = Object.entries(NEIGHBORHOOD_CENTERS).find(([name]) => text.includes(name));
  if (!entry) return undefined;
  const [, center] = entry;
  return toBoundsFromCenter(center.lat, center.lng, center.radiusKm ?? DEFAULT_RADIUS_KM);
}

export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => reject(new Error("Geolocation permission denied")),
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
    );
  });
}

export async function parseMarketplaceQuery(query: string): Promise<ParsedIntent> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return {};

  const intent: ParsedIntent = {
    category: detectCategory(normalized),
    openNow: /\b(open now|open|available now)\b/.test(normalized) ? true : undefined,
    ...detectPrice(normalized),
  };

  const neighborhoodBounds = detectNeighborhoodBounds(normalized);
  if (neighborhoodBounds) {
    intent.bounds = neighborhoodBounds;
    return intent;
  }

  const nearMe = /\b(near me|nearby|around me)\b/.test(normalized);
  if (nearMe) {
    const radiusKm = detectRadiusKm(normalized);
    intent.nearMe = true;
    intent.radiusKm = radiusKm;
    try {
      const current = await getCurrentPosition();
      intent.bounds = toBoundsFromCenter(current.lat, current.lng, radiusKm);
    } catch {
      intent.note = "Could not access your location. Showing current map area instead.";
    }
  }

  return intent;
}
