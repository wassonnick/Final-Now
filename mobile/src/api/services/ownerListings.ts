import { apiClient, extractList } from '../client';

export type OwnerListingPayload = {
  name: string;
  phone: string;
  purpose: 'rent' | 'sale';
  listing_type: 'apartment' | 'builder_floor';
  society_name?: string;
  locality?: string;
  sector?: string;
  city?: string;
  bhk?: string;
  area_sqft?: number;
  floor?: string;
  furnishing?: string;
  availability?: string;
  expected_price?: string;
  rent_amount?: number;
  sale_price?: number;
  details?: string;
  images?: string[];
};

export type OwnerListing = OwnerListingPayload & {
  id: number | string;
  status?: string;
  created_at?: string;
};

export const ownerListingService = {
  async submit(payload: OwnerListingPayload) {
    const response = await apiClient.post('/listings', payload);
    return response.data as { status: string; message?: string; data?: OwnerListing };
  },
  async uploadImage(asset: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    const form = new FormData();
    form.append('image', {
      uri: asset.uri,
      name: asset.fileName || `societyflats-listing-${Date.now()}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    } as unknown as Blob);

    const response = await apiClient.post('/listings/images', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data as { status: string; data?: { url?: string; path?: string } };
  },
  async mine() {
    const response = await apiClient.get('/account/listings');
    return extractList<OwnerListing>(response.data);
  },
};
