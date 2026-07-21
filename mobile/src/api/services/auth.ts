import { apiClient } from '../client';

export const authService = {
  async requestOtp(phone: string) {
    const response = await apiClient.post('/account/request-otp', { phone });
    return response.data;
  },
  async verifyOtp(phone: string, otp: string) {
    const response = await apiClient.post('/account/verify-otp', { phone, otp });
    return response.data as { token?: string; data?: { token?: string; user?: unknown }; user?: unknown };
  },
  async me() {
    const response = await apiClient.get('/account/me');
    return response.data;
  },
};
