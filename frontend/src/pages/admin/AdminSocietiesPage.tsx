import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Building2, Eye, Image, Pencil, Plus, Search, Sparkles, Star, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { AdminSociety, deleteAdminSociety, enrichAdminSociety, fetchAdminSocieties } from '@/lib/adminSocietyStore';

const filters = ['All', 'Verified', 'Premium', 'Draft', 'Archived'];

export function AdminSocietiesPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [societies, setSocieties] = useState<AdminSociety[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [enrichingId, setEnrichingId] = useState<number | null>(null);

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

  const handleEnrich = async (society: AdminSociety) => {
    if (enrichingId) return;
    if (!society.sourceUrl) {
      setError('This society has no import source URL to enrich from.');
      return;
    }

    try {
      setEnrichingId(society.id);
      setError('');
      setMessage('');
      const result = await enrichAdminSociety(society.id);
      setSocieties((current) => current.map((item) => (item.id === result.society.id ? result.society : item)));
      const fieldText = result.updatedFields.length ? ` Updated: ${result.updatedFields.join(', ')}.` : ' No new fields changed.';
      const diagnosticText = [result.diagnostics.geocode, result.diagnostics.nearby].filter(Boolean).join(' ');
      setMessage(`Enriched "${result.society.name}".${fieldText} ${diagnosticText}`.trim());
    } catch (err) {
      console.error(err);
      setError('Failed to enrich society. Check the source URL and try again.');
    } finally {
      setEnrichingId(null);
    }
  };

  return (
    <AdminLayout title="Societies" subtitle="Manage society intelligence, scoring, SEO and media profiles">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total societies', societies.length],
            ['Verified / Premium', verifiedCount],
            ['Featured', featuredCount],
            ['Avg. score', avgScore],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <section className="space-y-4">
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

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Society directory</h2>
              <p className="mt-1 text-sm text-slate-500">Search, edit and publish Gurgaon society profiles.</p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 lg:w-[380px]">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search society, builder or sector"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-700">
                <Link to="/admin/societies/new">
                  <Plus className="mr-2 h-4 w-4" /> Add Society
                </Link>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                  filter === item
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center font-medium text-slate-950 shadow-sm">
              Loading societies...
            </div>
          ) : null}

          {!loading && filteredSocieties.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
              <p className="font-medium text-slate-950">No societies found</p>
              <p className="mt-1 text-sm text-slate-500">Try changing filters or create a new society profile.</p>
            </div>
          ) : null}

          {!loading && filteredSocieties.map((item) => (
            <article key={item.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 lg:grid-cols-[1.4fr_1fr_0.75fr_260px] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-950">{item.name}</h3>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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
                </div>
                <p className="mt-1 text-sm text-slate-500">/{item.slug}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                  <span>{item.builder || 'Builder n/a'}</span>
                  <span className="text-slate-300">|</span>
                  <span>{[item.sector, item.locality].filter(Boolean).join(', ') || 'Gurgaon'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Score</p>
                  <p className="mt-1 font-semibold text-slate-950">{item.score}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Rent</p>
                  <p className="mt-1 font-semibold text-slate-950">{item.rentRange || 'n/a'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Sale</p>
                  <p className="mt-1 font-semibold text-slate-950">{item.buyRange || 'n/a'}</p>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  {item.featured ? <Star className="h-4 w-4 fill-blue-500 text-blue-500" /> : <Star className="h-4 w-4" />}
                  {item.coverImage ? <Image className="h-4 w-4 text-emerald-600" /> : <Image className="h-4 w-4" />}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Building2 className="h-4 w-4 text-slate-400" />
                {item.propertiesCount || 0} linked listings
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
                <Button
                  onClick={() => handleEnrich(item)}
                  disabled={enrichingId === item.id || !item.sourceUrl}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-blue-100 text-blue-700 hover:bg-blue-50"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {enrichingId === item.id ? 'Enriching' : 'Enrich'}
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <Link to={`/society/${item.slug}`}><Eye className="mr-1.5 h-3.5 w-3.5" /> View</Link>
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl" asChild>
                  <Link to={`/admin/societies/${item.slug || item.id}/edit`}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit</Link>
                </Button>
                <Button
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </AdminLayout>
  );
}
