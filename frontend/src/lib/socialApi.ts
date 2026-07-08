import { adminFetch } from "@/lib/adminApi";

export type SocialAsset = {
  id: number;
  social_post_id?: number | null;
  asset_type: string;
  platform?: string | null;
  image_prompt?: string | null;
  revised_prompt?: string | null;
  public_url?: string | null;
  status: string;
  risk_level: string;
  ai_model?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  post?: SocialPost;
};

export type SocialPost = {
  id: number;
  platform: string;
  post_type: string;
  title?: string | null;
  hook?: string | null;
  caption: string;
  cta?: string | null;
  hashtags?: string[] | null;
  creative_prompt?: string | null;
  image_prompt?: string | null;
  image_style?: string | null;
  carousel_slides?: Array<{ slide?: number; heading?: string; body?: string; image_prompt?: string }> | null;
  reel_script?: string | null;
  source_type?: string | null;
  source_id?: number | null;
  risk_level: string;
  status: string;
  scheduled_at?: string | null;
  created_at?: string;
  assets?: SocialAsset[];
};

export type SocialAccount = {
  id: number;
  platform: string;
  account_name?: string | null;
  account_handle?: string | null;
  status: string;
  token_expires_at?: string | null;
  scopes?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

async function json(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Request failed: ${response.status}`);
  return body;
}

function unwrapList<T>(body: any): T[] {
  return body?.data?.data || body?.data || [];
}

export const fetchSocialContext = () => adminFetch("/admin/ai/social/context").then(json);
export const fetchSocialPosts = (params = "") => adminFetch(`/admin/social/posts${params ? `?${params}` : ""}`).then(json).then((body) => unwrapList<SocialPost>(body));
export const fetchSocialAssets = (params = "") => adminFetch(`/admin/social/assets${params ? `?${params}` : ""}`).then(json).then((body) => unwrapList<SocialAsset>(body));
export const fetchSocialAccounts = () => adminFetch("/admin/social/accounts").then(json).then((body) => body.data as SocialAccount[]);

export const generateSocialPosts = (payload: Record<string, unknown>) =>
  adminFetch("/admin/social/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(json);

export const updateSocialPost = (id: number, payload: Record<string, unknown>) =>
  adminFetch(`/admin/social/posts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(json);

export const approveSocialPost = (id: number) => adminFetch(`/admin/social/posts/${id}/approve`, { method: "POST" }).then(json);
export const rejectSocialPost = (id: number) => adminFetch(`/admin/social/posts/${id}/reject`, { method: "POST" }).then(json);
export const generateSocialPostImage = (id: number) => adminFetch(`/admin/social/posts/${id}/generate-image`, { method: "POST" }).then(json);

export const updateSocialAsset = (id: number, payload: Record<string, unknown>) =>
  adminFetch(`/admin/social/assets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(json);

export const approveSocialAsset = (id: number) => adminFetch(`/admin/social/assets/${id}/approve`, { method: "POST" }).then(json);
export const rejectSocialAsset = (id: number) => adminFetch(`/admin/social/assets/${id}/reject`, { method: "POST" }).then(json);
