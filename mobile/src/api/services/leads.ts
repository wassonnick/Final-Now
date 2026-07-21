import { apiClient } from '../client';

export const leadService = {
  async requestCallback(payload: { source: string; society_slug?: string; property_slug?: string; message?: string }) {
    const response = await apiClient.post('/leads', payload);
    return response.data;
  },
};
