import { apiClient, extractList } from '../client';
import { Society } from '../../types/domain';
import { normalizeSociety } from '../normalizers';

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
