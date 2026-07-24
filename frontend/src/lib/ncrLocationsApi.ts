import { adminFetch } from "@/lib/adminApi";

export type NcrRegion = {
  id: number;
  name: string;
  slug: string;
  country?: string;
  state_group?: string;
  is_active?: boolean;
};

export type NcrCity = {
  id: number;
  region_id?: number | null;
  name: string;
  slug: string;
  state?: string | null;
  city_type?: string | null;
  is_active?: boolean;
};

export type NcrZone = {
  id: number;
  region_id?: number | null;
  city_id?: number | null;
  name: string;
  slug: string;
  zone_type?: string | null;
  is_active?: boolean;
};

export type NcrLocality = {
  id: string;
  region_id?: number | null;
  city_id?: number | null;
  zone_id?: number | null;
  name: string;
  slug: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  locality_type?: string | null;
  sector_code?: string | null;
  published_status?: "draft" | "review" | "published" | "archived";
};

export type NcrLocationsResponse = {
  enabled: boolean;
  data: {
    regions: NcrRegion[];
    cities: NcrCity[];
    zones: NcrZone[];
    localities: NcrLocality[];
  };
};

async function json(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || Object.values(payload?.errors || {}).flat().join(" ") || "NCR location request failed.");
  }
  return payload;
}

export async function fetchNcrLocations(): Promise<NcrLocationsResponse> {
  const response = await adminFetch("/admin/locations");
  const payload = await json(response);

  return payload as NcrLocationsResponse;
}

export async function createNcrZone(payload: Record<string, unknown>): Promise<NcrZone> {
  const body = await adminFetch("/admin/locations/zones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(json);

  return body.data as NcrZone;
}

export async function createNcrLocality(payload: Record<string, unknown>): Promise<NcrLocality> {
  const body = await adminFetch("/admin/locations/localities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(json);

  return body.data as NcrLocality;
}
