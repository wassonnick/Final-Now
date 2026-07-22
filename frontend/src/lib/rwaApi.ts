import { adminFetch } from "@/lib/adminApi";
import { API_BASE_URL } from "@/config/api";

export type RwaSociety = {
  id: number;
  name: string;
  slug: string;
  builder?: string | null;
  sector?: string | null;
  locality?: string | null;
  city?: string | null;
  state?: string | null;
  score?: number | string | null;
};

export type RwaClaim = {
  id: number;
  society_id?: number;
  organisation_name: string;
  representative_name?: string | null;
  representative_role?: string | null;
  phone?: string | null;
  email?: string | null;
  proof_notes?: string | null;
  registration_number?: string | null;
  official_website?: string | null;
  official_email?: string | null;
  authorization_proof_url?: string | null;
  review_notes?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  reviewed_at?: string | null;
  society?: RwaSociety | null;
  account?: { id: number; phone?: string | null; name?: string | null } | null;
  announcements?: RwaAnnouncement[];
};

export type RwaAnnouncement = {
  id: number;
  title: string;
  category?: string | null;
  content: string;
  status?: string | null;
  published_at?: string | null;
  society?: RwaSociety | null;
  claim?: RwaClaim | null;
};

export type RwaReply = {
  id: number;
  body: string;
  status: string;
  is_official?: boolean;
  published_at?: string | null;
  claim?: RwaClaim | null;
  account?: { id: number; name?: string | null; phone?: string | null } | null;
  thread?: RwaThread | null;
};

export type RwaThread = {
  id: number;
  type: "question" | "discussion" | "grievance" | string;
  category?: string | null;
  title: string;
  body: string;
  visibility?: string | null;
  priority?: string | null;
  status: "pending" | "approved" | "rejected" | "resolved" | string;
  reply_count?: number;
  published_at?: string | null;
  resolved_at?: string | null;
  society?: RwaSociety | null;
  claim?: RwaClaim | null;
  replies?: RwaReply[];
};

export type RwaPublicResponse = {
  society: RwaSociety;
  rwa?: Pick<RwaClaim, "id" | "organisation_name" | "representative_role" | "reviewed_at"> | null;
  announcements: RwaAnnouncement[];
  threads: RwaThread[];
  stats: {
    announcements?: number;
    open_threads?: number;
    resolved_threads?: number;
    claim_status?: string;
  };
};

export type RwaDashboardResponse = {
  account?: unknown;
  claims: RwaClaim[];
  threads: RwaThread[];
  replies: RwaReply[];
};

async function parseJson(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(json?.message || `Request failed: ${response.status}`));
  return json;
}

export async function fetchRwaSociety(idOrSlug: string) {
  const response = await fetch(`${API_BASE_URL}/rwa/societies/${encodeURIComponent(idOrSlug)}`, {
    headers: { Accept: "application/json" },
  });
  const json = await parseJson(response);
  return json.data as RwaPublicResponse;
}

export async function submitRwaThread(
  idOrSlug: string,
  payload: { type: string; category?: string; title: string; body: string; visibility?: string; priority?: string },
  token?: string | null,
) {
  const response = await fetch(`${API_BASE_URL}/rwa/societies/${encodeURIComponent(idOrSlug)}/threads`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function fetchRwaDashboard(token: string) {
  const response = await fetch(`${API_BASE_URL}/accounts/rwa/dashboard`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  const json = await parseJson(response);
  return json.data as RwaDashboardResponse;
}

export async function submitRwaClaim(
  token: string,
  payload: {
    society_id: number;
    organisation_name: string;
    representative_name: string;
    representative_role: string;
    phone: string;
    email?: string;
    proof_notes: string;
  },
) {
  const response = await fetch(`${API_BASE_URL}/accounts/rwa/claims`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function submitRwaAnnouncement(
  token: string,
  claimId: number,
  payload: { title: string; content: string; category?: string },
) {
  const response = await fetch(`${API_BASE_URL}/accounts/rwa/claims/${claimId}/announcements`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function submitRwaReply(token: string, threadId: number, body: string) {
  const response = await fetch(`${API_BASE_URL}/rwa/threads/${threadId}/replies`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ body }),
  });
  return parseJson(response);
}

export async function resolveRwaThread(token: string, threadId: number) {
  const response = await fetch(`${API_BASE_URL}/accounts/rwa/threads/${threadId}/resolve`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  return parseJson(response);
}

export async function adminListRwaClaims() {
  const response = await adminFetch("/admin/rwa-claims");
  const json = await parseJson(response);
  return (json.data || []) as RwaClaim[];
}

export async function adminListRwaThreads() {
  const response = await adminFetch("/admin/rwa-threads");
  const json = await parseJson(response);
  return (json.data || []) as RwaThread[];
}

export async function adminListRwaReplies() {
  const response = await adminFetch("/admin/rwa-replies");
  const json = await parseJson(response);
  return (json.data || []) as RwaReply[];
}

export async function adminUpdateRwaClaim(id: number, payload: { status: string; review_notes?: string }) {
  const response = await adminFetch(`/admin/rwa-claims/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function adminUpdateRwaThread(id: number, payload: { status: string; moderation_notes?: string; resolved?: boolean }) {
  const response = await adminFetch(`/admin/rwa-threads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}

export async function adminUpdateRwaReply(id: number, payload: { status: string; moderation_notes?: string }) {
  const response = await adminFetch(`/admin/rwa-replies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson(response);
}
