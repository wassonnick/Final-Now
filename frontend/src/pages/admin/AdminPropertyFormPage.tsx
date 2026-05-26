import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Save, Sparkles, UploadCloud } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

const societies = ['DLF Crest', 'DLF Park Place', 'M3M Golf Estate', 'Tata Primanti', 'Ireo Victory Valley', 'Aralias'];
const localities = ['Sector 54', 'Golf Course Road', 'Sector 65', 'Sector 72', 'DLF Phase 5', 'Sohna Road'];
const amenities = ['Power Backup', 'Clubhouse', 'Swimming Pool', 'Gym', 'Security', 'Pet Friendly', 'Park View', 'Servant Room'];

export function AdminPropertyFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  return (
    <AdminLayout
      title={isEdit ? 'Edit Property' : 'Add Property'}
      subtitle={isEdit ? 'Update listing details, status and verification' : 'Create a rent, buy or seller inventory listing'}
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button asChild variant="ghost" className="w-fit rounded-full text-slate-600 hover:text-slate-950">
          <Link to="/admin/properties"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Properties</Link>
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-full border-slate-200">Save Draft</Button>
          <Button className="rounded-full bg-blue-600 px-5 hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Publish Listing</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Basic Details</h2>
              <p className="mt-1 text-sm text-slate-500">Keep the title clear and society-first for better enquiry quality.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="text-sm font-medium text-slate-700">Property Title</span>
                <Input className="mt-2 h-12 rounded-2xl border-slate-200" defaultValue={isEdit ? '3 BHK luxury apartment with balcony' : ''} placeholder="3 BHK in DLF Crest with park view" />
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">Listing Type</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  <option>Rent</option>
                  <option>Buy / Resale</option>
                  <option>Sell Listing</option>
                  <option>Builder Floor</option>
                </select>
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  <option>Live</option>
                  <option>Verification</option>
                  <option>Draft</option>
                  <option>Archived</option>
                </select>
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">Society</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  {societies.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">Locality</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  {localities.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Pricing & Configuration</h2>
              <p className="mt-1 text-sm text-slate-500">These fields support rent, resale and seller inventory workflows.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <label>
                <span className="text-sm font-medium text-slate-700">Price / Rent</span>
                <Input className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="85000 or 42000000" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Security Deposit</span>
                <Input className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="170000" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Maintenance</span>
                <Input className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="Included / 12000" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Bedrooms</span>
                <Input className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="3" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Bathrooms</span>
                <Input className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="3" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Area (sq ft)</span>
                <Input className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="2200" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Floor</span>
                <Input className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="12 of 28" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Facing</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  <option>North-East</option>
                  <option>East</option>
                  <option>North</option>
                  <option>South</option>
                  <option>West</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Furnished Status</span>
                <select className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  <option>Semi Furnished</option>
                  <option>Fully Furnished</option>
                  <option>Unfurnished</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">Description & Amenities</h2>
                <p className="mt-1 text-sm text-slate-500">Write a clean, society-first description for buyers and tenants.</p>
              </div>
              <Button variant="outline" className="rounded-full border-slate-200"><Sparkles className="mr-2 h-4 w-4" /> Generate with AI</Button>
            </div>

            <label>
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                className="mt-2 min-h-36 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                placeholder="Describe the property, society, view, floor, furnishing, nearby offices and ideal tenant/buyer profile."
              />
            </label>

            <div className="mt-6">
              <p className="text-sm font-medium text-slate-700">Amenities</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {amenities.map((item) => (
                  <label key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <Checkbox /> {item}
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Media</h2>
            <p className="mt-1 text-sm text-slate-500">Upload cover and gallery images.</p>

            <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ImagePlus className="h-6 w-6" />
              </div>
              <p className="mt-4 font-medium text-slate-950">Drop property photos here</p>
              <p className="mt-1 text-sm text-slate-500">JPG, PNG or WebP. Use real society/property images.</p>
              <Button variant="outline" className="mt-4 rounded-full border-slate-200"><UploadCloud className="mr-2 h-4 w-4" /> Upload Images</Button>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Publishing</h2>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <Checkbox defaultChecked />
                <span>
                  <span className="block text-sm font-medium text-slate-950">Feature this property</span>
                  <span className="block text-sm text-slate-500">Show on homepage and society page.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <Checkbox defaultChecked />
                <span>
                  <span className="block text-sm font-medium text-slate-950">Mark as verified</span>
                  <span className="block text-sm text-slate-500">Use only after owner/broker verification.</span>
                </span>
              </label>
            </div>
          </section>
        </aside>
      </div>
    </AdminLayout>
  );
}
