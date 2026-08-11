import { adminFetch } from "@/lib/adminApi";

export type AiChatSummary = {
  window_days: number;
  conversations: number;
  messages: number;
  user_questions: number;
  one_shot: number;
  continued: number;
  continued_rate: number;
  converted: number;
  converted_rate: number;
  avg_user_turns: number;
};

/** One row of a journey breakdown — entry source, entry affordance or exit outcome. */
export type AiChatBreakdown = { key: string; count: number; share: number };

export type AiChatConversation = {
  id: number;
  status: string;
  model?: string | null;
  message_count: number;
  user_turns?: number;
  entry_source?: string | null;
  entry_label?: string | null;
  entry_path?: string | null;
  entry_referrer?: string | null;
  outcome?: string | null;
  outcome_detail?: string | null;
  ended_at?: string | null;
  preview?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
};

export type AiChatMessage = {
  id: number;
  role: "user" | "assistant" | string;
  content: string;
  context_entities?: unknown;
  suggested_replies?: string[] | null;
  created_at?: string | null;
};

export type AiChatListResponse = {
  summary: AiChatSummary;
  depth: { one_shot: number; short: number; engaged: number };
  entry_sources: AiChatBreakdown[];
  entry_labels: AiChatBreakdown[];
  outcomes: AiChatBreakdown[];
  conversations: AiChatConversation[];
};

export type AiChatTranscript = {
  conversation: AiChatConversation;
  messages: AiChatMessage[];
};

async function parseJson(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(json?.message || `Request failed: ${response.status}`));
  return json;
}

export async function fetchAiChats(days = 30, limit = 50): Promise<AiChatListResponse> {
  const response = await adminFetch(`/admin/ai-chats?days=${days}&limit=${limit}`);
  return (await parseJson(response)).data as AiChatListResponse;
}

export async function fetchAiChatTranscript(id: number): Promise<AiChatTranscript> {
  const response = await adminFetch(`/admin/ai-chats/${id}`);
  return (await parseJson(response)).data as AiChatTranscript;
}
