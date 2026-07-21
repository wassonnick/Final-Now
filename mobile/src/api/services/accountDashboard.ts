import { apiClient } from '../client';
import { Property } from '../../types/domain';

export type AccountLead = {
  id: number | string;
  source?: string | null;
  society_name?: string | null;
  property_title?: string | null;
  property_slug?: string | null;
  requirement?: string | null;
  budget?: string | null;
  status?: string | null;
  lead_intent?: string | null;
  entity_type?: string | null;
  entity_slug?: string | null;
  linked_properties_count?: number;
  linked_properties?: Property[];
  created_at?: string | null;
};

export type SiteVisit = {
  id: number | string;
  status?: string | null;
  selected_slot?: string | null;
  society_name?: string | null;
  society_slug?: string | null;
};

export type AccountDashboard = {
  account?: { id?: number | string; name?: string | null; phone?: string | null; role?: string | null };
  summary?: {
    owner_listing_leads?: number;
    broker_submissions?: number;
    linked_properties?: number;
  };
  owner_listing_leads?: AccountLead[];
  broker_submissions?: AccountLead[];
  linked_properties?: Property[];
  site_visits?: SiteVisit[];
};

export const accountDashboardService = {
  async get() {
    const response = await apiClient.get('/accounts/dashboard');
    return response.data as AccountDashboard;
  },
};
