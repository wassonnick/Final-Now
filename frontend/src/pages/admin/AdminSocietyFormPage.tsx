import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ImagePlus, Save } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const existingSocieties = [
  {
    id: 'dlf-crest',
    name: 'DLF Crest',
    slug: 'dlf-crest',
    builder: 'DLF',
    locality: 'Sector 54',
    sector: 'Sector 54',
    score: '9.1',
    status: 'Verified',
    featured: true,
    latitude: '28.4421',
    longitude: '77.1057',
    rentRange: '₹55K - ₹90K',
    buyRange: '₹5Cr - ₹7.5Cr',
    description: 'Premium Golf Course Road society with strong maintenance, luxury amenities and high tenant demand.',
    amenities: 'Clubhouse, Swimming Pool, Gym, Security, Power Backup, Visitor Parking',
  },
  {
    id: 'dlf-park-place',
    name: 'DLF Park Place',
    slug: 'dlf-park-place',
    builder: 'DLF',
    locality: 'Golf Course Road',
    sector: 'Sector 54',
    score: '8.9',
    status: 'Verified',
    featured: true,
    latitude: '28.4414',
    longitude: '77.1068',
    rentRange: '₹60K - ₹1.2L',
    buyRange: '₹6.5Cr - ₹9Cr',
    description: 'Established luxury community with high livability and excellent connectivity.',
    amenities: 'Clubhouse, Pool, Landscaped Greens, Security, Maintenance, Sports Courts',
  },
];

const emptySociety = {
  name: '',
  slug: '',
  builder: '',
  locality: '',
  sector: '',
  score: '8.5',
  status: 'Draft',
  featured: false,
  latitude: '',
  longitude: '',
  rentRange: '',
  buyRange: '',
  description: '',
  amenities: '',
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AdminSocietyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const mode = id ? 'edit' : 'new';

  const initialData = useMemo(() => {
    if (!id) return emptySociety;
    return existingSocieties.find((society) => society.id === id) ?? emptySociety;
  }, [id]);

  const [form, setForm] = useState(initialData);
  const [saved, setSaved] = useState(false);

  const updateField = (field: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === 'name' && mode === 'new' ? { slug: slugify(String(value)) } : {}),
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(true);
    window.setTimeout(() => navigate('/admin/societies'), 800);
  };

  return (
    <AdminLayout
      title={mode === 'edit' ? 'Edit society' : 'Add society'}
      subtitle={mode === 'edit' ? 'Update society intelligence and public page details' : 'Create a new society intelligence profile'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="w-fit rounded-full" asChild>
            <Link to="/admin/societies"><ArrowLeft className="mr-2 h-4 w-4" /> Back to societies</Link>
          </Button>
          <Button type="submit" className="rounded-full bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" /> {mode === 'edit' ? 'Save changes' : 'Create society'}
          </Button>
        </div>

        {saved && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5" /> Society saved locally. API connection comes in the next backend phase.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Basic information</h2>
              <p className="mt-1 text-sm text-slate-500">These details appear on the public society profile.</p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Society name</span>
                  <Input value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="DLF Crest" className="rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">URL slug</span>
                  <Input value={form.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="dlf-crest" className="rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Builder</span>
                  <Input value={form.builder} onChange={(event) => updateField('builder', event.target.value)} placeholder="DLF" className="rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Locality</span>
                  <Input value={form.locality} onChange={(event) => updateField('locality', event.target.value)} placeholder="Golf Course Road" className="rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Sector</span>
                  <Input value={form.sector} onChange={(event) => updateField('sector', event.target.value)} placeholder="Sector 54" className="rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Society score</span>
                  <Input value={form.score} onChange={(event) => updateField('score', event.target.value)} placeholder="9.1" className="rounded-2xl" />
                </label>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Market positioning</h2>
              <p className="mt-1 text-sm text-slate-500">Rent, resale and intelligence copy for the profile page.</p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Rent range</span>
                  <Input value={form.rentRange} onChange={(event) => updateField('rentRange', event.target.value)} placeholder="₹55K - ₹90K" className="rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Buy range</span>
                  <Input value={form.buyRange} onChange={(event) => updateField('buyRange', event.target.value)} placeholder="₹5Cr - ₹7.5Cr" className="rounded-2xl" />
                </label>
              </div>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  placeholder="Write a concise society overview..."
                  className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Amenities</span>
                <textarea
                  value={form.amenities}
                  onChange={(event) => updateField('amenities', event.target.value)}
                  placeholder="Clubhouse, Pool, Gym, Security..."
                  className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Publishing</h2>
              <div className="mt-5 space-y-4">
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => updateField('status', event.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  >
                    <option>Draft</option>
                    <option>Verified</option>
                    <option>Premium</option>
                  </select>
                </label>

                <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium text-slate-700">Featured society</span>
                    <span className="text-xs text-slate-500">Show on homepage carousel</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(event) => updateField('featured', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-blue-600"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Location</h2>
              <div className="mt-5 grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Latitude</span>
                  <Input value={form.latitude} onChange={(event) => updateField('latitude', event.target.value)} placeholder="28.4421" className="rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Longitude</span>
                  <Input value={form.longitude} onChange={(event) => updateField('longitude', event.target.value)} placeholder="77.1057" className="rounded-2xl" />
                </label>
              </div>
            </section>

            <section className="rounded-[32px] border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <ImagePlus className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950">Images</h2>
              <p className="mt-1 text-sm text-slate-500">Cover image and gallery upload will connect to storage in the backend phase.</p>
              <Button type="button" variant="outline" className="mt-5 rounded-full">Upload placeholder</Button>
            </section>
          </aside>
        </div>
      </form>
    </AdminLayout>
  );
}
