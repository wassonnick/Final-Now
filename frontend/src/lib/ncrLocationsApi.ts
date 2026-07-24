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

export type NcrLocationAuditBucket = {
  total: number;
  missing_city_id: number;
  mapped_city_id: number;
  public_missing_city_id?: number;
  gurgaon_text_without_city_id?: number;
  has_target_city_without_city_id?: number;
  missing_target_city_id?: number;
  mapped_target_city_id?: number;
  gurgaon_target_without_city_id?: number;
  top_unmapped_city_text?: Array<{ label: string; total: number }>;
  top_unmapped_target_city_text?: Array<{ label: string; total: number }>;
};

export type NcrLocationAuditResponse = {
  enabled: boolean;
  data: {
    summary: {
      regions: number;
      cities: number;
      zones: number;
      localities: number;
    };
    societies: NcrLocationAuditBucket;
    properties: NcrLocationAuditBucket;
    leads: NcrLocationAuditBucket;
    verified_import_jobs: NcrLocationAuditBucket;
    city_readiness: Array<{
      city_id: number;
      name: string;
      slug: string;
      state?: string | null;
      city_type?: string | null;
      zones_count: number;
      localities_count: number;
      published_localities_count: number;
      public_societies_count: number;
      draft_societies_count: number;
      public_properties_count: number;
      verified_import_jobs_count: number;
      unmapped_public_rows_count: number;
      content_ready: boolean;
      indexing_approved: boolean;
      ready_for_public_rollout: boolean;
      recommended_status: string;
      next_actions: string[];
    }>;
    recommendation: {
      ready_for_public_city_filters: boolean;
      message: string;
    };
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

export async function fetchNcrLocationAudit(): Promise<NcrLocationAuditResponse> {
  const response = await adminFetch("/admin/locations/audit");
  const payload = await json(response);

  return payload as NcrLocationAuditResponse;
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
