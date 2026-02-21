import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: baseURL.replace(/\/api\/?$/, "") + "/api",
  headers: { "Content-Type": "application/json" },
});

export type Listing = {
  id: number;
  business_id: number;
  business_name: string;
  item_name: string;
  total_qty: number;
  partner_qty: number;
  public_qty: number;
  available_qty: number;
  standard_price: number;
  ebt_price: number | null;
  retail_value: number | null;
  snap_eligible: boolean;
  request_deadline: string | null;
  pickup_start: string | null;
  pickup_end: string | null;
  address: string | null;
};

export type Request = {
  id: number;
  listing_id: number;
  user_id: number;
  status: string;
  payment_method: string | null;
  listing: Listing | null;
  created_at: string | null;
};

export type User = {
  id: number;
  email: string;
  role: string;
  business_name: string | null;
  pickups_last_7_days: number;
  no_show_count: number;
};

export async function getMarket(): Promise<Listing[]> {
  const { data } = await api.get<Listing[]>("/market");
  return data;
}

export async function getListing(id: number): Promise<Listing> {
  const { data } = await api.get<Listing>(`/listings/${id}`);
  return data;
}

export async function createRequest(
  listingId: number,
  payload: { user_id: number; payment_method?: string }
): Promise<Request> {
  const { data } = await api.post<Request>(
    `/listings/${listingId}/request`,
    payload
  );
  return data;
}

export async function getOrders(userId: number): Promise<Request[]> {
  const { data } = await api.get<Request[]>("/orders", {
    params: { user_id: userId },
  });
  return data;
}

export async function createListing(payload: {
  business_id: number;
  item_name: string;
  total_qty: number;
  public_qty: number;
  standard_price: number;
  ebt_price?: number;
  retail_value?: number;
  snap_eligible?: boolean;
  address?: string;
  partner_qty?: number;
}): Promise<Listing> {
  const { data } = await api.post<Listing>("/listings", payload);
  return data;
}

export async function getListings(businessId: number): Promise<Listing[]> {
  const { data } = await api.get<Listing[]>("/listings", {
    params: { business_id: businessId },
  });
  return data;
}

export async function updateListing(
  id: number,
  payload: Partial<{
    item_name: string;
    total_qty: number;
    public_qty: number;
    standard_price: number;
    ebt_price: number;
    retail_value: number;
    snap_eligible: boolean;
    address: string;
  }>
): Promise<Listing> {
  const { data } = await api.patch<Listing>(`/listings/${id}`, payload);
  return data;
}

export async function getRequests(businessId: number): Promise<Request[]> {
  const { data } = await api.get<Request[]>("/requests", {
    params: { business_id: businessId },
  });
  return data;
}

export async function allocateListing(listingId: number): Promise<{
  allocated: number;
  allocations: unknown[];
}> {
  const { data } = await api.post(`/listings/${listingId}/allocate`);
  return data;
}

export async function createUser(payload: {
  email: string;
  role: string;
  business_name?: string;
}): Promise<User> {
  const { data } = await api.post<User>("/users", payload);
  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>("/users");
  return data;
}
