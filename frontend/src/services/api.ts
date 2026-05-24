import axios from 'axios';
import type { Society, Property, Review, SearchFilters, AIRecommendation } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const societyApi = {
  getAll: async (filters?: SearchFilters) => {
    const response = await api.get('/societies', { params: filters });
    return response.data;
  },

  getBySlug: async (slug: string) => {
    const response = await api.get(`/societies/${slug}`);
    return response.data as Society;
  },

  getFeatured: async () => {
    const response = await api.get('/societies/featured');
    return response.data as Society[];
  },

  getByLocality: async (localityId: string) => {
    const response = await api.get(`/localities/${localityId}/societies`);
    return response.data as Society[];
  },

  getIntelligence: async (societyId: string) => {
    const response = await api.get(`/societies/${societyId}/intelligence`);
    return response.data;
  },
};

export const propertyApi = {
  getAll: async (filters?: SearchFilters) => {
    const response = await api.get('/properties', { params: filters });
    return response.data;
  },

  getBySlug: async (slug: string) => {
    const response = await api.get(`/properties/${slug}`);
    return response.data as Property;
  },

  getBySociety: async (societyId: string) => {
    const response = await api.get(`/societies/${societyId}/properties`);
    return response.data as Property[];
  },

  getSimilar: async (propertyId: string) => {
    const response = await api.get(`/properties/${propertyId}/similar`);
    return response.data as Property[];
  },
};

export const reviewApi = {
  getBySociety: async (societyId: string, page = 1) => {
    const response = await api.get(`/societies/${societyId}/reviews`, { params: { page } });
    return response.data;
  },

  create: async (data: Partial<Review>) => {
    const response = await api.post('/reviews', data);
    return response.data;
  },

  markHelpful: async (reviewId: string) => {
    const response = await api.post(`/reviews/${reviewId}/helpful`);
    return response.data;
  },
};

export const searchApi = {
  autocomplete: async (query: string) => {
    const response = await api.get('/search/autocomplete', { params: { q: query } });
    return response.data;
  },

  search: async (filters: SearchFilters) => {
    const response = await api.get('/search', { params: filters });
    return response.data;
  },
};

export const aiApi = {
  getRecommendations: async (preferences: {
    budget: number;
    officeLocation: string;
    bhk: number;
    familySize: number;
    hasPets: boolean;
    priorities: string[];
  }) => {
    const response = await api.post('/ai/recommendations', preferences);
    return response.data as AIRecommendation[];
  },

  getRentEstimate: async (societyId: string, bhk: number, area: number) => {
    const response = await api.get('/ai/rent-estimate', { params: { societyId, bhk, area } });
    return response.data;
  },
};

export const leadApi = {
  create: async (data: {
    propertyId?: string;
    societyId?: string;
    tenantName: string;
    tenantPhone: string;
    tenantEmail?: string;
    requirements?: string;
  }) => {
    const response = await api.post('/leads', data);
    return response.data;
  },
};

export default api;
