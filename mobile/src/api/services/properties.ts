import { apiClient, extractList } from '../client';
import { Property } from '../../types/domain';
import { normalizeProperty } from '../normalizers';

export const propertyService = {
  async list(params?: { q?: string; per_page?: number }): Promise<Property[]> {
    const response = await apiClient.get('/properties', { params: { per_page: 8, ...params } });
    return extractList<Property>(response.data).map(normalizeProperty);
  },
  async show(idOrSlug: string): Promise<Property> {
    const response = await apiClient.get(`/properties/${encodeURIComponent(idOrSlug)}`);
    return normalizeProperty((response.data as { data?: unknown }).data ?? response.data);
  },
};
