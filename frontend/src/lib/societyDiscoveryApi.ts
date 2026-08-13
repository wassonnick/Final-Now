import { adminFetch } from "@/lib/adminApi";

export type DiscoveryStatus = "new" | "likely_duplicate" | "dismissed" | "imported";

export type DiscoveryCandidate = {
  id: number;
  place_id: string;
  name: string;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  rating_count?: number | null;
  status: DiscoveryStatus;
  status_reason?: string | null;
  society_id?: number | null;
  society?: { id: number; name: string; slug: string } | null;
  locality?: string | null;
  import_job?: { id: number; status: string; result_society_id?: number | null } | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
};

export type DiscoveryArea = { area: string; c: number };

export type DiscoveryIndex = {
  configured: boolean;
  counts: Record<string, number>;
  areas: DiscoveryArea[];
  candidates: DiscoveryCandidate[];
};

export type ScanResult = {
  status: string;
  area: string;
  scanned: number;
  new: number;
  likely_duplicate: number;
  known: number;
  rejected: number;
  message?: string;
};

async function json(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body?.result?.message || body?.message || fallback));
  return body;
}

export async function fetchDiscovery(status = "open", area = ""): Promise<DiscoveryIndex> {
  const params = new URLSearchParams({ status });
  if (area) params.set("area", area);
  return (await json(await adminFetch(`/admin/discovery/candidates?${params}`), "Could not load the discovery queue.")) as DiscoveryIndex;
}

export async function scanArea(area: string, cityId?: number | null): Promise<ScanResult> {
  const response = await adminFetch("/admin/discovery/scan", {
    method: "POST",
    body: JSON.stringify({ area, city_id: cityId ?? null }),
  });
  return (await json(response, "The scan failed.")).result as ScanResult;
}

export async function dismissCandidate(id: number, reason: string) {
  return json(await adminFetch(`/admin/discovery/candidates/${id}/dismiss`, { method: "POST", body: JSON.stringify({ reason }) }), "Could not dismiss.");
}

export async function restoreCandidate(id: number) {
  return json(await adminFetch(`/admin/discovery/candidates/${id}/restore`, { method: "POST" }), "Could not restore.");
}

export async function importCandidate(id: number, publish: boolean) {
  return json(await adminFetch(`/admin/discovery/candidates/${id}/import`, { method: "POST", body: JSON.stringify({ publish }) }), "Could not queue the import.");
}
