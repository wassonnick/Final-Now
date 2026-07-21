import { apiClient } from '../client';

export const authService = {
  async requestOtp(phone: string) {
    const response = await apiClient.post('/accounts/request-otp', { phone, role: 'customer' });
    return response.data;
  },
  async verifyOtp(phone: string, otp: string) {
    const response = await apiClient.post('/accounts/verify-otp', { phone, otp, role: 'customer' });
    return response.data as { account_access_token?: string; token?: string; data?: { token?: string; user?: unknown }; account?: unknown; user?: unknown };
  },
  async me() {
    const response = await apiClient.get('/accounts/dashboard');
    return (response.data as { account?: unknown }).account || response.data;
  },
};
