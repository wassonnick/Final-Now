import { Plus, Search } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';

const properties = [
  { title: '3 BHK luxury apartment', society: 'DLF Crest', type: 'Rent', price: '₹85,000/mo', status: 'Live' },
  { title: '4 BHK resale residence', society: 'DLF Park Place', type: 'Buy', price: '₹4.2 Cr', status: 'Verification' },
  { title: 'Penthouse with golf view', society: 'M3M Golf Estate', type: 'Buy', price: '₹6.8 Cr', status: 'Live' },
  { title: '2 BHK family apartment', society: 'Tata Primanti', type: 'Rent', price: '₹52,000/mo', status: 'Draft' },
];

export function AdminPropertiesPage() {
  return (
    <AdminLayout title="Properties" subtitle="Manage rent, buy and seller inventory">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 md:w-96">
            <Search className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Search properties</span>
          </div>
          <Button className="rounded-full bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> Add Property</Button>
        </div>
        <div className="mt-6 grid gap-4">
          {properties.map((item) => (
            <div key={item.title} className="flex flex-col gap-4 rounded-3xl border border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.society} • {item.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-950">{item.price}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{item.status}</span>
                <Button variant="outline" size="sm" className="rounded-full">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
