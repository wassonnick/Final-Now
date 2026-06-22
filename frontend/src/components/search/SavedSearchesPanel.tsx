import { useEffect, useState } from 'react';
import { Bell, Loader2, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/services/backendApi';
import { getCustomerAccountSession } from '@/lib/customerAccount';

type SavedSearch = { id: number; name: string; filters: Record<string, string>; alert_enabled: boolean; alert_channel: string; alert_frequency: string };

export function SavedSearchesPanel() {
  const token = getCustomerAccountSession()?.accountAccessToken || '';
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const load = async () => {
    if (!token) { setLoading(false); return; }
    const response = await fetch(`${API_BASE_URL}/accounts/saved-searches`, { headers });
    const json = await response.json().catch(() => ({}));
    if (response.ok) setItems(json.data || []);
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
  if (!items.length) return <div className="rounded-[28px] border border-dashed border-blue-200 bg-white p-8 text-center"><Search className="mx-auto h-7 w-7 text-blue-600" /><h3 className="mt-3 text-lg font-black text-slate-950">No saved searches yet</h3><p className="mt-2 text-sm text-slate-500">Save any active search and optionally enable match alerts.</p><Button asChild className="mt-5 rounded-full bg-blue-700"><Link to="/search">Search homes</Link></Button></div>;

  return <div className="grid gap-4 md:grid-cols-2">{items.map((item) => {
    const params = new URLSearchParams(item.filters).toString();
    return <article key={item.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="text-lg font-black text-slate-950">{item.name}</h3><p className="mt-2 text-xs font-semibold text-slate-500">{Object.entries(item.filters).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'All Gurgaon inventory'}</p><div className="mt-4 flex flex-wrap gap-2"><Button asChild className="rounded-full bg-blue-700"><Link to={`/search?${params}`}>Run search</Link></Button><Button type="button" onClick={() => void toggleAlerts(item)} variant="outline" className={`rounded-full ${item.alert_enabled ? 'border-emerald-200 text-emerald-700' : ''}`}><Bell className="mr-2 h-4 w-4" /> {item.alert_enabled ? `${item.alert_frequency} alerts on` : 'Alerts off'}</Button><Button type="button" onClick={() => void remove(item)} variant="ghost" className="rounded-full text-rose-600"><Trash2 className="h-4 w-4" /></Button></div></article>;
  })}</div>;
}
