export interface AllocationItem {
  food_bank_id: string;
  name: string;
  address?: string;
  qty: number;
  duration_minutes: number | null;
  score: number | null;
}

export interface SimListing {
  id: string;
  title: string;
  business_name: string;
  location: { type: "Point"; coordinates: [number, number] } | null;
  qty_available: number;
  donate_percent: number;
  donation_plan: AllocationItem[];
}

export interface SimFoodBank {
  id: string;
  name: string;
  address: string;
  location: { type: "Point"; coordinates: [number, number] } | null;
  need_weight: number;
  total_incoming: number;
}

export interface SimulationData {
  listings: SimListing[];
  food_banks: SimFoodBank[];
}

export async function getSimulation(): Promise<SimulationData> {
  const res = await fetch("/api/simulation");
  if (!res.ok) throw new Error(`GET /api/simulation → ${res.status}`);
  return res.json();
}
