import { useEffect, useState } from 'react';
import { Bell, ClipboardList, Loader2, Search, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/services/backendApi';
import { getCustomerAccountSession } from '@/lib/customerAccount';
import { briefFromFilters, reopenBrief } from '@/lib/briefStorage';
import { describeBrief, timelineLabel } from '@/lib/briefMatch';

/** The brief as its owner would describe it, not as it is stored. */
function describeBriefFilters(filters: Record<string, string>): string[] {
  const brief = briefFromFilters(filters);
  const chips = [filters.city, ...describeBrief(brief), timelineLabel(brief)];

  return chips.map((chip) => String(chip || '').trim()).filter(Boolean).slice(0, 7);
}

type SavedSearch = { id: number; name: string; filters: Record<string, string>; alert_enabled: boolean; alert_channel: string; alert_frequency: string };
type SearchAlert = { id: number; status: string; created_at: string; property?: { title?: string; slug?: string; price?: string; society?: { name?: string } }; saved_search?: { name?: string } };

export function SavedSearchesPanel() {
  const token = getCustomerAccountSession()?.accountAccessToken || '';
  const navigate = useNavigate();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = async () => {
    if (!token) { setLoading(false); return; }
    const [response, alertResponse] = await Promise.all([fetch(`${API_BASE_URL}/accounts/saved-searches`, { headers }), fetch(`${API_BASE_URL}/accounts/saved-search-alerts`, { headers })]);
    const [json, alertJson] = await Promise.all([response.json().catch(() => ({})), alertResponse.json().catch(() => ({}))]);
    if (response.ok) setItems(json.data || []);
    if (alertResponse.ok) setAlerts(alertJson.data || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [token]);

  const toggleAlerts = async (item: SavedSearch) => {
    await fetch(`${API_BASE_URL}/accounts/saved-searches/${item.id}`, { method: 'PUT', headers, body: JSON.stringify({ alert_enabled: !item.alert_enabled }) });
    await load();
  };

  const remove = async (item: SavedSearch) => {
    await fetch(`${API_BASE_URL}/accounts/saved-searches/${item.id}`, { method: 'DELETE', headers });
    await load();
  };

  if (loading) return <div className="flex items-center gap-2 rounded-3xl bg-white p-8 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading saved searches</div>;
  if (!items.length) return <div className="rounded-[28px] border border-dashed border-blue-200 bg-white p-8 text-center"><Search className="mx-auto h-7 w-7 text-blue-600" /><h3 className="mt-3 text-lg font-black text-slate-950">Nothing saved yet</h3><p className="mt-2 text-sm text-slate-500">Save a search or a brief, and we'll tell you when matching homes are listed.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><Button asChild className="rounded-full bg-blue-700"><Link to="/brief">Build a brief</Link></Button><Button asChild variant="outline" className="rounded-full"><Link to="/search">Search homes</Link></Button></div></div>;

  return <div><div className="grid gap-4 md:grid-cols-2">{items.map((item) => {
    /*
      A brief is not a search, and rendering it as one produced "kind: brief · mode: rent ·
      budget: 40000 · bhk: 2,3" and a Run search link to /search?kind=brief… that the search
      page cannot read. It gets its own summary and its own action.
    */
    const isBrief = item.filters?.kind === 'brief';
    const params = new URLSearchParams(item.filters).toString();

    return <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      {isBrief ? <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700"><ClipboardList className="h-3 w-3" /> Brief</span> : null}
      <h3 className={`text-lg font-black text-slate-950 ${isBrief ? 'mt-2' : ''}`}>{item.name}</h3>
      {isBrief
        ? <div className="mt-2 flex flex-wrap gap-1.5">{describeBriefFilters(item.filters).map((chip) => <span key={chip} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11.5px] font-bold text-slate-700">{chip}</span>)}</div>
        : <p className="mt-2 text-xs font-semibold text-slate-500">{Object.entries(item.filters).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'All Gurgaon inventory'}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {isBrief
          ? <Button type="button" className="rounded-full bg-blue-700" onClick={() => { reopenBrief(item.filters); navigate('/brief'); }}>Reopen brief</Button>
          : <Button asChild className="rounded-full bg-blue-700"><Link to={`/search?${params}`}>Run search</Link></Button>}
        <Button type="button" onClick={() => void toggleAlerts(item)} variant="outline" className={`rounded-full ${item.alert_enabled ? 'border-emerald-200 text-emerald-700' : ''}`}><Bell className="mr-2 h-4 w-4" /> {item.alert_enabled ? `${item.alert_frequency} alerts on` : 'Alerts off'}</Button>
        <Button type="button" onClick={() => void remove(item)} variant="ghost" className="rounded-full text-rose-600"><Trash2 className="h-4 w-4" /></Button>
      </div>
    </article>;
  })}</div>{alerts.length ? <section className="mt-6 rounded-[24px] border border-emerald-100 bg-emerald-50/40 p-5"><h3 className="font-black text-slate-950">Recent verified inventory matches</h3><div className="mt-3 grid gap-2">{alerts.slice(0, 12).map((alert) => <Link key={alert.id} to={`/property/${alert.property?.slug || ''}`} className="rounded-2xl border border-emerald-100 bg-white p-3 text-sm hover:border-emerald-300"><span className="font-black text-slate-950">{alert.property?.title}</span><span className="text-slate-500"> · {alert.property?.society?.name || ''} · {alert.property?.price || ''}</span><span className="ml-2 text-xs font-bold capitalize text-emerald-700">{alert.status === 'pending' ? 'Matched' : alert.status}</span></Link>)}</div></section> : null}</div>;
}
