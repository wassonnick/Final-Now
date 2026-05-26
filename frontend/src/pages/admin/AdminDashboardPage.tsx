import { Building2, Home, MessageSquareText, Star, Users, TrendingUp } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { StatCard } from '@/components/admin/StatCard';

const activity = [
  { title: 'New resale lead', detail: 'DLF Park Place • 3 BHK • ₹3.8 Cr budget', time: '12 min ago' },
  { title: 'Review pending', detail: 'DLF Crest maintenance review needs approval', time: '42 min ago' },
  { title: 'Listing updated', detail: 'M3M Golf Estate rent revised to ₹95,000', time: '2 hrs ago' },
  { title: 'Society score changed', detail: 'Aralias connectivity score updated', time: 'Today' },
];

export function AdminDashboardPage() {
  return (
    <AdminLayout title="Dashboard" subtitle="SocietyFlats command center">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Societies" value="150+" change="Gurgaon focus" icon={Building2} />
        <StatCard title="Properties" value="5,240" change="Rent + Buy" icon={Home} />
        <StatCard title="Active Leads" value="318" change="+24 today" icon={MessageSquareText} />
        <StatCard title="Pending Reviews" value="42" change="Moderation queue" icon={Star} />
        <StatCard title="Users" value="8,420" change="Owners, brokers, tenants" icon={Users} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-950">Market snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">Top operating signals for Gurgaon societies.</p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><TrendingUp className="h-5 w-5" /></div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ['Highest demand', 'DLF Crest', 'Sector 54'],
              ['Top rental yield', 'M3M Golf Estate', 'Golf Course Extn.'],
              ['Most searched', 'DLF Park Place', 'Golf Course Road'],
            ].map(([label, value, meta]) => (
              <div key={label} className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{meta}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">Recent activity</h2>
          <div className="mt-5 space-y-3">
            {activity.map((item) => (
              <div key={item.title} className="rounded-3xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
