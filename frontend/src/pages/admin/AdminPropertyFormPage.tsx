import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Save, Sparkles, UploadCloud, X } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AdminProperty,
  createEmptyAdminProperty,
  getAdminProperty,
  upsertAdminProperty,
} from '@/lib/adminPropertyStore';

const societies = ['DLF Crest', 'DLF Park Place', 'M3M Golf Estate', 'Tata Primanti', 'Ireo Victory Valley', 'Aralias'];
const localities = ['Sector 54, Gurgaon', 'Golf Course Road, Gurgaon', 'Sector 65, Gurgaon', 'Sector 72, Gurgaon', 'DLF Phase 5, Gurgaon', 'Sohna Road, Gurgaon'];
const amenities = ['Power Backup', 'Clubhouse', 'Swimming Pool', 'Gym', 'Security', 'Pet Friendly', 'Park View', 'Servant Room'];

function getInitialProperty(id: string | undefined): AdminProperty {
  if (id) {
    const existing = getAdminProperty(id);
    if (existing) return existing;
  }
  return createEmptyAdminProperty();
}

export function AdminPropertyFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [property, setProperty] = useState<AdminProperty>(() => getInitialProperty(id));
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setProperty(getInitialProperty(id));
    setError('');
    setSuccess('');
  }, [id]);

  const updateField = <K extends keyof AdminProperty>(key: K, value: AdminProperty[K]) => {
    setProperty((current) => ({ ...current, [key]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const toggleAmenity = (amenity: string, checked: boolean | 'indeterminate') => {
    setProperty((current) => {
      const enabled = checked === true;
      const nextAmenities = enabled
        ? Array.from(new Set([...current.amenities, amenity]))
        : current.amenities.filter((item) => item !== amenity);
      return { ...current, amenities: nextAmenities };
    });
  };

  const readImages = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
    if (!files.length) {
      setError('Please select JPG, PNG or WebP images only.');
      return;
    }

    const readers = files.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }));

    try {
      const images = await Promise.all(readers);
      setProperty((current) => ({ ...current, images: [...current.images, ...images].slice(0, 8) }));
      setError('');
      setSuccess(`${images.length} image${images.length > 1 ? 's' : ''} added.`);
    } catch {
      setError('Could not read the selected images. Please try again.');
    }
  };

  const handleImages = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) await readImages(event.target.files);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) await readImages(event.dataTransfer.files);
  };

  const removeImage = (image: string) => {
    setProperty((current) => ({ ...current, images: current.images.filter((item) => item !== image) }));
  };

  const handleSave = (status: AdminProperty['status']) => {
    const title = property.title.trim();
    if (!title) {
      setError('Property title is required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const propertyToSave: AdminProperty = {
      ...property,
      title,
      price: property.price.trim() || 'On Request',
      status,
    };

    try {
      upsertAdminProperty(propertyToSave);
      setSuccess(status === 'Draft' ? 'Property draft saved.' : 'Property listing saved and published.');
      window.alert(status === 'Draft' ? 'Property draft saved.' : 'Property listing saved and published.');
      navigate('/admin/properties');
    } catch (saveError) {
      console.error(saveError);
      setError('Could not save the property. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generateDescription = () => {
    const text = `${property.bedrooms || 'Spacious'} BHK ${property.listingType.toLowerCase()} listing in ${property.society}, ${property.locality}. Ideal for families and professionals looking for a verified society with strong connectivity, security and lifestyle amenities.`;
    updateField('description', text);
  };

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
          <Button type="button" onClick={() => handleSave('Draft')} variant="outline" className="rounded-full border-slate-200">Save Draft</Button>
          <Button type="button" onClick={() => handleSave('Live')} className="rounded-full bg-blue-600 px-5 hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Publish Listing</Button>
        </div>
      </div>

      {error ? (
        <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

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
                <Input
                  value={property.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  className="mt-2 h-12 rounded-2xl border-slate-200"
                  placeholder="3 BHK in DLF Crest with park view"
                />
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">Listing Type</span>
                <select
                  value={property.listingType}
                  onChange={(event) => updateField('listingType', event.target.value as AdminProperty['listingType'])}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                >
                  <option>Rent</option>
                  <option>Buy / Resale</option>
                  <option>Sell Listing</option>
                  <option>Builder Floor</option>
                </select>
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">Status</span>
                <select
                  value={property.status}
                  onChange={(event) => updateField('status', event.target.value as AdminProperty['status'])}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                >
                  <option>Live</option>
                  <option>Verification</option>
                  <option>Draft</option>
                  <option>Archived</option>
                </select>
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">Society</span>
                <select
                  value={property.society}
                  onChange={(event) => updateField('society', event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                >
                  {societies.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <label>
                <span className="text-sm font-medium text-slate-700">Locality</span>
                <select
                  value={property.locality}
                  onChange={(event) => updateField('locality', event.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                >
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
                <Input value={property.price} onChange={(event) => updateField('price', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="₹85,000/mo or ₹4.2 Cr" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Security Deposit</span>
                <Input value={property.securityDeposit} onChange={(event) => updateField('securityDeposit', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="₹1,70,000" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Maintenance</span>
                <Input value={property.maintenance} onChange={(event) => updateField('maintenance', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="Included / ₹12,000" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Bedrooms</span>
                <Input value={property.bedrooms} onChange={(event) => updateField('bedrooms', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="3" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Bathrooms</span>
                <Input value={property.bathrooms} onChange={(event) => updateField('bathrooms', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="3" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Area (sq ft)</span>
                <Input value={property.areaSqft} onChange={(event) => updateField('areaSqft', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="2200" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Floor</span>
                <Input value={property.floor} onChange={(event) => updateField('floor', event.target.value)} className="mt-2 h-12 rounded-2xl border-slate-200" placeholder="12 of 28" />
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Facing</span>
                <select value={property.facing} onChange={(event) => updateField('facing', event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
                  <option>North-East</option>
                  <option>East</option>
                  <option>North</option>
                  <option>South</option>
                  <option>West</option>
                </select>
              </label>
              <label>
                <span className="text-sm font-medium text-slate-700">Furnished Status</span>
                <select value={property.furnishedStatus} onChange={(event) => updateField('furnishedStatus', event.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50">
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
              <Button type="button" onClick={generateDescription} variant="outline" className="rounded-full border-slate-200"><Sparkles className="mr-2 h-4 w-4" /> Generate with AI</Button>
            </div>

            <label>
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={property.description}
                onChange={(event) => updateField('description', event.target.value)}
                className="mt-2 min-h-36 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                placeholder="Describe the property, society, view, floor, furnishing, nearby offices and ideal tenant/buyer profile."
              />
            </label>

            <div className="mt-6">
              <p className="text-sm font-medium text-slate-700">Amenities</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {amenities.map((item) => (
                  <label key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <Checkbox checked={property.amenities.includes(item)} onCheckedChange={(checked) => toggleAmenity(item, checked)} /> {item}
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Media</h2>
            <p className="mt-1 text-sm text-slate-500">Upload cover and gallery images. Phase 2 stores these locally until backend upload is connected.</p>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <ImagePlus className="h-6 w-6" />
              </div>
              <p className="mt-4 font-medium text-slate-950">Drop property photos here</p>
              <p className="mt-1 text-sm text-slate-500">JPG, PNG or WebP. Use real society/property images.</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-full border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              >
                <UploadCloud className="mr-2 h-4 w-4" /> Upload Images
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
            </div>

            {property.images.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {property.images.map((image) => (
                  <div key={image} className="group relative overflow-hidden rounded-2xl border border-slate-200">
                    <img src={image} alt="Property preview" className="h-28 w-full object-cover" />
                    <button type="button" aria-label="Remove image" onClick={() => removeImage(image)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Publishing</h2>
            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <Checkbox checked={property.featured} onCheckedChange={(checked) => updateField('featured', checked === true)} />
                <span>
                  <span className="block text-sm font-medium text-slate-950">Feature this property</span>
                  <span className="block text-sm text-slate-500">Show on homepage and society page.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                <Checkbox checked={property.verified} onCheckedChange={(checked) => updateField('verified', checked === true)} />
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
