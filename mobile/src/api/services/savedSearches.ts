import { apiClient, extractList } from '../client';

export type SavedSearchRecord = {
  id: number;
  name: string;
  filters: Record<string, unknown>;
  alert_enabled: boolean;
  alert_channel?: 'whatsapp' | 'email' | string;
  alert_frequency?: 'daily' | 'weekly' | string;
  last_alert_sent_at?: string | null;
  last_checked_at?: string | null;
  created_at?: string | null;
};

export const savedSearchService = {
  async list() {
    const response = await apiClient.get('/accounts/saved-searches');
    return extractList<SavedSearchRecord>(response.data);
  },
  async create(name: string, filters: Record<string, unknown>) {
    const response = await apiClient.post('/accounts/saved-searches', {
      name,
      filters,
      alert_enabled: true,
      alert_channel: 'whatsapp',
      alert_frequency: 'daily',
    });

    return (response.data as { data: SavedSearchRecord }).data;
  },
  async update(id: number, payload: Partial<Pick<SavedSearchRecord, 'name' | 'filters' | 'alert_enabled' | 'alert_channel' | 'alert_frequency'>>) {
    const response = await apiClient.put(`/accounts/saved-searches/${id}`, payload);

    return (response.data as { data: SavedSearchRecord }).data;
  },
  async destroy(id: number) {
    const response = await apiClient.delete(`/accounts/saved-searches/${id}`);

    return response.data as { message?: string };
  },
};
