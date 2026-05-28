import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, BarChart3, Eye, Image, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { AdminSociety, deleteAdminSociety, fetchAdminSocieties } from '@/lib/adminSocietyStore';

const filters = ['All', 'Verified', 'Premium', 'Draft', 'Archived'];

export function AdminSocietiesPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [societies, setSocieties] = useState<AdminSociety[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadSocieties() {
      try {
        setLoading(true);
        setError('');
        setSocieties(await fetchAdminSocieties());
      } catch (err) {
        console.error(err);
        setError('Unable to load societies from the live backend.');
      } finally {
        setLoading(false);
      }
    }

    loadSocieties();
  }, []);

  const filteredSocieties = useMemo(() => {
    return societies.filter((society) => {
      const searchText = `${society.name} ${society.builder} ${society.locality} ${society.sector}`.toLowerCase();
      const matchesQuery = searchText.includes(query.toLowerCase());
      const matchesFilter = filter === 'All' || society.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [societies, query, filter]);

  const featuredCount = societies.filter((item) => item.featured).length;
  const verifiedCount = societies.filter((item) => item.status === 'Verified' || item.status === 'Premium').length;
  const premiumCount = societies.filter((item) => item.status === 'Premium').length;
  const avgScore = societies.length
    ? (societies.reduce((sum, item) => sum + Number(item.score || 0), 0) / societies.length).toFixed(1)
    : '0.0';

  const handleDelete = async (society: AdminSociety) => {
    if (deletingId) return;
    if (!window.confirm(`Delete "${society.name}" from the live backend?`)) return;

    try {
      setDeletingId(society.id);
      setError('');
      setMessage('');
      await deleteAdminSociety(society.id);
      setSocieties((current) => current.filter((item) => item.id !== society.id));
      setMessage(`Deleted "${society.name}".`);
    } catch (err) {
      console.error(err);
      setError('Failed to delete society. Please refresh and try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout title="Societies" subtitle="Manage society intelligence, scoring, SEO and media profiles">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total societies</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{societies.length}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Verified / Premium</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{verifiedCount}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Featured</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{featuredCount}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Avg. score</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{avgScore}</p>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          {message ? (
            <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Society directory</h2>
              <p className="mt-1 text-sm text-slate-500">Create, enrich and publish Gurgaon society pages.</p>
            </div>
            <Button asChild className="rounded-full bg-blue-600 hover:bg-blue-700">
              <Link to="/admin/societies/new">
                <Plus className="mr-2 h-4 w-4" /> Add Society
              </Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 lg:w-[460px]">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search society, builder, sector or locality"
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
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-medium">Society</th>
                  <th className="px-5 py-4 font-medium">Builder</th>
                  <th className="px-5 py-4 font-medium">Location</th>
                  <th className="px-5 py-4 font-medium"><span className="inline-flex items-center gap-1">Score <ArrowUpDown className="h-3.5 w-3.5" /></span></th>
                  <th className="px-5 py-4 font-medium">Market</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Homepage</th>
                  <th className="px-5 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center font-medium text-slate-950">
                      Loading societies...
                    </td>
                  </tr>
                ) : null}

                {!loading && filteredSocieties.map((item) => (
                  <tr key={item.id} className="bg-white hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-950">{item.name}</div>
                      <div className="mt-1 text-xs text-slate-500">/{item.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{item.builder || '—'}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <div>{item.sector || '—'}</div>
                      <div className="text-xs text-slate-400">{item.locality || '—'}</div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-950">{item.score}</td>
                    <td className="px-5 py-4 text-slate-600">
                      <div className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5 text-blue-500" /> {item.rentRange || 'Rent n/a'}</div>
                      <div className="mt-1 text-xs text-slate-400">{item.buyRange || 'Sale n/a'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                        item.status === 'Draft'
                          ? 'bg-amber-50 text-amber-700'
                          : item.status === 'Premium'
                          ? 'bg-violet-50 text-violet-700'
                          : item.status === 'Archived'
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        {item.featured ? <Star className="h-4 w-4 fill-blue-500 text-blue-500" /> : <Star className="h-4 w-4" />}
                        {item.coverImage ? <Image className="h-4 w-4 text-emerald-600" /> : <Image className="h-4 w-4" />}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <Link to={`/society/${item.slug}`}><Eye className="mr-1.5 h-3.5 w-3.5" /> View</Link>
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <Link to={`/admin/societies/${item.slug || item.id}/edit`}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Link>
                        </Button>
                        <Button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && filteredSocieties.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <p className="font-medium text-slate-950">No societies found</p>
                      <p className="mt-1 text-sm text-slate-500">Try changing filters or create a new society profile.</p>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
