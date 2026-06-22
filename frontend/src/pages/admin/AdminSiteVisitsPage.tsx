import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clipboard, Loader2, Send } from 'lucide-react';

import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/services/backendApi';
import { getAdminToken } from '@/hooks/useAdminAuth';

type Lead = { id: number; name: string; phone: string; society_name?: string; property_title?: string };
type Visit = { id: number; confirmation_token: string; proposed_slots: string[]; selected_slot?: string | null; status: string; visitor_name: string; visitor_phone: string; reminder_sent_at?: string | null; lead?: Lead; society?: { name?: string }; property?: { title?: string } };

export function AdminSiteVisitsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [leadId, setLeadId] = useState('');
  const [slots, setSlots] = useState(['', '', '']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const token = getAdminToken();
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const request = async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json?.message || 'Site visit request failed.');
    return json;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [visitJson, leadJson] = await Promise.all([request('/admin/site-visits?per_page=100'), request('/admin/leads?per_page=100')]);
      setVisits(visitJson.data || []);
      setLeads(leadJson.data?.data || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load site visits.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const eligibleLeads = useMemo(() => leads.filter((lead) => !visits.some((visit) => visit.lead?.id === lead.id && !['completed', 'cancelled'].includes(visit.status))), [leads, visits]);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      await request('/admin/site-visits', { method: 'POST', body: JSON.stringify({ lead_id: Number(leadId), proposed_slots: slots.filter(Boolean).map((slot) => new Date(slot).toISOString()) }) });
      setLeadId(''); setSlots(['', '', '']); setMessage('Site visit proposal created. Share the confirmation link.'); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create visit.'); }
    finally { setSaving(false); }
  };

  const update = async (visit: Visit, status: string) => { await request(`/admin/site-visits/${visit.id}`, { method: 'PUT', body: JSON.stringify({ status }) }); await load(); };
  const remind = async (visit: Visit) => { const json = await request(`/admin/site-visits/${visit.id}/remind`, { method: 'POST' }); setMessage(json.message); await load(); };
  const visitUrl = (visit: Visit) => `${window.location.origin}/visit/${visit.confirmation_token}`;

  return <AdminLayout title="Site Visits" subtitle="Propose slots, track confirmations and send configured reminders">
    <form onSubmit={create} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3"><span className="rounded-2xl bg-blue-50 p-3 text-blue-700"><CalendarCheck className="h-5 w-5" /></span><div><h2 className="text-xl font-black text-slate-950">Schedule a visit</h2><p className="text-sm text-slate-500">Offer one to five future slots for an active lead.</p></div></div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_repeat(3,1fr)_auto]"><select required value={leadId} onChange={(event) => setLeadId(event.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="">Select lead</option>{eligibleLeads.map((lead) => <option key={lead.id} value={lead.id}>#{lead.id} · {lead.name} · {lead.society_name || lead.property_title || lead.phone}</option>)}</select>{slots.map((slot, index) => <Input key={index} type="datetime-local" required={index === 0} value={slot} onChange={(event) => setSlots((items) => items.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />)}<Button disabled={saving} className="rounded-full bg-blue-700">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</Button></div>
    </form>
    {message ? <p className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</p> : null}
    {loading ? <div className="mt-5 flex items-center gap-2 rounded-3xl bg-white p-8"><Loader2 className="h-5 w-5 animate-spin" /> Loading visits</div> : <div className="mt-5 grid gap-4 xl:grid-cols-2">{visits.map((visit) => <article key={visit.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">Visit #{visit.id}</p><h3 className="mt-1 text-lg font-black text-slate-950">{visit.visitor_name}</h3><p className="text-sm text-slate-500">{visit.society?.name || visit.property?.title || visit.lead?.society_name || 'Property visit'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${visit.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{visit.status}</span></div><div className="mt-4 space-y-2 text-sm text-slate-600">{visit.proposed_slots.map((slot) => <p key={slot} className={visit.selected_slot && new Date(slot).getTime() === new Date(visit.selected_slot).getTime() ? 'font-black text-emerald-700' : ''}>{new Date(slot).toLocaleString('en-IN')}</p>)}</div><div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="outline" className="rounded-full" onClick={() => void navigator.clipboard.writeText(visitUrl(visit))}><Clipboard className="mr-2 h-4 w-4" /> Copy link</Button>{visit.status === 'confirmed' ? <Button type="button" variant="outline" className="rounded-full text-blue-700" onClick={() => void remind(visit)}><Send className="mr-2 h-4 w-4" /> Reminder</Button> : null}{visit.status === 'confirmed' ? <Button type="button" className="rounded-full bg-emerald-600" onClick={() => void update(visit, 'completed')}><CheckCircle2 className="mr-2 h-4 w-4" /> Complete</Button> : null}{!['completed','cancelled'].includes(visit.status) ? <Button type="button" variant="ghost" className="rounded-full text-rose-600" onClick={() => void update(visit, 'cancelled')}>Cancel</Button> : null}</div></article>)}</div>}
  </AdminLayout>;
}
