import { apiClient } from '../client';

export const leadService = {
  async requestCallback(payload: {
    name: string;
    phone: string;
    source: string;
    society_id?: number | string;
    property_id?: number | string;
    society_name?: string;
    property_title?: string;
    property_slug?: string | null;
    message?: string;
    cta_label?: string;
    source_page?: string;
    entity_type?: string;
    entity_slug?: string | null;
  }) {
    const response = await apiClient.post('/leads', {
      ...payload,
    });
    return response.data;
  },
};
