import { AxiosError, AxiosInstance, InternalAxiosRequestConfig, create } from 'axios';
import { env } from '../config/env';
import { secureTokenStorage } from '../lib/secureTokenStorage';
import { ApiErrorShape } from '../types/domain';

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export const apiClient: AxiosInstance = create({
  baseURL: env.apiBaseUrl,
  timeout: 15000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await secureTokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (__DEV__) {
    console.log('[api]', config.method?.toUpperCase(), config.url);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    if (error.response?.status === 401) {
      onUnauthorized?.();
    }

    const apiError: ApiErrorShape = {
      message:
        error.response?.data?.message ||
        (error.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : 'Network error. Please try again.'),
      status: error.response?.status,
      validation: error.response?.data?.errors,
    };

    return Promise.reject(apiError);
  },
);

export function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  const value = payload as { data?: unknown };
  if (Array.isArray(value?.data)) return value.data as T[];
  if (value?.data && typeof value.data === 'object') {
    const nested = value.data as { data?: unknown; items?: unknown };
    if (Array.isArray(nested.data)) return nested.data as T[];
    if (Array.isArray(nested.items)) return nested.items as T[];
  }
  return [];
}
