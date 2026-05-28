const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(options?.headers || {}) }, ...options });
  if (!response.ok) throw new Error(await response.text() || `API request failed: ${response.status}`);
  return response.json();
}
export const liveBackendApi = {
  societies: { list: () => request('/societies'), show: (slug: string) => request(`/societies/${encodeURIComponent(slug)}`), create: (payload: unknown) => request('/admin/societies', { method: 'POST', body: JSON.stringify(payload) }), update: (id: string | number, payload: unknown) => request(`/admin/societies/${id}`, { method: 'PUT', body: JSON.stringify(payload) }), delete: (id: string | number) => request(`/admin/societies/${id}`, { method: 'DELETE' }) },
  properties: { list: () => request('/properties'), show: (idOrSlug: string | number) => request(`/properties/${encodeURIComponent(String(idOrSlug))}`), create: (payload: unknown) => request('/admin/properties', { method: 'POST', body: JSON.stringify(payload) }), update: (id: string | number, payload: unknown) => request(`/admin/properties/${id}`, { method: 'PUT', body: JSON.stringify(payload) }), delete: (id: string | number) => request(`/admin/properties/${id}`, { method: 'DELETE' }) },
  leads: { create: (payload: unknown) => request('/leads', { method: 'POST', body: JSON.stringify(payload) }), list: () => request('/admin/leads'), update: (id: string | number, payload: unknown) => request(`/admin/leads/${id}`, { method: 'PUT', body: JSON.stringify(payload) }) },
};
