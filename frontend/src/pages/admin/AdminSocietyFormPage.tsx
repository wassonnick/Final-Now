import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, ImagePlus, Save, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { uploadAdminImage } from '@/lib/adminApi';
import {
  createEmptyAdminSociety,
  enrichAdminSociety,
  fetchAdminSociety,
  saveAdminSociety,
  slugifySociety,
  societyAmenityOptions,
} from '@/lib/adminSocietyStore';
import type { AdminSociety } from '@/lib/adminSocietyStore';

export function AdminSocietyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [society, setSociety] = useState<AdminSociety>(() => createEmptyAdminSociety());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [loadedSourceUrl, setLoadedSourceUrl] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function loadSociety() {
      if (!id) {
        setSociety(createEmptyAdminSociety());
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const loadedSociety = await fetchAdminSociety(id);
        setSociety(loadedSociety);
        setLoadedSourceUrl(loadedSociety.officialProjectUrl || loadedSociety.sourceUrl);
      } catch (err) {
        console.error(err);
        setError('Unable to load society from the live backend.');
      } finally {
        setLoading(false);
      }
    }

    loadSociety();
  }, [id]);

  const updateField = <K extends keyof AdminSociety>(field: K, value: AdminSociety[K]) => {
    setSociety((current) => ({
      ...current,
      [field]: value,
      ...(field === 'name' && !isEdit ? { slug: slugifySociety(String(value)) } : {}),
    }));
    setError('');
    setMessage('');
    setSaved(false);
  };

  const toggleAmenity = (amenity: string, checked: boolean | 'indeterminate') => {
    setSociety((current) => {
      const enabled = checked === true;
      const amenities = enabled
        ? Array.from(new Set([...current.amenities, amenity]))
        : current.amenities.filter((item) => item !== amenity);
      return { ...current, amenities };
    });
  };

  const readImages = async (event: ChangeEvent<HTMLInputElement>, target: 'coverImage' | 'galleryImages') => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const images = await Promise.all(files.map((file) => uploadAdminImage(file, 'societies')));

    setSociety((current) => target === 'coverImage'
      ? { ...current, coverImage: images[0], imageUrl: images[0], imageStatus: current.imageStatus === 'placeholder' ? 'needs_review' : current.imageStatus }
      : { ...current, galleryImages: [...current.galleryImages, ...images].slice(0, 10) }
    );
    event.target.value = '';
  };

  const removeGalleryImage = (image: string) => {
    setSociety((current) => ({ ...current, galleryImages: current.galleryImages.filter((item) => item !== image) }));
  };

  const approveReferenceImage = () => {
    if (!society.imageReferenceUrl.trim()) {
      setError('Add or fetch an image reference URL before approving it.');
      return;
    }

    setSociety((current) => ({
      ...current,
      imageUrl: current.imageReferenceUrl,
      coverImage: current.imageReferenceUrl,
      imageStatus: 'approved_for_live',
      imageApprovedByAdmin: true,
      imageLicenseNotes: current.imageLicenseNotes || 'Approved by admin for live use after rights/permission review.',
    }));
    setMessage('Image approved for public display. Save changes to publish this approval.');
    setSaved(false);
  };

  const keepImageAsReferenceOnly = () => {
    setSociety((current) => ({
      ...current,
      imageUrl: '',
      coverImage: '',
      imageStatus: current.imageReferenceUrl ? 'official_reference_found' : 'placeholder',
      imageApprovedByAdmin: false,
    }));
    setMessage('Image kept as admin reference only. Save changes to keep it private.');
    setSaved(false);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!society.name.trim()) {
      setError('Society name is required.');
      return;
    }
    if (!society.slug.trim()) {
      setError('SEO slug is required.');
      return;
    }
    if (!society.locality.trim() && !society.sector.trim()) {
      setError('Add at least one location field: sector or locality.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await saveAdminSociety(society, isEdit);
      setSaved(true);
      window.alert(isEdit ? 'Society profile updated.' : 'Society profile created.');
      navigate('/admin/societies');
    } catch (err) {
      console.error(err);
      setError('Unable to save society to the live backend.');
    } finally {
      setSaving(false);
    }
  };

  const activeSourceUrl = society.officialProjectUrl || society.sourceUrl;
  const sourceChanged = activeSourceUrl !== loadedSourceUrl;
  const hasBeenEnriched = society.dataQuality.toLowerCase().includes('auto-enriched')
    || society.dataQuality.toLowerCase().includes('enriched from public');
  const enrichDisabled = enriching || !activeSourceUrl || (hasBeenEnriched && !sourceChanged);

  const handleEnrich = async () => {
    if (!isEdit || enrichDisabled) return;
    if (!activeSourceUrl.trim()) {
      setError('Add an official project/RERA source URL before enriching this society.');
      return;
    }

    try {
      setEnriching(true);
      setError('');
      setMessage('');
      const result = await enrichAdminSociety(society.id);
      setSociety(result.society);
      setLoadedSourceUrl(result.society.officialProjectUrl || result.society.sourceUrl);
      const fieldText = result.updatedFields.length
        ? `Updated: ${result.updatedFields.join(', ')}.`
        : 'No new fields changed.';
      const diagnosticText = [result.diagnostics.source, result.diagnostics.geocode, result.diagnostics.nearby].filter(Boolean).join(' ');
      setMessage(`${fieldText} ${diagnosticText}`.trim());
      setSaved(false);
    } catch (err) {
      console.error(err);
      setError('Unable to enrich from this source. Check that the URL is public and try again.');
    } finally {
      setEnriching(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Loading society" subtitle="Fetching live backend profile">
        <div className="rounded-[32px] border border-slate-200 bg-white p-10 text-lg text-slate-700 shadow-sm">
          Loading society...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEdit ? 'Edit society' : 'Add society'}
      subtitle={isEdit ? 'Update society intelligence, media, SEO and public profile settings' : 'Create a complete society intelligence profile'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="w-fit rounded-full" asChild>
            <Link to="/admin/societies"><ArrowLeft className="mr-2 h-4 w-4" /> Back to societies</Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            {isEdit ? (
              <Button
                type="button"
                onClick={handleEnrich}
                disabled={enrichDisabled}
                variant="outline"
                className="rounded-full border-blue-100 text-blue-700 hover:bg-blue-50"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {hasBeenEnriched && !sourceChanged ? 'Already enriched' : enriching ? 'Enriching...' : 'Enrich profile'}
              </Button>
            ) : null}
            <Button type="submit" disabled={saving} className="rounded-full bg-blue-600 px-5 hover:bg-blue-700">
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create society'}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        {saved ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-5 w-5" /> Society saved to the live backend.
          </div>
        ) : null}

        {message ? (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            <Sparkles className="h-5 w-5" /> {message}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Basic information</h2>
              <p className="mt-1 text-sm text-slate-500">These details appear on the public society profile.</p>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Society name</span>
                  <Input value={society.name} onChange={(event) => updateField('name', event.target.value)} placeholder="DLF Crest" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">SEO slug</span>
                  <Input value={society.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="dlf-crest" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Builder</span>
                  <Input value={society.builder} onChange={(event) => updateField('builder', event.target.value)} placeholder="DLF" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Sector</span>
                  <Input value={society.sector} onChange={(event) => updateField('sector', event.target.value)} placeholder="Sector 54" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Locality</span>
                  <Input value={society.locality} onChange={(event) => updateField('locality', event.target.value)} placeholder="Golf Course Road" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-slate-700">Year built</span>
                  <Input value={society.yearBuilt} onChange={(event) => updateField('yearBuilt', event.target.value)} placeholder="Verify from RERA or builder site" className="h-12 rounded-2xl" />
                </label>
                <label className="md:col-span-2 space-y-2">
                  <span className="text-sm font-medium text-slate-700">Address</span>
                  <Input value={society.address} onChange={(event) => updateField('address', event.target.value)} placeholder="Full society address" className="h-12 rounded-2xl" />
                </label>
                <label className="md:col-span-2 space-y-2">
                  <span className="text-sm font-medium text-slate-700">Description</span>
                  <textarea value={society.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Write a concise society overview..." className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
                </label>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Society statistics</h2>
              <p className="mt-1 text-sm text-slate-500">Useful for public profile, market intelligence and SEO pages.</p>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Total towers</span><Input value={society.totalTowers} onChange={(event) => updateField('totalTowers', event.target.value)} placeholder="Verify tower count" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Total units</span><Input value={society.totalUnits} onChange={(event) => updateField('totalUnits', event.target.value)} placeholder="Verify unit count" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Maintenance</span><Input value={society.maintenanceCharges} onChange={(event) => updateField('maintenanceCharges', event.target.value)} placeholder="Verify charges" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Rent range</span><Input value={society.rentRange} onChange={(event) => updateField('rentRange', event.target.value)} placeholder="Add only after market verification" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Buy range</span><Input value={society.buyRange} onChange={(event) => updateField('buyRange', event.target.value)} placeholder="Add only after market verification" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Rental yield</span><Input value={society.rentalYield} onChange={(event) => updateField('rentalYield', event.target.value)} placeholder="Calculated after prices are verified" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Average rent</span><Input value={society.averageRent} onChange={(event) => updateField('averageRent', event.target.value)} placeholder="Verified average rent" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Average sale price</span><Input value={society.averageSalePrice} onChange={(event) => updateField('averageSalePrice', event.target.value)} placeholder="Verified average sale price" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Price / sq ft</span><Input value={society.pricePerSqft} onChange={(event) => updateField('pricePerSqft', event.target.value)} placeholder="Verified price per sq ft" className="h-12 rounded-2xl" /></label>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Society score</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-3">
                {([
                  ['score', 'Overall'], ['securityScore', 'Security'], ['maintenanceScore', 'Maintenance'],
                  ['connectivityScore', 'Connectivity'], ['lifestyleScore', 'Lifestyle'], ['investmentScore', 'Investment'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">{label} score</span>
                    <Input value={society[key]} onChange={(event) => updateField(key, event.target.value)} placeholder="Auto score after verification" className="h-12 rounded-2xl" />
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Amenities manager</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {societyAmenityOptions.map((item) => (
                  <label key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <Checkbox checked={society.amenities.includes(item)} onCheckedChange={(checked) => toggleAmenity(item, checked)} /> {item}
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Nearby intelligence</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Nearby schools</span><textarea value={society.nearbySchools} onChange={(event) => updateField('nearbySchools', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Nearby metro</span><textarea value={society.nearbyMetro} onChange={(event) => updateField('nearbyMetro', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Nearby hospitals</span><textarea value={society.nearbyHospitals} onChange={(event) => updateField('nearbyHospitals', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Nearby office hubs</span><textarea value={society.nearbyOfficeHubs} onChange={(event) => updateField('nearbyOfficeHubs', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">SEO & FAQ</h2>
              <div className="mt-6 grid gap-5">
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Meta title</span><Input value={society.metaTitle} onChange={(event) => updateField('metaTitle', event.target.value)} placeholder="DLF Crest Gurgaon - Rent, Sale Price, Reviews & Society Score" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Meta description</span><textarea value={society.metaDescription} onChange={(event) => updateField('metaDescription', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">FAQ content</span><textarea value={society.faq} onChange={(event) => updateField('faq', event.target.value)} placeholder="One question/answer per line" className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Publishing</h2>
              <div className="mt-5 space-y-4">
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Status</span>
                  <select value={society.status} onChange={(event) => updateField('status', event.target.value as AdminSociety['status'])} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
                    <option>Draft</option><option>Verified</option><option>Premium</option><option>Archived</option>
                  </select>
                </label>
                {([
                  ['featured', 'Featured society', 'Show on homepage and society carousel'],
                  ['showInHero', 'Promote in hero', 'Use in hero search suggestions'],
                  ['searchBoost', 'Boost in search', 'Prioritize in internal search'],
                ] as const).map(([key, title, text]) => (
                  <label key={key} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
                    <Checkbox checked={society[key]} onCheckedChange={(checked) => updateField(key, checked === true)} />
                    <span><span className="block text-sm font-medium text-slate-950">{title}</span><span className="text-sm text-slate-500">{text}</span></span>
                  </label>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Import source</h2>
              <div className="mt-5 space-y-4">
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Official project URL</span>
                  <Input value={society.officialProjectUrl} onChange={(event) => updateField('officialProjectUrl', event.target.value)} placeholder="Official developer project page" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Official developer URL</span>
                  <Input value={society.officialDeveloperUrl} onChange={(event) => updateField('officialDeveloperUrl', event.target.value)} placeholder="Official developer website" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Official gallery URL</span>
                  <Input value={society.officialGalleryUrl} onChange={(event) => updateField('officialGalleryUrl', event.target.value)} placeholder="Official gallery page, not copied images" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Official brochure URL</span>
                  <Input value={society.officialBrochureUrl} onChange={(event) => updateField('officialBrochureUrl', event.target.value)} placeholder="Official brochure PDF/page" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Official floor plan URL</span>
                  <Input value={society.officialFloorPlanUrl} onChange={(event) => updateField('officialFloorPlanUrl', event.target.value)} placeholder="Official floor plan page/PDF" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">RERA number</span>
                  <Input value={society.reraNumber} onChange={(event) => updateField('reraNumber', event.target.value)} placeholder="RERA-GRG-0000-2026" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Source name</span>
                  <Input value={society.sourceName} onChange={(event) => updateField('sourceName', event.target.value)} placeholder="Haryana RERA / Site Setu" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Official / RERA source URL</span>
                  <Input value={society.sourceUrl} onChange={(event) => updateField('sourceUrl', event.target.value)} placeholder="Prefer official builder project page for images and details" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">RERA search URL</span>
                  <Input value={society.reraSearchUrl} onChange={(event) => updateField('reraSearchUrl', event.target.value)} placeholder="Official RERA search/certificate URL" className="h-12 rounded-2xl" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Google Maps URL</span>
                  <Input value={society.googleMapsUrl} onChange={(event) => updateField('googleMapsUrl', event.target.value)} placeholder="Google Maps reference URL" className="h-12 rounded-2xl" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 block">
                    <span className="text-sm font-medium text-slate-700">Official source status</span>
                    <select value={society.officialSourceStatus} onChange={(event) => updateField('officialSourceStatus', event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
                      <option>pending</option><option>found</option><option>enriched</option><option>failed</option><option>needs_manual_review</option>
                    </select>
                  </label>
                  <label className="space-y-2 block">
                    <span className="text-sm font-medium text-slate-700">Source confidence score</span>
                    <Input value={society.sourceConfidenceScore} onChange={(event) => updateField('sourceConfidenceScore', event.target.value)} placeholder="0-100" className="h-12 rounded-2xl" />
                  </label>
                </div>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Official source notes</span>
                  <textarea value={society.officialSourceNotes} onChange={(event) => updateField('officialSourceNotes', event.target.value)} placeholder="Manual verification notes for official sources" className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-slate-700">Data quality note</span>
                  <textarea value={society.dataQuality} onChange={(event) => updateField('dataQuality', event.target.value)} placeholder="Imported draft - verify before publishing" className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
                </label>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Location map</h2>
              <div className="mt-5 grid gap-4">
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Latitude</span><Input value={society.latitude} onChange={(event) => updateField('latitude', event.target.value)} placeholder="Verified map latitude" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Longitude</span><Input value={society.longitude} onChange={(event) => updateField('longitude', event.target.value)} placeholder="Verified map longitude" className="h-12 rounded-2xl" /></label>
                <label className="space-y-2"><span className="text-sm font-medium text-slate-700">RWA / Estate contact</span><Input value={society.rwaContact} onChange={(event) => updateField('rwaContact', event.target.value)} placeholder="Verified estate contact" className="h-12 rounded-2xl" /></label>
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Media gallery</h2>
              <p className="mt-1 text-sm text-slate-500">Use self-shot, licensed, or developer-approved images only.</p>
              <label className="mt-5 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Image reference URL</span>
                <Input value={society.imageReferenceUrl} onChange={(event) => updateField('imageReferenceUrl', event.target.value)} placeholder="Admin reference only, not public unless approved" className="h-12 rounded-2xl" />
              </label>
              {society.imageReferenceUrl || society.imageUrl ? (
                <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  <img
                    src={society.imageReferenceUrl || society.imageUrl}
                    alt={society.imageAltText || `${society.name} image preview`}
                    className="h-44 w-full object-cover"
                  />
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">Admin image preview</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {society.imageApprovedByAdmin ? 'Approved for public display after save.' : 'Reference only. Public site still shows placeholder.'}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${society.imageApprovedByAdmin ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {society.imageApprovedByAdmin ? 'Approved' : 'Reference'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={approveReferenceImage}>
                        <ShieldCheck className="mr-2 h-4 w-4" /> Approve for live
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={keepImageAsReferenceOnly}>
                        Keep as reference
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Approved image URL</span>
                <Input value={society.imageUrl} onChange={(event) => updateField('imageUrl', event.target.value)} placeholder="Only licensed, self-shot, or developer-approved image URL" className="h-12 rounded-2xl" />
              </label>
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Image status</span>
                <select value={society.imageStatus} onChange={(event) => updateField('imageStatus', event.target.value as AdminSociety['imageStatus'])} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100">
                  <option>placeholder</option><option>official_reference_found</option><option>licensed_uploaded</option><option>self_shot_uploaded</option><option>developer_permission_received</option><option>approved_for_live</option><option>needs_review</option>
                </select>
              </label>
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Checkbox checked={society.imageApprovedByAdmin} onCheckedChange={(checked) => updateField('imageApprovedByAdmin', checked === true)} />
                <span>
                  <span className="block text-sm font-medium text-slate-950">Image approved by admin</span>
                  <span className="text-sm text-slate-500">Only enable this after rights, license, self-shot, or developer permission is confirmed.</span>
                </span>
              </label>
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Image alt text</span>
                <Input value={society.imageAltText} onChange={(event) => updateField('imageAltText', event.target.value)} placeholder="Accessible image description" className="h-12 rounded-2xl" />
              </label>
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Image credit</span>
                <Input value={society.imageCredit} onChange={(event) => updateField('imageCredit', event.target.value)} placeholder="Photographer/developer/license credit" className="h-12 rounded-2xl" />
              </label>
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Image license notes</span>
                <textarea value={society.imageLicenseNotes} onChange={(event) => updateField('imageLicenseNotes', event.target.value)} placeholder="Permission/license details" className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-slate-700">Approved gallery image URLs</span>
                <textarea
                  value={society.galleryImages.join('\n')}
                  onChange={(event) => updateField('galleryImages', event.target.value.split('\n').map((item) => item.trim()).filter(Boolean))}
                  placeholder="One approved image URL per line"
                  className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:bg-slate-100">
                {society.imageUrl || society.coverImage ? <img src={society.imageUrl || society.coverImage} className="h-32 w-full rounded-2xl object-cover" /> : <><ImagePlus className="h-7 w-7 text-blue-600" /><p className="mt-3 font-medium text-slate-950">Upload cover image</p></>}
                <input type="file" accept="image/*" onChange={(event) => readImages(event, 'coverImage')} className="hidden" />
              </label>
              <label className="mt-4 inline-flex cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <UploadCloud className="mr-2 h-4 w-4" /> Add gallery images
                <input type="file" accept="image/*" multiple onChange={(event) => readImages(event, 'galleryImages')} className="hidden" />
              </label>
              {society.galleryImages.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {society.galleryImages.map((image) => (
                    <div key={image} className="group relative overflow-hidden rounded-2xl border border-slate-200">
                      <img src={image} className="h-24 w-full object-cover" />
                      <button type="button" onClick={() => removeGalleryImage(image)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm opacity-0 transition group-hover:opacity-100"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-950">Brochure / master plan</h2>
              <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600 hover:bg-slate-100">
                <FileText className="h-5 w-5 text-blue-600" />
                <span>{society.brochureName || 'Upload PDF brochure or master plan'}</span>
                <input type="file" accept="application/pdf" onChange={(event) => updateField('brochureName', event.target.files?.[0]?.name || '')} className="hidden" />
              </label>
            </section>
          </aside>
        </div>
      </form>
    </AdminLayout>
  );
}
