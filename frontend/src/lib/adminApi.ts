import { getAdminToken } from '@/hooks/useAdminAuth';
import { API_BASE_URL } from '@/config/api';

export function adminHeaders(headers: HeadersInit = {}): HeadersInit {
  const token = getAdminToken();

  return {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}`, 'X-Admin-Token': token } : {}),
    ...headers,
  };
}

export async function adminFetch(path: string, options: RequestInit = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: adminHeaders(options.headers || {}),
  });
}

export async function uploadAdminImage(file: File, folder: string) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('folder', folder);

  const response = await adminFetch('/admin/uploads/images', {
    method: 'POST',
    body: formData,
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || 'Image upload failed');
  }

  return json?.data?.url as string;
}
