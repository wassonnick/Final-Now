import { useState } from 'react';
import { Bell, BookmarkPlus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_BASE_URL } from '@/services/backendApi';
import { getCustomerAccountSession } from '@/lib/customerAccount';

export function SaveSearchButton({ filters, suggestedName }: { filters: Record<string, string>; suggestedName: string }) {
  const session = getCustomerAccountSession();
  const token = session?.accountAccessToken || '';
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName || 'My Gurgaon search');
  const [alerts, setAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  if (!token) {
    return <Button asChild variant="outline" size="sm" className="h-10 rounded-full"><Link to="/login"><BookmarkPlus className="mr-2 h-4 w-4" /> Save</Link></Button>;
  }

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`${API_BASE_URL}/accounts/saved-searches`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() || 'My Gurgaon search', filters, alert_enabled: alerts, alert_channel: 'whatsapp', alert_frequency: 'daily' }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || 'Unable to save search.');
      setMessage('Saved');
      setTimeout(() => setOpen(false), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save search.');
    } finally { setSaving(false); }
  };

  return <div className="relative">
    <Button type="button" onClick={() => setOpen((value) => !value)} variant="outline" size="sm" className="h-10 rounded-full"><BookmarkPlus className="mr-2 h-4 w-4" /> Save</Button>
    {open ? <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-blue-100 bg-white p-4 shadow-xl">
      <p className="font-black text-navy-950">Save this search</p>
      <Input value={name} onChange={(event) => setName(event.target.value)} className="mt-3" maxLength={120} />
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-navy-600"><input type="checkbox" checked={alerts} onChange={(event) => setAlerts(event.target.checked)} /><Bell className="h-4 w-4" /> Daily WhatsApp match alerts</label>
      <Button type="button" onClick={() => void save()} disabled={saving} className="mt-4 w-full rounded-full bg-blue-600 hover:bg-blue-700">{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{message || 'Save search'}</Button>
    </div> : null}
  </div>;
}
