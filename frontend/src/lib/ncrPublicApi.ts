import { API_BASE_URL } from "@/config/api";

export type NcrCityLaunchPolicy = {
  name: string;
  slug: string;
  state?: string | null;
  city_type?: string | null;
  is_indexable: boolean;
  is_sitemap_approved: boolean;
  is_review_only: boolean;
  canonical_url: string;
  indexing_policy: "approved_city_sitemap" | "held_noindex_until_approved" | string;
  approved_society_count: number;
};

export function fallbackNcrCityLaunchPolicy(slug: string): NcrCityLaunchPolicy {
  const cleanSlug = String(slug || "").trim().replace(/^\/+|\/+$/g, "");

  return {
    name: cleanSlug || "NCR City",
    slug: cleanSlug,
    state: null,
    city_type: null,
    is_indexable: false,
    is_sitemap_approved: false,
    is_review_only: true,
    canonical_url: cleanSlug ? `/ncr/${cleanSlug}` : "/ncr-preview",
    indexing_policy: "held_noindex_until_approved",
    approved_society_count: 0,
  };
}

export async function fetchNcrCityLaunchPolicy(slug: string): Promise<NcrCityLaunchPolicy> {
  const cleanSlug = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
  if (!cleanSlug) return fallbackNcrCityLaunchPolicy(cleanSlug);

  const response = await fetch(`${API_BASE_URL}/ncr/cities/${encodeURIComponent(cleanSlug)}/launch-policy`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.data) {
    return fallbackNcrCityLaunchPolicy(cleanSlug);
  }

  return {
    ...fallbackNcrCityLaunchPolicy(cleanSlug),
    ...payload.data,
    is_indexable: Boolean(payload.data.is_indexable),
    is_sitemap_approved: Boolean(payload.data.is_sitemap_approved),
    is_review_only: !Boolean(payload.data.is_indexable),
    approved_society_count: Number(payload.data.approved_society_count || 0),
  };
}
