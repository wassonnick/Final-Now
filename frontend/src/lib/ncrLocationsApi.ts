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

export async function fetchNcrLocations(): Promise<NcrLocationsResponse> {
  const response = await adminFetch("/admin/locations");
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "Unable to load NCR locations.");
  }

  return json as NcrLocationsResponse;
}
