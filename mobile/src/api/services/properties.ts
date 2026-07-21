import { apiClient, extractList } from '../client';
import { Property } from '../../types/domain';

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

function normalizeProperty(raw: any): Property {
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    societyName: raw.society?.name || raw.society_name,
    societySlug: raw.society?.slug || raw.society_slug,
    listingType: raw.listing_type,
    bedrooms: raw.bedrooms,
    price: raw.price || raw.expected_price || raw.rent_amount,
    areaSqft: raw.area_sqft || raw.super_area_sqft || raw.carpet_area_sqft,
    imageUrl: raw.cover_image_url || raw.image_url || raw.images?.[0]?.url,
    status: raw.status,
  };
}
