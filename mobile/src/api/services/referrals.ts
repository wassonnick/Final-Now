import { apiClient } from '../client';

export const referralService = {
  async summary() {
    const response = await apiClient.get('/accounts/referrals');
    return response.data as {
      referral_code?: string;
      policy?: string;
      summary?: { submitted?: number; qualified?: number; converted?: number };
      data?: { id: number | string; name: string; phone_last4: string; intent: string; status: string; reward_status?: string }[];
    };
  },
  async submit(payload: { name: string; phone: string; intent: 'rent' | 'buy' | 'sell'; notes?: string }) {
    const response = await apiClient.post('/accounts/referrals', payload);
    return response.data;
  },
};
