import { apiClient } from '../client';

export const nriService = {
  async submit(payload: {
    name: string;
    country: string;
    contact_method: 'email' | 'whatsapp';
    phone?: string;
    email?: string;
    service_type: 'buy' | 'sell' | 'rent_out' | 'manage';
    property_context?: string;
    notes?: string;
    consent: boolean;
  }) {
    const response = await apiClient.post('/nri-cases', payload);
    return response.data as { message?: string; case_reference?: string; disclaimer?: string };
  },
};
