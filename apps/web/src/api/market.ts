/**
 * API for FastAPI + MongoDB market: bounds-based map, reserve, pickup.
 * Types match TGTG V1 Boston (price_cents, GeoJSON location).
 */
import axios from "axios";
import { getApiBaseUrl } from "./baseUrl";

const baseURL = getApiBaseUrl();

export const marketApi = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export type GeoPoint = {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
};

export type MarketListing = {
  id: string;
  business_id: string;
  business_name: string;
  title: string;
  price_cents: number;
  qty_available: number;
  pickup_start?: string | null;
  pickup_end?: string | null;
  status: string;
  address?: string | null;
  location?: GeoPoint | null;
  created_at?: string | null;
};

export type MarketOrder = {
  id: string;
  listing_id: string;
  business_id?: string | null;
  user_name: string;
  status: string;
  qr_token: string;
  created_at?: string | null;
  picked_up_at?: string | null;
  canceled_at?: string | null;
};

export type Bounds = {
  sw_lat: number;
  sw_lng: number;
  ne_lat: number;
  ne_lng: number;
};

export type MarketFilters = {
  open_now?: boolean;
  min_price_cents?: number;
  max_price_cents?: number;
  category?: string;
};

export type MarketIntent = {
  category?: string | null;
  min_price_cents?: number | null;
  max_price_cents?: number | null;
  open_now?: boolean | null;
  near_me?: boolean | null;
  radius_km?: number | null;
  bounds?: Bounds | null;
  note?: string | null;
};

export async function getMarketWithBounds(
  bounds: Bounds | null,
  filters?: MarketFilters
): Promise<MarketListing[]> {
  const params: Record<string, string | number | boolean | undefined> =
    bounds != null
      ? {
          sw_lat: bounds.sw_lat,
          sw_lng: bounds.sw_lng,
          ne_lat: bounds.ne_lat,
          ne_lng: bounds.ne_lng,
        }
      : {};
  if (filters?.open_now) params.open_now = true;
  if (filters?.min_price_cents != null) params.min_price_cents = filters.min_price_cents;
  if (filters?.max_price_cents != null) params.max_price_cents = filters.max_price_cents;
  if (filters?.category) params.category = filters.category;
  const { data } = await marketApi.get<MarketListing[]>("/market", { params });
  return data;
}

export async function parseMarketIntent(query: string): Promise<MarketIntent> {
  const { data } = await marketApi.post<MarketIntent>("/market/intent", { query });
  return data;
}

export async function getListingById(id: string): Promise<MarketListing> {
  const { data } = await marketApi.get<MarketListing>(`/listings/${id}`);
  return data;
}

export async function reserveListing(
  listingId: string,
  user_name: string
): Promise<{ id: string; qr_token: string; status: string }> {
  const { data } = await marketApi.post(`/listings/${listingId}/reserve`, {
    user_name,
  });
  return data;
}

export async function getBuyerOrders(
  user_name: string,
  status?: string
): Promise<MarketOrder[]> {
  const { data } = await marketApi.get<MarketOrder[]>("/orders", {
    params: status ? { user_name, status } : { user_name },
  });
  return data;
}

export async function createMarketListing(payload: {
  business_id: string;
  business_name: string;
  title: string;
  price_cents: number;
  qty_available: number;
  address?: string;
  pickup_start?: string;
  pickup_end?: string;
}): Promise<MarketListing> {
  const { data } = await marketApi.post<MarketListing>("/listings", payload);
  return data;
}
