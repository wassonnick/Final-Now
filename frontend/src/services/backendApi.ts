const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://final-now.onrender.com/api';

const API_BASE_URL = String(rawApiBaseUrl).replace(/\/$/, '');

type JsonValue = Record<string, unknown> | Array<unknown>;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Request failed');
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const backendApi = {
  adminStats: () => request('/admin/stats'),

  listSocieties: (params = '') => request(`/admin/societies${params}`),
  createSociety: (payload: JsonValue) => request('/admin/societies', { method: 'POST', body: JSON.stringify(payload) }),
  updateSociety: (id: string, payload: JsonValue) => request(`/admin/societies/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSociety: (id: string) => request(`/admin/societies/${id}`, { method: 'DELETE' }),

  listProperties: (params = '') => request(`/admin/properties${params}`),
  createProperty: (payload: JsonValue) => request('/admin/properties', { method: 'POST', body: JSON.stringify(payload) }),
  updateProperty: (id: string, payload: JsonValue) => request(`/admin/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteProperty: (id: string) => request(`/admin/properties/${id}`, { method: 'DELETE' }),

  listLeads: (params = '') => request(`/admin/leads${params}`),
  getLead: (id: string) => request(`/admin/leads/${id}`),
  updateLead: (id: string, payload: JsonValue) => request(`/admin/leads/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteLead: (id: string) => request(`/admin/leads/${id}`, { method: 'DELETE' }),

  publicSocieties: (params = '') => request(`/societies${params}`),
  publicProperties: (params = '') => request(`/properties${params}`),
  createLead: (payload: JsonValue) => request('/leads', { method: 'POST', body: JSON.stringify(payload) }),
};
