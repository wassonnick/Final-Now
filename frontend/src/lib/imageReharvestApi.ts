import { adminFetch } from "@/lib/adminApi";

export type ScreenVerdict = "ok" | "rejected" | "unknown";

export type ImageScreen = {
  verdict: ScreenVerdict;
  reasons: string[];
  note?: string | null;
  at?: string;
};

export type ReharvestResult = {
  society_id: number;
  name: string;
  status: "refreshed" | "no_candidates" | "all_rejected" | "failed";
  note: string;
  before: number;
  after: number;
  rejected: number;
  screened: number;
  republished: boolean;
};

export type ReharvestRun = {
  id: number;
  scope: string;
  queued: number;
  completed: number;
  refreshed: number;
  republished: number;
  rejected_images: number;
  no_candidates: number;
  failed: number;
  screen_images: boolean;
  republish_cover: boolean;
  results: Array<ReharvestResult & { at?: string }> | null;
  finished_at?: string | null;
  created_at?: string | null;
};

export type ReharvestScope = "selection" | "missing_images" | "unscreened" | "all";

async function json(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body?.message || fallback));
  return body;
}

export async function reharvestSociety(
  societyId: number,
  options: { screen?: boolean; republish?: boolean } = {},
): Promise<ReharvestResult> {
  const response = await adminFetch(`/admin/societies/${societyId}/reharvest-images`, {
    method: "POST",
    body: JSON.stringify({ screen: options.screen ?? true, republish: options.republish ?? true }),
  });
  return (await json(response, "Re-harvest failed.")).result as ReharvestResult;
}

export async function startReharvestRun(payload: {
  scope: ReharvestScope;
  society_ids?: number[];
  city_id?: number | null;
  limit?: number;
  screen?: boolean;
  republish?: boolean;
}): Promise<ReharvestRun> {
  const response = await adminFetch("/admin/image-reharvest/runs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return (await json(response, "Bulk re-harvest could not be started.")).run as ReharvestRun;
}

export async function fetchReharvestRun(id: number): Promise<{ run: ReharvestRun; finished: boolean }> {
  const response = await adminFetch(`/admin/image-reharvest/runs/${id}`);
  return (await json(response, "Run could not be loaded.")) as { run: ReharvestRun; finished: boolean };
}

export async function fetchReharvestRuns(): Promise<ReharvestRun[]> {
  const response = await adminFetch("/admin/image-reharvest/runs");
  return ((await json(response, "Runs could not be loaded.")).runs || []) as ReharvestRun[];
}

const REASON_LABELS: Record<string, string> = {
  overlaid_text: "Text on image",
  phone_number: "Phone number",
  people: "People",
  floor_plan: "Floor plan",
  document: "Document",
  screenshot: "Screenshot",
  logo: "Logo",
  collage: "Collage",
  off_topic: "Not the property",
  low_quality: "Too dark/blurry",
};

export function screenReasonLabel(reason: string) {
  return REASON_LABELS[reason] || reason.replace(/_/g, " ");
}

export type PlacesDiagnostic = {
  key_configured: boolean;
  key_length: number;
  key_tail?: string | null;
  query: { name: string; location: string };
  resolve?: {
    matched: boolean;
    reason?: string | null;
    place_id?: string | null;
    photo_reference_count: number;
    first_reference_length: number;
    first_reference_head?: string | null;
  };
  photo?: {
    request_url?: string;
    status?: number;
    content_type?: string;
    bytes?: number;
    is_image?: boolean;
    body_head?: string | null;
    error?: string;
  };
  street_view?: { checked: boolean; status?: string; usable?: boolean; note: string };
  verdict: string;
};

export async function runPlacesDiagnostic(name?: string, location?: string): Promise<PlacesDiagnostic> {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  if (location) params.set("location", location);
  const response = await adminFetch(`/admin/diagnostics/google-places?${params.toString()}`);
  return (await json(response, "Diagnostic could not be run.")) as PlacesDiagnostic;
}
