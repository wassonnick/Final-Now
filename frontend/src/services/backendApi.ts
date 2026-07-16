import { getAdminToken } from '@/hooks/useAdminAuth';
import { rememberCustomerLeadSubmission } from '@/lib/customerAccount';
import { API_BASE_URL } from '@/config/api';

function buildHeaders(path: string, headers: HeadersInit = {}): HeadersInit {
  const token = path.startsWith('/admin') ? getAdminToken() : '';

  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}`, 'X-Admin-Token': token } : {}),
    ...headers,
  };
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(path, options.headers || {}),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || `Request failed: ${response.status}`);
  }

  return json;
}

export const backendApi = {
  request,

  async createLead(payload: Record<string, unknown>) {
    const response = await request('/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    rememberCustomerLeadSubmission(payload, response as Record<string, unknown>);

    return response;
  },

  listPublicProperties(params = '') {
    const query = params ? `?${params}` : '';

    return request(`/properties${query}`, {
      method: 'GET',
    });
  },

  listComparePages(params = '') {
    const query = params ? `?${params}` : '';

    return request(`/compare-pages${query}`, {
      method: 'GET',
    });
  },

  getComparePage(slug: string) {
    return request(`/compare-pages/${encodeURIComponent(slug)}`, {
      method: 'GET',
    });
  },

  listLeads(params = '') {
    const query = params ? `?${params}` : '';

    return request(`/admin/leads${query}`, {
      method: 'GET',
    });
  },

  getLead(id: string) {
    return request(`/admin/leads/${id}`, {
      method: 'GET',
    });
  },

  updateLead(id: string, payload: Record<string, unknown>) {
    return request(`/admin/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deleteLead(id: string) {
    return request(`/admin/leads/${id}`, {
      method: 'DELETE',
    });
  },
};

export { API_BASE_URL };
