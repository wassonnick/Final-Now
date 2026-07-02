import { API_BASE_URL } from '@/config/api';

export type PublishedSeoOverride = {
  seo_title?: string;
  seo_description?: string;
  seo_h1?: string;
  intro_summary?: string;
  schema?: unknown;
  canonical_url?: string;
};

export async function fetchPublishedSeoOverride(path: string): Promise<PublishedSeoOverride | null> {
  const response = await fetch(`${API_BASE_URL}/seo/pages/resolve?path=${encodeURIComponent(path)}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) return null;
  const payload = await response.json().catch(() => ({}));
  return payload?.data || null;
}
