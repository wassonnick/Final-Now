import { apiClient, extractList } from '../client';
import { Society } from '../../types/domain';

export const societyService = {
  async list(params?: { q?: string; per_page?: number }): Promise<Society[]> {
    const response = await apiClient.get('/societies', { params: { per_page: 12, ...params } });
    return extractList<Society>(response.data).map(normalizeSociety);
  },
  async show(slug: string): Promise<Society> {
    const response = await apiClient.get(`/societies/${encodeURIComponent(slug)}`);
    return normalizeSociety((response.data as { data?: unknown }).data ?? response.data);
  },
};

function normalizeSociety(raw: any): Society {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    builder: raw.builder || raw.builder_name || raw.developer_name,
    sector: raw.sector,
    locality: raw.locality,
    city: raw.city,
    score: raw.score,
    imageUrl: raw.cover_image_url || raw.image_url || raw.hero_image_url,
    status: raw.status,
  };
}
