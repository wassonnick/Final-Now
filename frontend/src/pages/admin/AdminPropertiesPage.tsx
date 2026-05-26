import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Edit3, Eye, Filter, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AdminProperty,
  deleteAdminProperty,
  duplicateAdminProperty,
  getAdminProperties,
} from '@/lib/adminPropertyStore';

const statusTone: Record<string, string> = {
  Live: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Verification: 'bg-amber-50 text-amber-700 border-amber-100',
  Draft: 'bg-slate-100 text-slate-600 border-slate-200',
  Archived: 'bg-rose-50 text-rose-700 border-rose-100',
};

function getPropertyImage(item: AdminProperty) {
  return item.images[0] || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80';
}

export function AdminPropertiesPage() {
  const [properties, setProperties] = useState<AdminProperty[]>(() => getAdminProperties());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return properties.filter((item) => {
      const matchesQuery = !term || [item.title, item.society, item.locality, item.price]
        .join(' ')
        .toLowerCase()
        .includes(term);
      const matchesStatus = status === 'All' || item.status === status;
      const matchesType = type === 'All' || item.listingType === type;
      return matchesQuery && matchesStatus && matchesType;
    });
  }, [properties, query, status, type]);

  const stats = useMemo(() => {
    return {
      total: properties.length,
      live: properties.filter((item) => item.status === 'Live').length,
      verification: properties.filter((item) => item.status === 'Verification').length,
      featured: properties.filter((item) => item.featured).length,
    };
  }, [properties]);

  const handleDelete = (item: AdminProperty) => {
    const confirmed = window.confirm(`Delete "${item.title}"? This only removes it from local admin data for now.`);
    if (!confirmed) return;
    setProperties(deleteAdminProperty(item.id));
  };

  const handleDuplicate = (item: AdminProperty) => {
    setProperties(duplicateAdminProperty(item.id));
  };

  return (
    <AdminLayout title="Properties" subtitle="Manage rent, buy and seller inventory">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Total Properties', String(stats.total)],
            ['Live Listings', String(stats.live)],
            ['Under Verification', String(stats.verification)],
            ['Featured', String(stats.featured)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Property Inventory</h2>
              <p className="mt-1 text-sm text-slate-500">Search, verify and update listings across Gurgaon societies.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:w-80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="h-11 rounded-full border-slate-200 pl-10"
                  placeholder="Search title, society or locality"
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              >
                {['All', 'Live', 'Verification', 'Draft', 'Archived'].map((item) => <option key={item}>{item}</option>)}
              </select>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="h-11 rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
              >
                {['All', 'Rent', 'Buy / Resale', 'Sell Listing', 'Builder Floor'].map((item) => <option key={item}>{item}</option>)}
              </select>
              <Button variant="outline" className="h-11 rounded-full border-slate-200">
                <Filter className="mr-2 h-4 w-4" /> Filters
              </Button>
              <Button asChild className="h-11 rounded-full bg-blue-600 px-5 hover:bg-blue-700">
                <Link to="/admin/properties/new"><Plus className="mr-2 h-4 w-4" /> Add Property</Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-slate-200">
            <div className="hidden grid-cols-[1.6fr_1fr_0.75fr_0.75fr_0.7fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 lg:grid">
              <div>Property</div>
              <div>Society</div>
              <div>Type</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>

            <div className="divide-y divide-slate-200">
              {filtered.map((item) => (
                <div key={item.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.6fr_1fr_0.75fr_0.75fr_0.7fr] lg:items-center">
                  <div className="flex gap-4">
                    <img src={getPropertyImage(item)} alt="" className="h-20 w-24 rounded-2xl object-cover" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{item.title || 'Untitled property'}</p>
                        {item.featured ? <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">Featured</Badge> : null}
                        {item.verified ? <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Verified</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.price || 'Price pending'} • Updated {item.updated}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-950">{item.society}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.locality}</p>
                  </div>

                  <div>
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">{item.listingType}</Badge>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[item.status]}`}>{item.status}</span>
                  </div>

                  <div className="flex items-center justify-start gap-2 lg:justify-end">
                    <Button variant="ghost" size="icon" className="rounded-full" title="Preview"><Eye className="h-4 w-4" /></Button>
                    <Button asChild variant="ghost" size="icon" className="rounded-full" title="Edit">
                      <Link to={`/admin/properties/${item.id}/edit`}><Edit3 className="h-4 w-4" /></Link>
                    </Button>
                    <Button onClick={() => handleDuplicate(item)} variant="ghost" size="icon" className="rounded-full" title="Duplicate"><Copy className="h-4 w-4" /></Button>
                    <Button onClick={() => handleDelete(item)} variant="ghost" size="icon" className="rounded-full text-rose-600 hover:text-rose-700" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 ? (
                <div className="px-5 py-14 text-center">
                  <p className="font-medium text-slate-950">No properties found</p>
                  <p className="mt-1 text-sm text-slate-500">Try changing filters or create a new property listing.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
