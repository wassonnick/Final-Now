import { adminFetch } from "@/lib/adminApi";
import { API_BASE_URL } from "@/config/api";

export type ContributorRole = "resident" | "owner" | "rwa" | "builder";

export type RoleStatement = { role: ContributorRole; statement: string };

export type ImageContribution = {
  id: number;
  society_id: number;
  society?: { id: number; name: string; slug: string; city?: string | null } | null;
  contributor_role: ContributorRole | "staff";
  contributor_name?: string | null;
  contributor_email?: string | null;
  contributor_phone?: string | null;
  caption?: string | null;
  image_url?: string | null;
  width: number;
  height: number;
  rights_granted: boolean;
  rights_statement?: string | null;
  status: "pending" | "approved" | "rejected";
  screen?: { verdict?: string; reasons?: string[]; note?: string | null } | null;
  review_notes?: string | null;
  used_as_cover: boolean;
  created_at?: string | null;
};

export const ROLE_LABELS: Record<string, string> = {
  resident: "Resident",
  owner: "Owner",
  rwa: "RWA representative",
  builder: "Developer",
  staff: "SocietyFlats",
};

export async function fetchRoleStatements(): Promise<RoleStatement[]> {
  const response = await fetch(`${API_BASE_URL}/society-image-contributions/roles`);
  if (!response.ok) throw new Error("Could not load the contribution options.");
  return ((await response.json())?.roles || []) as RoleStatement[];
}

/** Public intake. Multipart, so no JSON content-type is set by hand. */
export async function contributeSocietyImage(
  societySlugOrId: string | number,
  form: FormData,
  token?: string,
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/societies/${societySlugOrId}/image-contributions`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const firstError = body?.errors ? Object.values(body.errors as Record<string, string[]>)[0]?.[0] : null;
    throw new Error(String(firstError || body?.message || "Your photo could not be uploaded."));
  }
  return body as { message: string };
}

async function adminJson(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body?.message || fallback));
  return body;
}

export async function fetchContributions(status = "pending"): Promise<{
  contributions: ImageContribution[];
  counts: { pending: number; approved: number; rejected: number };
}> {
  const response = await adminFetch(`/admin/image-contributions?status=${encodeURIComponent(status)}`);
  return (await adminJson(response, "Contributions could not be loaded.")) as {
    contributions: ImageContribution[];
    counts: { pending: number; approved: number; rejected: number };
  };
}

export async function approveContribution(id: number, asCover: boolean, notes?: string) {
  const response = await adminFetch(`/admin/image-contributions/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ as_cover: asCover, review_notes: notes || null }),
  });
  return adminJson(response, "Approval failed.");
}

export async function rejectContribution(id: number, notes?: string) {
  const response = await adminFetch(`/admin/image-contributions/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ review_notes: notes || null }),
  });
  return adminJson(response, "Rejection failed.");
}

export async function screenContribution(id: number) {
  const response = await adminFetch(`/admin/image-contributions/${id}/screen`, { method: "POST" });
  return adminJson(response, "Screening failed.");
}
