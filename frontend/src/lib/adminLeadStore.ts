import { backendApi } from '@/services/backendApi';

export type LeadStatus = 'New' | 'Contacted' | 'Site Visit' | 'Negotiation' | 'Booked' | 'Lost';
export type LeadSource = string;
export type LeadPriority = 'Hot' | 'Warm' | 'Cold';

export interface LeadNote {
  id: number;
  text: string;
  createdAt: string;
}

export interface AdminLead {
  id: number;
  name: string;
  phone: string;
  email: string;
  society: string;
  property: string;
  budget: string;
  requirement: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  assignedTo: string;
  createdAt: string;
  followUpAt: string;
  notes: LeadNote[];
}

type ApiLead = {
  id: number;
  property_id?: number | null;
  society_id?: number | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  budget?: string | null;
  source?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  property_title?: string | null;
  property_slug?: string | null;
  society_name?: string | null;
  message?: string | null;
  requirement?: string | null;
  priority?: string | null;
  follow_up_at?: string | null;
  property?: {
    id?: number;
    title?: string | null;
    slug?: string | null;
    society?: { name?: string | null } | null;
  } | null;
  society?: { id?: number; name?: string | null } | null;
};

type ApiListResponse = {
  status?: string;
  data?: {
    data?: ApiLead[];
  } | ApiLead[];
};

type ApiSingleResponse = {
  status?: string;
  data?: ApiLead;
};

const STORAGE_KEY = 'societyflats_admin_leads_v2';

const seedLeads: AdminLead[] = [];

function readLeads(): AdminLead[] {
  if (typeof window === 'undefined') return seedLeads;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedLeads));
    return seedLeads;
  }
  try {
    return JSON.parse(stored) as AdminLead[];
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedLeads));
    return seedLeads;
  }
}

function writeLeads(leads: AdminLead[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  window.dispatchEvent(new Event('societyflats-leads-updated'));
}

function normalizeStatus(status?: string | null): LeadStatus {
  const allowed: LeadStatus[] = ['New', 'Contacted', 'Site Visit', 'Negotiation', 'Booked', 'Lost'];
  return allowed.includes(status as LeadStatus) ? status as LeadStatus : 'New';
}

function normalizePriority(priority?: string | null): LeadPriority {
  const allowed: LeadPriority[] = ['Hot', 'Warm', 'Cold'];
  return allowed.includes(priority as LeadPriority) ? priority as LeadPriority : 'Warm';
}

function parseNotes(notes?: string | null): LeadNote[] {
  if (!notes) return [];

  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) {
      return parsed.map((item, index) => ({
        id: Number(item.id || Date.now() + index),
        text: String(item.text || ''),
        createdAt: String(item.createdAt || item.created_at || ''),
      })).filter((item) => item.text.trim());
    }
  } catch {
    // Plain text notes are expected from the current backend schema.
  }

  return String(notes)
    .split('\n')
    .map((text, index) => ({ id: index + 1, text: text.trim(), createdAt: '' }))
    .filter((item) => item.text);
}

function notesToBackend(notes: LeadNote[]) {
  return notes.map((item) => item.createdAt ? `${item.createdAt}: ${item.text}` : item.text).join('\n');
}

function inferLeadRequirement(apiLead: ApiLead): string {
  const explicit = String(apiLead.requirement || "").trim();
  if (explicit) return explicit;

  const source = String(apiLead.source || "").toLowerCase();
  const message = String(apiLead.message || "").toLowerCase();
  const propertyTitle = String(apiLead.property_title || apiLead.property?.title || "").trim();

  if (source.includes("property_callback")) return "Property callback";
  if (source.includes("property_enquiry")) return "Property enquiry";
  if (propertyTitle && source.includes("society_page")) return "Property callback";
  if (message.includes("rent")) return "Rent requirement";
  if (message.includes("buy") || message.includes("sale")) return "Buy requirement";
  if (message.includes("visit")) return "Visit requirement";
  if (message.includes("callback")) return "Callback request";

  return "";
}

function mapApiLead(apiLead: ApiLead): AdminLead {
  return {
    id: apiLead.id,
    name: apiLead.name || 'Unknown Lead',
    phone: apiLead.phone || '',
    email: apiLead.email || '',
    society: apiLead.society_name || apiLead.society?.name || apiLead.property?.society?.name || 'Not specified',
    property: apiLead.property_title || apiLead.property?.title || apiLead.property_slug || 'General enquiry',
    budget: apiLead.budget || 'Not specified',
    requirement: inferLeadRequirement(apiLead) || apiLead.message || '',
    source: apiLead.source || 'Website',
    status: normalizeStatus(apiLead.status),
    priority: normalizePriority(apiLead.priority),
    assignedTo: apiLead.assigned_to || 'Unassigned',
    createdAt: apiLead.created_at || '',
    followUpAt: apiLead.follow_up_at || '',
    notes: parseNotes(apiLead.notes),
  };
}

function toApiPayload(lead: AdminLead) {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email || null,
    society_name: lead.society || null,
    property_title: lead.property || null,
    budget: lead.budget || null,
    requirement: lead.requirement || null,
    source: lead.source || 'Website',
    status: lead.status,
    priority: lead.priority,
    assigned_to: lead.assignedTo || null,
    follow_up_at: lead.followUpAt || null,
    notes: notesToBackend(lead.notes),
  };
}

function getListItems(response: ApiListResponse): ApiLead[] {
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.data?.data)) return response.data.data;
  return [];
}

export async function fetchAdminLeads(params = ''): Promise<AdminLead[]> {
  const response = await backendApi.listLeads(params) as ApiListResponse;
  return getListItems(response).map(mapApiLead).sort((a, b) => b.id - a.id);
}

export async function fetchAdminLead(id: string | number | undefined): Promise<AdminLead | undefined> {
  if (!id) return undefined;
  const response = await backendApi.getLead(String(id)) as ApiSingleResponse;
  return response.data ? mapApiLead(response.data) : undefined;
}

export async function saveAdminLead(lead: AdminLead): Promise<AdminLead> {
  const response = await backendApi.updateLead(String(lead.id), toApiPayload(lead)) as ApiSingleResponse;
  return response.data ? mapApiLead(response.data) : lead;
}

export async function updateLeadStatusRemote(id: number, status: LeadStatus): Promise<AdminLead | undefined> {
  const response = await backendApi.updateLead(String(id), { status }) as ApiSingleResponse;
  return response.data ? mapApiLead(response.data) : undefined;
}

export async function deleteAdminLeadRemote(id: number): Promise<void> {
  await backendApi.deleteLead(String(id));
}

export async function addLeadNoteRemote(lead: AdminLead, text: string): Promise<AdminLead> {
  const note: LeadNote = { id: Date.now(), text, createdAt: new Date().toLocaleString('en-IN') };
  const nextLead = { ...lead, notes: [note, ...lead.notes] };
  return saveAdminLead(nextLead);
}

// Legacy localStorage helpers are kept as a safe fallback for old admin screens/imports.
export function listAdminLeads(): AdminLead[] {
  return readLeads().sort((a, b) => b.id - a.id);
}

export function getAdminLead(id: string | number | undefined): AdminLead | undefined {
  if (!id) return undefined;
  return readLeads().find((lead) => String(lead.id) === String(id));
}

export function updateAdminLead(updatedLead: AdminLead): AdminLead {
  const leads = readLeads();
  const next = leads.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead));
  writeLeads(next);
  return updatedLead;
}

export function updateLeadStatus(id: number, status: LeadStatus): AdminLead | undefined {
  const lead = getAdminLead(id);
  if (!lead) return undefined;
  return updateAdminLead({ ...lead, status });
}

export function deleteAdminLead(id: number) {
  writeLeads(readLeads().filter((lead) => lead.id !== id));
}

export function addLeadNote(id: number, text: string): AdminLead | undefined {
  const lead = getAdminLead(id);
  if (!lead) return undefined;
  const note: LeadNote = { id: Date.now(), text, createdAt: new Date().toLocaleString('en-IN') };
  return updateAdminLead({ ...lead, notes: [note, ...lead.notes] });
}

export function exportLeadsCsv(leads: AdminLead[]) {
  const headers = ['Name', 'Phone', 'Email', 'Society', 'Property', 'Requirement', 'Budget', 'Source', 'Status', 'Priority', 'Assigned To', 'Follow Up'];
  const rows = leads.map((lead) => [
    lead.name,
    lead.phone,
    lead.email,
    lead.society,
    lead.property,
    lead.budget,
    lead.source,
    lead.status,
    lead.priority,
    lead.assignedTo,
    lead.followUpAt,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `societyflats-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
