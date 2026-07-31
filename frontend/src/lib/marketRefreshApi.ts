import { adminFetch } from "@/lib/adminApi";

export type MarketRefreshRow = {
  id: number;
  society_id: number;
  society_name?: string | null;
  society_slug?: string | null;
  sector?: string | null;
  trigger: string;
  before: Record<string, string>;
  after: Record<string, string>;
  changed_fields: string[];
  sources: unknown[];
  confidence?: number | null;
  notes?: string | null;
  created_at?: string | null;
};

export type MarketRefreshResponse = {
  summary: {
    window_days: number;
    refreshes: number;
    societies_touched: number;
    refreshes_with_changes: number;
    refreshes_unchanged: number;
    change_rate: number;
    estimated_units_spent: number;
  };
  fields_changed: Array<{ field: string; count: number }>;
  refreshes: MarketRefreshRow[];
};

export async function fetchMarketRefreshes(days = 30): Promise<MarketRefreshResponse> {
  const response = await adminFetch(`/admin/market-refreshes?days=${days}&limit=150`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(body?.message || "Market refresh data could not be loaded."));
  return body.data as MarketRefreshResponse;
}
