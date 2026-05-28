import { useEffect, useState } from 'react';
import { Building2, Home, TrendingUp } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';
import { adminFetch } from '@/lib/adminApi';

type AdminStats = {
  societies: number;
  featured_societies: number;
  properties: number;
  live_properties: number;
  leads: number;
  new_leads: number;
  pending_reviews: number;
  users: number;
};

const emptyStats: AdminStats = {
  societies: 0,
  featured_societies: 0,
  properties: 0,
  live_properties: 0,
  leads: 0,
  new_leads: 0,
  pending_reviews: 0,
  users: 0,
};

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        setError('');
        const response = await adminFetch('/admin/stats');
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(json?.message || 'Stats request failed');
        }

        setStats({ ...emptyStats, ...json });
      } catch (err) {
        console.error(err);
        setError('Unable to load live dashboard stats.');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  return (
    <AdminLayout title="Dashboard" subtitle="SocietyFlats command center">
      <div className="mx-auto max-w-7xl space-y-6">
        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-5 md:grid-cols-2">
          <StatCard title="Societies" value={loading ? '-' : String(stats.societies)} change={`${stats.featured_societies} featured`} icon={Building2} />
          <StatCard title="Properties" value={loading ? '-' : String(stats.properties)} change={`${stats.live_properties} live`} icon={Home} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Live inventory snapshot</h2>
                <p className="mt-1 text-sm text-slate-500">Real counts from the deployed backend.</p>
              </div>
              <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><TrendingUp className="h-5 w-5" /></div>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['Live properties', stats.live_properties, 'Visible publicly'],
                ['Draft / hidden', Math.max(stats.properties - stats.live_properties, 0), 'Admin only'],
                ['Societies', stats.societies, 'Backend profiles'],
              ].map(([label, value, meta]) => (
                <div key={label} className="rounded-3xl bg-slate-50 p-5">
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{loading ? '-' : value}</p>
                  <p className="mt-1 text-sm text-slate-500">{meta}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight text-slate-950">Modules pending connection</h2>
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Leads, reviews and users are hidden from dashboard totals until those modules are connected to real backend data.
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
