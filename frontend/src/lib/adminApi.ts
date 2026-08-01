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
  // A JSON string body needs its Content-Type declared. Without it the browser sends
  // text/plain, Laravel never parses the body, and every field arrives missing — which
  // surfaces as "The scope field is required" on a request that plainly included it.
  // Endpoints whose fields are all optional appeared to work while silently discarding
  // everything sent to them.
  //
  // FormData must be left alone: the browser sets its own multipart boundary.
  const isJsonBody = typeof options.body === 'string';

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: adminHeaders({
      ...(isJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    }),
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
