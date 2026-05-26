import { Plus, Search } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';

const societies = [
  { name: 'DLF Crest', builder: 'DLF', locality: 'Sector 54', score: '9.1', status: 'Verified' },
  { name: 'DLF Park Place', builder: 'DLF', locality: 'Golf Course Road', score: '8.9', status: 'Verified' },
  { name: 'The Aralias', builder: 'DLF', locality: 'Sector 42', score: '9.5', status: 'Premium' },
  { name: 'M3M Golf Estate', builder: 'M3M', locality: 'Golf Course Extension', score: '8.7', status: 'Verified' },
];

export function AdminSocietiesPage() {
  return (
    <AdminLayout title="Societies" subtitle="Manage society intelligence, scores and profile content">
      <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 md:w-96">
            <Search className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-400">Search societies</span>
          </div>
          <Button className="rounded-full bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> Add Society</Button>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Society</th>
                <th className="px-5 py-4 font-medium">Builder</th>
                <th className="px-5 py-4 font-medium">Locality</th>
                <th className="px-5 py-4 font-medium">Score</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {societies.map((item) => (
                <tr key={item.name} className="bg-white hover:bg-slate-50/70">
                  <td className="px-5 py-4 font-medium text-slate-950">{item.name}</td>
                  <td className="px-5 py-4 text-slate-600">{item.builder}</td>
                  <td className="px-5 py-4 text-slate-600">{item.locality}</td>
                  <td className="px-5 py-4 text-slate-950">{item.score}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{item.status}</span></td>
                  <td className="px-5 py-4"><Button variant="outline" size="sm" className="rounded-full">Edit</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
