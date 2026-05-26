import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';

const leads = [
  { name: 'Rahul Sharma', phone: '+91 98xxxxxx21', interest: 'Rent • DLF Crest', status: 'New', time: 'Today' },
  { name: 'Ananya Gupta', phone: '+91 99xxxxxx74', interest: 'Buy • Park Place', status: 'Contacted', time: 'Yesterday' },
  { name: 'Karan Mehta', phone: '+91 88xxxxxx12', interest: 'Sell • Aralias', status: 'Qualified', time: '2 days ago' },
];

export function AdminLeadsPage() {
  return (
    <AdminLayout title="Leads" subtitle="Track enquiries, seller requests and contact actions">
      <div className="grid gap-4">
        {leads.map((lead) => (
          <div key={lead.phone} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-950">{lead.name}</p>
                <p className="mt-1 text-sm text-slate-500">{lead.phone} • {lead.interest}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{lead.status}</span>
                <span className="text-sm text-slate-400">{lead.time}</span>
                <Button variant="outline" size="sm" className="rounded-full">Open</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
