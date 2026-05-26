import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';

const societies = [
  {
    id: 'dlf-crest',
    name: 'DLF Crest',
    builder: 'DLF',
    locality: 'Sector 54',
    score: '9.1',
    properties: 84,
    status: 'Verified',
    featured: true,
    updated: 'Today',
  },
  {
    id: 'dlf-park-place',
    name: 'DLF Park Place',
    builder: 'DLF',
    locality: 'Golf Course Road',
    score: '8.9',
    properties: 126,
    status: 'Verified',
    featured: true,
    updated: 'Yesterday',
  },
  {
    id: 'the-aralias',
    name: 'The Aralias',
    builder: 'DLF',
    locality: 'Sector 42',
    score: '9.5',
    properties: 18,
    status: 'Premium',
    featured: true,
    updated: '2 days ago',
  },
  {
    id: 'm3m-golf-estate',
    name: 'M3M Golf Estate',
    builder: 'M3M',
    locality: 'Golf Course Extension',
    score: '8.7',
    properties: 93,
    status: 'Verified',
    featured: false,
    updated: '4 days ago',
  },
  {
    id: 'ireo-victory-valley',
    name: 'Ireo Victory Valley',
    builder: 'Ireo',
    locality: 'Sector 67',
    score: '8.4',
    properties: 67,
    status: 'Draft',
    featured: false,
    updated: '1 week ago',
  },
];

const filters = ['All', 'Verified', 'Premium', 'Draft'];

export function AdminSocietiesPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');

  const filteredSocieties = useMemo(() => {
    return societies.filter((society) => {
      const searchText = `${society.name} ${society.builder} ${society.locality}`.toLowerCase();
      const matchesQuery = searchText.includes(query.toLowerCase());
      const matchesFilter = filter === 'All' || society.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  return (
    <AdminLayout title="Societies" subtitle="Manage society intelligence, scoring and profile content">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total societies</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">150+</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Verified</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">118</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Featured</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">24</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Avg. score</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">8.7</p>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Society directory</h2>
              <p className="mt-1 text-sm text-slate-500">Create, edit and verify Gurgaon society pages.</p>
            </div>
            <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
              <Link to="/admin/societies/new">
                <Plus className="mr-2 h-4 w-4" /> Add Society
              </Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 lg:w-[420px]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search society, builder or locality"
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    filter === item
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Society</th>
                  <th className="px-5 py-4 font-medium">Builder</th>
                  <th className="px-5 py-4 font-medium">Locality</th>
                  <th className="px-5 py-4 font-medium">
                    <span className="inline-flex items-center gap-1">Score <ArrowUpDown className="h-3.5 w-3.5" /></span>
                  </th>
                  <th className="px-5 py-4 font-medium">Properties</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Updated</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSocieties.map((item) => (
                  <tr key={item.id} className="bg-white hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-950">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">/{item.id}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{item.builder}</td>
                    <td className="px-5 py-4 text-slate-600">{item.locality}</td>
                    <td className="px-5 py-4 font-semibold text-slate-950">{item.score}</td>
                    <td className="px-5 py-4 text-slate-600">{item.properties}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        item.status === 'Draft'
                          ? 'bg-amber-50 text-amber-700'
                          : item.status === 'Premium'
                          ? 'bg-violet-50 text-violet-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{item.updated}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <Link to={`/society/${item.id}`}><Eye className="mr-1.5 h-3.5 w-3.5" /> View</Link>
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <Link to={`/admin/societies/${item.id}/edit`}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
