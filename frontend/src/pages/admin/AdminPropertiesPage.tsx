import { Link } from 'react-router-dom';
import { Edit3, Eye, Filter, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const properties = [
  {
    id: 1,
    title: '3 BHK luxury apartment with balcony',
    society: 'DLF Crest',
    locality: 'Sector 54, Gurgaon',
    type: 'Rent',
    price: '₹85,000/mo',
    status: 'Live',
    featured: true,
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80',
    updated: 'Today',
  },
  {
    id: 2,
    title: '4 BHK resale residence near Golf Course Road',
    society: 'DLF Park Place',
    locality: 'Sector 54, Gurgaon',
    type: 'Buy',
    price: '₹4.2 Cr',
    status: 'Verification',
    featured: false,
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=80',
    updated: 'Yesterday',
  },
  {
    id: 3,
    title: 'Penthouse with golf-facing views',
    society: 'M3M Golf Estate',
    locality: 'Sector 65, Gurgaon',
    type: 'Buy',
    price: '₹6.8 Cr',
    status: 'Live',
    featured: true,
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
    updated: '2 days ago',
  },
  {
    id: 4,
    title: '2 BHK family apartment with park view',
    society: 'Tata Primanti',
    locality: 'Sector 72, Gurgaon',
    type: 'Rent',
    price: '₹52,000/mo',
    status: 'Draft',
    featured: false,
    image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=400&q=80',
    updated: '4 days ago',
  },
];

const statusTone: Record<string, string> = {
  Live: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Verification: 'bg-amber-50 text-amber-700 border-amber-100',
  Draft: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function AdminPropertiesPage() {
  return (
    <AdminLayout title="Properties" subtitle="Manage rent, buy and seller inventory">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Total Properties', '428'],
            ['Live Listings', '312'],
            ['Under Verification', '42'],
            ['Featured', '28'],
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
                <Input className="h-11 rounded-full border-slate-200 pl-10" placeholder="Search title, society or locality" />
              </div>
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
              {properties.map((item) => (
                <div key={item.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.6fr_1fr_0.75fr_0.75fr_0.7fr] lg:items-center">
                  <div className="flex gap-4">
                    <img src={item.image} alt="" className="h-20 w-24 rounded-2xl object-cover" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{item.title}</p>
                        {item.featured ? <Badge className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">Featured</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.price} • Updated {item.updated}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-950">{item.society}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.locality}</p>
                  </div>

                  <div>
                    <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">{item.type}</Badge>
                  </div>

                  <div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[item.status]}`}>{item.status}</span>
                  </div>

                  <div className="flex items-center justify-start gap-2 lg:justify-end">
                    <Button variant="ghost" size="icon" className="rounded-full"><Eye className="h-4 w-4" /></Button>
                    <Button asChild variant="ghost" size="icon" className="rounded-full">
                      <Link to={`/admin/properties/${item.id}/edit`}><Edit3 className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full text-rose-600 hover:text-rose-700"><Trash2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
