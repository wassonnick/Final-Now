export type LeadStatus = 'New' | 'Contacted' | 'Site Visit' | 'Negotiation' | 'Booked' | 'Lost';
export type LeadSource = 'Website' | 'WhatsApp' | 'Call' | 'Admin' | 'Referral';
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
  const headers = ['Name', 'Phone', 'Email', 'Society', 'Property', 'Budget', 'Source', 'Status', 'Priority', 'Assigned To', 'Follow Up'];
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
