import { apiClient } from '../client';

export const advisorService = {
  async ask(message: string) {
    const response = await apiClient.post('/ai/advisor', { message, source: 'mobile_app' });
    return response.data;
  },
};
