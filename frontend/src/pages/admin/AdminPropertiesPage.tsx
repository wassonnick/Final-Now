import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BedDouble,
  Copy,
  Edit3,
  Eye,
  Home,
  MapPin,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  'https://final-now.onrender.com/api';

const statusTone: Record<string, string> = {
  Live: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Verification: 'bg-amber-50 text-amber-700 border-amber-100',
  Draft: 'bg-slate-100 text-slate-600 border-slate-200',
  Archived: 'bg-rose-50 text-rose-700 border-rose-100',
};

const statuses = ['All', 'Live', 'Verification', 'Draft', 'Archived'];
const listingTypes = ['All', 'Rent', 'Sale', 'Buy / Resale', 'Sell Listing', 'Builder Floor'];

function getPropertyImage(item: any) {
  if (Array.isArray(item.images) && item.images[0]) {
    return item.images[0];
  }

  if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images);

      if (Array.isArray(parsed) && parsed[0]) {
        return parsed[0];
      }
    } catch {
      //
    }
  }

  return 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80';
}

function getSocietyName(item: any) {
  if (typeof item?.society === 'string') {
    return item.society;
  }

  if (typeof item?.society === 'object' && item?.society?.name) {
    return item.society.name;
  }

  return item?.society_name || '-';
}

function parseArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^\/+/, '')
    .replace(/^property\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getListingType(item: any) {
  return item?.listingType || item?.listing_type || '-';
}

export function AdminPropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicatingId, setDuplicatingId] = useState<number | string | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

  useEffect(() => {
    async function loadProperties() {
      try {
        const res = await fetch(`${API_BASE}/admin/properties`);
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(json?.message || 'Failed to load properties');
        }

        const items = Array.isArray(json?.data)
          ? json.data
          : json?.data?.data || [];

        setProperties(items);
        setErrorMessage('');
      } catch (err) {
        console.error(err);
        setErrorMessage('Unable to load properties from the live backend.');
      } finally {
        setLoading(false);
      }
    }

    loadProperties();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return properties.filter((item: any) => {
      const searchable = [
        item?.title || '',
        getSocietyName(item),
        item?.locality || '',
        item?.price || '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !term || searchable.includes(term);
      const matchesStatus = status === 'All' || item?.status === status;
      const matchesType = type === 'All' || getListingType(item) === type;

      return matchesQuery && matchesStatus && matchesType;
    });
  }, [properties, query, status, type]);

  const stats = useMemo(() => {
    return {
      total: properties.length,
      live: properties.filter((item: any) => item?.status === 'Live').length,
      verification: properties.filter((item: any) => item?.status === 'Verification').length,
      featured: properties.filter((item: any) => item?.featured).length,
    };
  }, [properties]);

  const duplicateProperty = async (item: any) => {
    if (duplicatingId) return;

    const title = `${item?.title || 'Untitled property'} Copy`;
    const baseSlug = makeSlug(item?.slug || item?.title || 'property');

    const payload = {
      title,
      slug: `${baseSlug}-copy-${Date.now().toString(36)}`,
      listing_type: getListingType(item) === '-' ? 'Rent' : getListingType(item),
      status: 'Draft',
      society: getSocietyName(item) === '-' ? '' : getSocietyName(item),
      locality: item?.locality || '',
      price: item?.price || '',
      security_deposit: item?.security_deposit || item?.securityDeposit || '',
      maintenance: item?.maintenance || '',
      bedrooms: item?.bedrooms || '',
      bathrooms: item?.bathrooms || '',
      area_sqft: item?.area_sqft || item?.areaSqft || '',
      floor: item?.floor || '',
      facing: item?.facing || '',
      furnished_status: item?.furnished_status || item?.furnishedStatus || '',
      description: item?.description || '',
      amenities: parseArray(item?.amenities),
      images: parseArray(item?.images),
      featured: false,
      verified: false,
    };

    try {
      setDuplicatingId(item.id);
      setActionMessage('');
      setErrorMessage('');

      const response = await fetch(`${API_BASE}/admin/properties`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || 'Duplicate failed');
      }

      if (json?.data) {
        setProperties((current) => [json.data, ...current]);
      }

      setActionMessage(`Duplicated "${item?.title || 'property'}" as a draft.`);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to duplicate property. Please try again.');
    } finally {
      setDuplicatingId(null);
    }
  };

  const deleteProperty = async (item: any) => {
    if (deletingId) return;

    const confirmed = window.confirm(`Delete "${item?.title || 'this property'}" ?`);

    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      setActionMessage('');
      setErrorMessage('');

      const response = await fetch(`${API_BASE}/admin/properties/${item.id}`, {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
        },
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.message || 'Delete failed');
      }

      setProperties((prev) => prev.filter((property) => property.id !== item.id));
      setActionMessage(`Deleted "${item?.title || 'property'}".`);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to delete property. Please refresh and try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout
      title="Properties"
      subtitle="Manage rent, buy and seller inventory"
    >
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total properties', stats.total],
            ['Live listings', stats.live],
            ['Under verification', stats.verification],
            ['Featured', stats.featured],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          {actionMessage ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {actionMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Property inventory</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search, publish and update Gurgaon listings.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 xl:w-[360px]">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  placeholder="Search title, society or locality"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:flex">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                >
                  {statuses.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>

                <select
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                >
                  {listingTypes.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </div>

              <Button asChild className="rounded-xl bg-blue-600 hover:bg-blue-700">
                <Link to="/admin/properties/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Property
                </Link>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center font-medium text-slate-950 shadow-sm">
              Loading properties...
            </div>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center shadow-sm">
              <p className="font-medium text-slate-950">No properties found</p>
              <p className="mt-1 text-sm text-slate-500">Try changing filters or create a new property listing.</p>
            </div>
          ) : null}

          {!loading && filtered.map((item: any) => {
            const itemStatus = item?.status || 'Live';
            const listingType = getListingType(item);

            return (
              <article
                key={item.id}
                className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 xl:grid-cols-[1.45fr_1fr_0.8fr_210px] xl:items-center"
              >
                <div className="flex min-w-0 gap-4">
                  <img
                    src={getPropertyImage(item)}
                    alt=""
                    className="h-24 w-28 shrink-0 rounded-xl object-cover"
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="max-w-xl text-base font-semibold text-slate-950">
                        {item?.title || 'Untitled property'}
                      </h3>

                      {item?.featured ? (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          Featured
                        </span>
                      ) : null}

                      {item?.verified ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Verified
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-1 text-sm font-medium text-slate-700">{item?.price || 'Price pending'}</p>

                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Home className="h-4 w-4 text-slate-400" />
                        {getSocietyName(item)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {item?.locality || 'Gurgaon'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Type</p>
                    <p className="mt-1 font-semibold text-slate-950">{listingType}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">BHK</p>
                    <p className="mt-1 font-semibold text-slate-950">{item?.bedrooms || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">Area</p>
                    <p className="mt-1 font-semibold text-slate-950">{item?.area_sqft || item?.areaSqft || '-'}</p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <BedDouble className="h-4 w-4 text-slate-400" />
                    {item?.furnished_status || item?.furnishedStatus || 'Furnishing n/a'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[itemStatus] || statusTone.Live}`}>
                    {itemStatus}
                  </span>
                  <span className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    {item?.floor || 'Floor n/a'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link to={`/property/${item?.slug || item?.id}`}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      View
                    </Link>
                  </Button>

                  <Button variant="outline" size="sm" className="rounded-xl" asChild>
                    <Link to={`/admin/properties/${item.id}/edit`}>
                      <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    disabled={duplicatingId === item.id || deletingId === item.id}
                    onClick={() => duplicateProperty(item)}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copy
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    disabled={deletingId === item.id || duplicatingId === item.id}
                    onClick={() => deleteProperty(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </AdminLayout>
  );
}
