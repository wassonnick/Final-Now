import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, Save, Send, Sparkles, XCircle } from 'lucide-react';
import { AdminLayout } from '@/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  createEmptyAdminSociety,
  createSocietyFromFetchedData,
  fetchSocietyDraftFromUrl,
  slugifySociety,
  societyAmenityOptions,
} from '@/lib/adminSocietyStore';
import type { AdminSociety } from '@/lib/adminSocietyStore';

type DiagnosticMap = Record<string, unknown>;

function yesNo(value: unknown) {
  return value ? 'Found' : 'Needs check';
}

export function AdminSocietyUrlCreatePage() {
  const navigate = useNavigate();
  const [officialProjectUrl, setOfficialProjectUrl] = useState('');
  const [society, setSociety] = useState<AdminSociety | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fieldsToVerify, setFieldsToVerify] = useState<string[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticMap>({});
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const updateField = <K extends keyof AdminSociety>(field: K, value: AdminSociety[K]) => {
    setSociety((current) => {
      const next = current || createEmptyAdminSociety();
      return {
        ...next,
        [field]: value,
        ...(field === 'name' ? { slug: next.slug || slugifySociety(String(value)) } : {}),
      };
    });
    setError('');
    setMessage('');
  };

  const toggleAmenity = (amenity: string, checked: boolean | 'indeterminate') => {
    setSociety((current) => {
      const next = current || createEmptyAdminSociety();
      const enabled = checked === true;
      return {
        ...next,
        amenities: enabled
          ? Array.from(new Set([...next.amenities, amenity]))
          : next.amenities.filter((item) => item !== amenity),
      };
    });
  };

  const handleFetch = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!officialProjectUrl.trim()) {
      setError('Paste an official project/developer URL first.');
      return;
    }

    try {
      setFetching(true);
      setError('');
      setMessage('');
      const result = await fetchSocietyDraftFromUrl(officialProjectUrl.trim());
      setSociety(result.society);
      setWarnings(result.warnings);
      setFieldsToVerify(result.fieldsToVerify);
      setDiagnostics(result.diagnostics);
      setMessage('Draft profile fetched. Review every field before saving or publishing.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to fetch this official project URL.');
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!society) return;
    if (!society.name.trim()) {
      setError('Society name is required before saving.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        ...society,
        status: publish ? 'Verified' as const : 'Draft' as const,
        isPublished: publish,
        verificationStatus: publish ? 'verified' : society.verificationStatus,
      };
      const saved = await createSocietyFromFetchedData(payload, publish);
      navigate(`/admin/societies/${saved.id}/edit`);
    } catch (err) {
      console.error(err);
      setError('Unable to save fetched society. Check required fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="Add Society from Official URL" subtitle="URL first, Excel optional">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" className="w-fit rounded-full" asChild>
            <Link to="/admin/societies"><ArrowLeft className="mr-2 h-4 w-4" /> Back to societies</Link>
          </Button>
          <Button variant="outline" className="w-fit rounded-full" asChild>
            <Link to="/admin/societies/new">Manual add</Link>
          </Button>
        </div>

        <form onSubmit={handleFetch} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-800">Official project URL</span>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <Input
                value={officialProjectUrl}
                onChange={(event) => setOfficialProjectUrl(event.target.value)}
                placeholder="https://www.adanirealty.com/residential-projects/gurugram/oyster-grande"
                className="h-12 rounded-2xl"
              />
              <Button type="submit" disabled={fetching} className="h-12 rounded-2xl bg-blue-600 px-5 hover:bg-blue-700">
                <Sparkles className="mr-2 h-4 w-4" />
                {fetching ? 'Fetching official project data...' : 'Fetch Details'}
              </Button>
            </div>
          </label>
          <p className="mt-3 text-sm text-slate-500">
            Use official developer/project pages. Broker portals are blocked for automatic official enrichment.
          </p>
        </form>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" /> {error}
          </div>
        ) : null}

        {message ? (
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> {message}
          </div>
        ) : null}

        {society ? (
          <>
            <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              <p className="font-semibold">Fetched data is a draft.</p>
              <p className="mt-1">Verify RERA, map pin, rental data and image rights before publishing. Public images remain placeholders until approved.</p>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
              <div className="space-y-5">
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Preview</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      ['Society', society.name || '-'],
                      ['Developer', society.builder || '-'],
                      ['Sector', society.sector || '-'],
                      ['Micro-market', society.locality || '-'],
                      ['Confidence', society.sourceConfidenceScore || '0'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl bg-slate-50 p-4">
                        <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">{label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Basic information</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Society name</span><Input value={society.name} onChange={(event) => updateField('name', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">SEO slug</span><Input value={society.slug} onChange={(event) => updateField('slug', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Developer</span><Input value={society.builder} onChange={(event) => updateField('builder', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Society type</span><Input value={society.societyType} onChange={(event) => updateField('societyType', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Sector</span><Input value={society.sector} onChange={(event) => updateField('sector', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Micro-market</span><Input value={society.locality} onChange={(event) => updateField('locality', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">City</span><Input value={society.city} onChange={(event) => updateField('city', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">State</span><Input value={society.state} onChange={(event) => updateField('state', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="md:col-span-2 space-y-2"><span className="text-sm font-medium text-slate-700">Address</span><Input value={society.address} onChange={(event) => updateField('address', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="md:col-span-2 space-y-2"><span className="text-sm font-medium text-slate-700">Description</span><textarea value={society.description} onChange={(event) => updateField('description', event.target.value)} className="min-h-32 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Project facts</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Project status</span><Input value={society.projectStatus} onChange={(event) => updateField('projectStatus', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Configuration</span><Input value={society.configuration} onChange={(event) => updateField('configuration', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Project area</span><Input value={society.projectArea} onChange={(event) => updateField('projectArea', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Unit size range</span><Input value={society.unitSizeRange} onChange={(event) => updateField('unitSizeRange', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Total towers</span><Input value={society.totalTowers} onChange={(event) => updateField('totalTowers', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Total units</span><Input value={society.totalUnits} onChange={(event) => updateField('totalUnits', event.target.value)} className="h-12 rounded-2xl" /></label>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Amenities</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {societyAmenityOptions.map((item) => (
                      <label key={item} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                        <Checkbox checked={society.amenities.includes(item)} onCheckedChange={(checked) => toggleAmenity(item, checked)} /> {item}
                      </label>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Nearby intelligence</h2>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Schools</span><textarea value={society.nearbySchools} onChange={(event) => updateField('nearbySchools', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Metro</span><textarea value={society.nearbyMetro} onChange={(event) => updateField('nearbyMetro', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Hospitals</span><textarea value={society.nearbyHospitals} onChange={(event) => updateField('nearbyHospitals', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                    <label className="space-y-2"><span className="text-sm font-medium text-slate-700">Office hubs</span><textarea value={society.nearbyOfficeHubs} onChange={(event) => updateField('nearbyOfficeHubs', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                  </div>
                </section>
              </div>

              <aside className="space-y-5">
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Source checklist</h2>
                  <div className="mt-4 space-y-3 text-sm">
                    {[
                      ['Official page', yesNo(diagnostics.official_page_found)],
                      ['Brochure', yesNo(diagnostics.brochure_found)],
                      ['RERA reference', yesNo(diagnostics.rera_reference_found)],
                      ['Google Maps', yesNo(diagnostics.google_maps_match_found)],
                      ['Images for review', yesNo(diagnostics.images_found_for_review)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-semibold text-slate-950">{value}</span>
                      </div>
                    ))}
                  </div>
                  {fieldsToVerify.length ? (
                    <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                      <p className="font-semibold">Fields still missing</p>
                      <p className="mt-1">{fieldsToVerify.join(', ')}</p>
                    </div>
                  ) : null}
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Official sources</h2>
                  <div className="mt-5 space-y-4">
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Official project URL</span><Input value={society.officialProjectUrl} onChange={(event) => updateField('officialProjectUrl', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Developer URL</span><Input value={society.officialDeveloperUrl} onChange={(event) => updateField('officialDeveloperUrl', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Brochure URL</span><Input value={society.officialBrochureUrl} onChange={(event) => updateField('officialBrochureUrl', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Gallery URL</span><Input value={society.officialGalleryUrl} onChange={(event) => updateField('officialGalleryUrl', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">RERA number</span><Input value={society.reraNumber} onChange={(event) => updateField('reraNumber', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">RERA status</span><Input value={society.reraStatus} onChange={(event) => updateField('reraStatus', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Fields to verify</span><textarea value={society.fieldsToVerify} onChange={(event) => updateField('fieldsToVerify', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">Location and media</h2>
                  <div className="mt-5 space-y-4">
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Google Maps URL</span><Input value={society.googleMapsUrl} onChange={(event) => updateField('googleMapsUrl', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Latitude</span><Input value={society.latitude} onChange={(event) => updateField('latitude', event.target.value)} className="h-12 rounded-2xl" /></label>
                      <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Longitude</span><Input value={society.longitude} onChange={(event) => updateField('longitude', event.target.value)} className="h-12 rounded-2xl" /></label>
                    </div>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Image reference URL</span><Input value={society.imageReferenceUrl} onChange={(event) => updateField('imageReferenceUrl', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Image status</span><Input value={society.imageStatus} onChange={(event) => updateField('imageStatus', event.target.value as AdminSociety['imageStatus'])} className="h-12 rounded-2xl" /></label>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                      Approve this image only if SocietyFlats owns it, has developer permission, has a valid license, or it was self-shot.
                    </div>
                  </div>
                </section>

                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-950">SEO</h2>
                  <div className="mt-5 space-y-4">
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Meta title</span><Input value={society.metaTitle} onChange={(event) => updateField('metaTitle', event.target.value)} className="h-12 rounded-2xl" /></label>
                    <label className="space-y-2 block"><span className="text-sm font-medium text-slate-700">Meta description</span><textarea value={society.metaDescription} onChange={(event) => updateField('metaDescription', event.target.value)} className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100" /></label>
                  </div>
                </section>
              </aside>
            </div>

            {warnings.length ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                <p className="font-semibold text-slate-950">Warnings</p>
                <ul className="mt-2 space-y-1">
                  {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            ) : null}

            <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                Draft source: <a href={society.officialProjectUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-700 hover:underline">official URL <ExternalLink className="inline h-3 w-3" /></a>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate('/admin/societies')}>Cancel</Button>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => handleFetch()} disabled={fetching}>Re-fetch from URL</Button>
                <Button type="button" className="rounded-full bg-slate-950 hover:bg-slate-800" onClick={() => handleSave(false)} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save as Draft'}
                </Button>
                <Button type="button" className="rounded-full bg-blue-600 hover:bg-blue-700" onClick={() => handleSave(true)} disabled={saving}>
                  <Send className="mr-2 h-4 w-4" /> Save & Publish
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
}
