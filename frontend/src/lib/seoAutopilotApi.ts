import { adminFetch } from '@/lib/adminApi';

async function json(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || 'SEO Autopilot request failed.');
  return payload;
}

const base = '/admin/seo-autopilot';
export const fetchSeoAutopilotDashboard = () => adminFetch(`${base}/dashboard`).then(json);
export const fetchSeoAutopilotPages = (params = '') => adminFetch(`${base}/pages${params ? `?${params}` : ''}`).then(json);
export const runSeoAutopilotAudit = (pageId?: number) => adminFetch(`${base}/audit`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(pageId ? { page_id:pageId } : {}) }).then(json);
export const fetchSeoAutopilotTasks = () => adminFetch(`${base}/tasks?status=open&per_page=100`).then(json);
export const updateSeoAutopilotTask = (id:number,status:string) => adminFetch(`${base}/tasks/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) }).then(json);
export const fetchSeoAutopilotKeywords = () => adminFetch(`${base}/keywords?per_page=200`).then(json);
export const seedSeoAutopilotKeywords = () => adminFetch(`${base}/keywords/seed`, {method:'POST'}).then(json);
export const fetchSeoAutopilotDrafts = () => adminFetch(`${base}/drafts?per_page=100`).then(json);
export const generateSeoAutopilotDraft = (pageId:number) => adminFetch(`${base}/pages/${pageId}/drafts`, {method:'POST'}).then(json);
export const updateSeoAutopilotDraft = (id:number,data:Record<string,string>) => adminFetch(`${base}/drafts/${id}`, {method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}).then(json);
export const approveSeoAutopilotDraft = (id:number) => adminFetch(`${base}/drafts/${id}/approve`, {method:'POST'}).then(json);
export const rejectSeoAutopilotDraft = (id:number,reason='') => adminFetch(`${base}/drafts/${id}/reject`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})}).then(json);
export const publishSeoAutopilotDraft = (id:number) => adminFetch(`${base}/drafts/${id}/publish`, {method:'POST'}).then(json);
export const fetchSeoAutopilotReports = () => adminFetch(`${base}/reports`).then(json);
export const generateSeoAutopilotReport = (period:string) => adminFetch(`${base}/reports`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({period})}).then(json);
export const fetchGoogleSearchConsole = () => adminFetch(`${base}/search-console/fetch`, {method:'POST'}).then(json);

// Society SEO re-voice review (draft-holding layer: live copy stays until approved).
export const fetchRevoicePending = () => adminFetch('/admin/societies/seo-content/revoice-pending').then(json);
export const generateRevoiceBatch = (limit=10) => adminFetch('/admin/societies/seo-content/revoice-generate', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({limit})}).then(json);
export const approveRevoice = (societyId:number) => adminFetch(`/admin/societies/${societyId}/seo-content/revoice/approve`, {method:'POST'}).then(json);
export const rejectRevoice = (societyId:number) => adminFetch(`/admin/societies/${societyId}/seo-content/revoice/reject`, {method:'POST'}).then(json);
