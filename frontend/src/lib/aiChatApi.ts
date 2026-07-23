import { adminFetch } from "@/lib/adminApi";

export type AiChatSummary = {
  window_days: number;
  conversations: number;
  messages: number;
  user_questions: number;
};

export type AiChatConversation = {
  id: number;
  status: string;
  model?: string | null;
  message_count: number;
  preview?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
};

export type AiChatMessage = {
  id: number;
  role: "user" | "assistant" | string;
  content: string;
  context_entities?: unknown;
  created_at?: string | null;
};

export type AiChatListResponse = {
  summary: AiChatSummary;
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
