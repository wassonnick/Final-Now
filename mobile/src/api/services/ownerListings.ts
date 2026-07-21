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
  async mine() {
    const response = await apiClient.get('/account/listings');
    return extractList<OwnerListing>(response.data);
  },
};
