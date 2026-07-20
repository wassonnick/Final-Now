import { adminFetch } from "@/lib/adminApi";

export type AiSpendGroup = {
  label: string;
  calls: number;
  estimated_cost_usd: number;
  total_tokens: number;
  image_count: number;
};

export type AiSpendLog = {
  id: number;
  provider: string;
  feature: string;
  operation?: string | null;
  model?: string | null;
  status: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  image_count: number;
  estimated_cost_usd: number;
  subject_type?: string | null;
  subject_id?: number | null;
  error_class?: string | null;
  error_message?: string | null;
  created_at?: string | null;
};

export type AiSpendSummary = {
  days: number;
  estimated_cost_usd: number;
  today_estimated_cost_usd: number;
  last_7_days_estimated_cost_usd: number;
  calls: number;
  total_tokens: number;
  image_count: number;
  failures: number;
  by_provider: AiSpendGroup[];
  by_feature: AiSpendGroup[];
  by_model: AiSpendGroup[];
  budget_guard: {
    used_today: number;
    daily_cap: number;
    provider_limited: boolean;
  };
};

export type AiSpendResponse = {
  summary: AiSpendSummary;
  recent: AiSpendLog[];
};

export async function fetchAiSpend(days = 30): Promise<AiSpendResponse> {
  const response = await adminFetch(`/admin/ai-spend?days=${days}&limit=75`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || "AI spend data could not be loaded.");
  }

  return body.data as AiSpendResponse;
}
