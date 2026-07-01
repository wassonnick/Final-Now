import { adminFetch } from '@/lib/adminApi';

export type SocietySeoStatus = 'draft' | 'needs_review' | 'approved' | 'published' | 'unpublished';
export type SocietySeoGenerator = 'manual' | 'ai' | 'ai_plus_admin' | 'system';

export type SocietySeoFaq = { question: string; answer: string };
export type SocietySeoInternalLink = string | { label?: string; title?: string; url?: string; path?: string };

export interface SocietySeoContent {
  id: number | null;
  society_id: number;
  seo_title: string;
  seo_description: string;
  seo_h1: string;
  intro_summary: string;
  about_content: string;
  location_content: string;
  rent_content: string;
  sale_content: string;
  amenities_content: string;
  investment_content: string;
  pros_json: string[];
  cons_json: string[];
  best_for_json: string[];
  nearby_highlights_json: string[];
  faq_json: SocietySeoFaq[];
  internal_link_suggestions_json: SocietySeoInternalLink[];
  schema_json: Record<string, unknown>;
  content_score: number;
  keyword_score: number;
  uniqueness_score: number;
  readability_score: number;
  status: SocietySeoStatus;
  generated_by: SocietySeoGenerator;
  published_at?: string | null;
  updated_at?: string | null;
  score_label: string;
}

export function emptySocietySeoContent(societyId: number): SocietySeoContent {
  return {
    id: null,
    society_id: societyId,
    seo_title: '',
    seo_description: '',
    seo_h1: '',
    intro_summary: '',
    about_content: '',
    location_content: '',
    rent_content: '',
    sale_content: '',
    amenities_content: '',
    investment_content: '',
    pros_json: [],
    cons_json: [],
    best_for_json: [],
    nearby_highlights_json: [],
    faq_json: [],
    internal_link_suggestions_json: [],
    schema_json: {},
    content_score: 0,
    keyword_score: 0,
    uniqueness_score: 0,
    readability_score: 0,
    status: 'draft',
    generated_by: 'manual',
    score_label: 'Weak',
  };
}

function normalize(data: Partial<SocietySeoContent>, societyId: number): SocietySeoContent {
  const base = emptySocietySeoContent(societyId);
  return {
    ...base,
    ...data,
    society_id: Number(data.society_id || societyId),
    pros_json: Array.isArray(data.pros_json) ? data.pros_json : [],
    cons_json: Array.isArray(data.cons_json) ? data.cons_json : [],
    best_for_json: Array.isArray(data.best_for_json) ? data.best_for_json : [],
    nearby_highlights_json: Array.isArray(data.nearby_highlights_json) ? data.nearby_highlights_json : [],
    faq_json: Array.isArray(data.faq_json) ? data.faq_json : [],
    internal_link_suggestions_json: Array.isArray(data.internal_link_suggestions_json) ? data.internal_link_suggestions_json : [],
    schema_json: data.schema_json && typeof data.schema_json === 'object' && !Array.isArray(data.schema_json) ? data.schema_json : {},
  };
}

async function request(societyId: number, suffix = '', options: RequestInit = {}) {
  const response = await adminFetch(`/admin/societies/${societyId}/seo-content${suffix}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) throw new Error('Admin session expired. Sign in again.');
    throw new Error(json?.message || 'SEO content request failed.');
  }
  return json;
}

export async function fetchSocietySeoContent(societyId: number) {
  const json = await request(societyId);
  return normalize(json?.data || {}, societyId);
}

export async function saveSocietySeoContent(societyId: number, content: SocietySeoContent) {
  const json = await request(societyId, '', {
    method: content.id ? 'PATCH' : 'POST',
    body: JSON.stringify(content),
  });
  return normalize(json?.data || {}, societyId);
}

export async function runSocietySeoAction(societyId: number, action: 'score' | 'approve' | 'publish' | 'unpublish' | 'preview') {
  const json = await request(societyId, `/${action}`, { method: 'POST', body: '{}' });
  return { content: normalize(json?.data || {}, societyId), message: json?.message || '', warning: json?.warning || '', publiclyVisible: Boolean(json?.publicly_visible) };
}

export async function generateSocietySeoAiDraft(societyId: number, mode: 'generate' | 'improve' = 'generate', confirmReplace = false) {
  const response = await adminFetch(`/admin/societies/${societyId}/seo-content/${mode === 'improve' ? 'improve-ai-draft' : 'generate-ai-draft'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm_replace: confirmReplace }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || 'AI SEO draft generation failed.');
  return { content: normalize(json?.data || {}, societyId), warnings: Array.isArray(json?.warnings) ? json.warnings : [], message: json?.message || '' };
}

export type SocietySeoReportItem = { society_id: number; society: string; slug: string; location: string; builder: string; seo_status: string; content_score: number; score_label: string; missing_sections: string[]; updated_at?: string | null };
export type SocietySeoReport = { summary: Record<string, number>; data: SocietySeoReportItem[] };

export async function fetchSocietySeoReport(): Promise<SocietySeoReport> {
  const response = await adminFetch('/admin/societies/seo-content/report');
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || 'Could not load the Society SEO readiness report.');
  return { summary: json?.summary || {}, data: Array.isArray(json?.data) ? json.data : [] };
}

export async function runSocietySeoBulkAction(action: 'bulk-score' | 'bulk-generate-drafts' | 'bulk-regenerate-missing', options: { limit?: number; offset?: number; include_drafts?: boolean } = {}) {
  const response = await adminFetch(`/admin/societies/seo-content/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(options) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || 'Bulk SEO action failed.');
  return json;
}
