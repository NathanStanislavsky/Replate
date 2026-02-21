/**
 * Business API (FastAPI): lookup by code, listings CRUD, orders. Uses X-Business-Id header.
 */
import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL != null
    ? String(import.meta.env.VITE_API_URL).replace(/\/api\/?$/, "") + "/api"
    : "/api";

export const businessApi = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

const BUSINESS_ID_KEY = "replate_business_id";

export function getStoredBusinessId(): string | null {
  return localStorage.getItem(BUSINESS_ID_KEY);
}

export function setStoredBusinessId(id: string): void {
  localStorage.setItem(BUSINESS_ID_KEY, id);
}

export function clearStoredBusinessId(): void {
  localStorage.removeItem(BUSINESS_ID_KEY);
}

businessApi.interceptors.request.use((config) => {
  const id = getStoredBusinessId();
  if (id) config.headers.set("X-Business-Id", id);
  return config;
});

export type BusinessLookup = { business_id: string; name: string };
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
  category?: string | null;
  location?: { type: "Point"; coordinates: [number, number] } | null;
  created_at?: string | null;
};
export type BusinessOrder = {
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

export async function businessLookup(business_code: string): Promise<BusinessLookup> {
  const { data } = await businessApi.get<BusinessLookup>("/business/lookup", {
    params: { business_code },
  });
  return data;
}

export async function businessListListings(): Promise<MarketListing[]> {
  const { data } = await businessApi.get<MarketListing[]>("/business/listings");
  return data;
}

export async function businessCreateListing(payload: {
  business_name: string;
  title: string;
  price_cents: number;
  qty_available: number;
  address?: string;
  pickup_start?: string;
  pickup_end?: string;
  category?: string;
}): Promise<MarketListing> {
  const { data } = await businessApi.post<MarketListing>("/business/listings", payload);
  return data;
}

export async function businessUpdateListing(
  id: string,
  payload: Partial<{
    title: string;
    price_cents: number;
    qty_available: number;
    pickup_start: string;
    pickup_end: string;
    address: string;
    category: string;
  }>
): Promise<MarketListing> {
  const { data } = await businessApi.patch<MarketListing>(`/business/listings/${id}`, payload);
  return data;
}

export async function businessListingOrders(listingId: string): Promise<BusinessOrder[]> {
  const { data } = await businessApi.get<BusinessOrder[]>(
    `/business/listings/${listingId}/orders`
  );
  return data;
}

export async function businessOrders(status?: string): Promise<BusinessOrder[]> {
  const { data } = await businessApi.get<BusinessOrder[]>("/business/orders", {
    params: status ? { status } : undefined,
  });
  return data;
}
