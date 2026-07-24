import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, MapPinned, Plus, RefreshCw } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyNcrCityBackfill, createNcrLocality, createNcrZone, fetchNcrBackfillPreview, fetchNcrLocationAudit, fetchNcrLocations, type NcrBackfillResponse, type NcrLocationAuditResponse, type NcrLocationsResponse } from "@/lib/ncrLocationsApi";
import { isNcrMulticityEnabled } from "@/config/features";

const emptyLocations: NcrLocationsResponse["data"] = {
  regions: [],
  cities: [],
  zones: [],
  localities: [],
};

const previewLocations: NcrLocationsResponse["data"] = {
  regions: [{ id: 1, name: "Delhi NCR", slug: "delhi-ncr", country: "India", state_group: "Delhi, Haryana, Uttar Pradesh", is_active: true }],
  cities: [
    { id: 1, region_id: 1, name: "Gurugram", slug: "gurgaon", state: "Haryana", city_type: "core_market", is_active: true },
    { id: 2, region_id: 1, name: "Delhi", slug: "delhi", state: "Delhi", city_type: "expansion_market", is_active: true },
    { id: 3, region_id: 1, name: "Noida", slug: "noida", state: "Uttar Pradesh", city_type: "expansion_market", is_active: true },
    { id: 4, region_id: 1, name: "Greater Noida", slug: "greater-noida", state: "Uttar Pradesh", city_type: "expansion_market", is_active: true },
    { id: 5, region_id: 1, name: "Faridabad", slug: "faridabad", state: "Haryana", city_type: "expansion_market", is_active: true },
  ],
  zones: [],
  localities: [],
};

function isMissingLocationApiError(message: string) {
  return /api\/admin\/locations|could not be found|404|not found/i.test(message);
}

function cityStatusLabel(status: string) {
  const labels: Record<string, string> = {
    core_market_live: "Core market live",
    approved_for_city_indexing: "Approved for indexing",
    needs_verified_societies: "Needs verified societies",
    needs_locality_depth: "Needs locality depth",
    awaiting_indexing_approval: "Awaiting indexing approval",
    hold_noindex: "Hold noindex",
  };

  return labels[status] || status.replace(/_/g, " ");
}

function cityStatusClasses(status: string) {
  if (status === "core_market_live" || status === "approved_for_city_indexing") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "needs_verified_societies" || status === "needs_locality_depth") {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-slate-100 text-slate-700";
}

export function AdminLocationsPage() {
  const enabled = isNcrMulticityEnabled();
  const [locations, setLocations] = useState(emptyLocations);
  const [audit, setAudit] = useState<NcrLocationAuditResponse["data"] | null>(null);
  const [backfill, setBackfill] = useState<NcrBackfillResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [readOnlyPreview, setReadOnlyPreview] = useState(false);
  const [cityFilter, setCityFilter] = useState("");
  const [zoneForm, setZoneForm] = useState({ city_id: "", name: "", zone_type: "micro_market" });
  const [localityForm, setLocalityForm] = useState({ city_id: "", zone_id: "", name: "", sector_code: "", locality_type: "sector", published_status: "draft" });

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      setReadOnlyPreview(false);
      const response = await fetchNcrLocations();
      setLocations(response.data || emptyLocations);
      const auditResponse = await fetchNcrLocationAudit().catch(() => null);
      setAudit(auditResponse?.data || null);
      if (!zoneForm.city_id && response.data?.cities?.[0]) {
        setZoneForm((current) => ({ ...current, city_id: String(response.data.cities[0].id) }));
        setLocalityForm((current) => ({ ...current, city_id: String(response.data.cities[0].id) }));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unable to load locations.";
      if (isMissingLocationApiError(errorMessage)) {
        setReadOnlyPreview(true);
        setLocations(previewLocations);
        setAudit(null);
        setBackfill(null);
        setZoneForm((current) => ({ ...current, city_id: current.city_id || "1" }));
        setLocalityForm((current) => ({ ...current, city_id: current.city_id || "1" }));
        setError("Your frontend is pointed at an API that does not have NCR admin routes yet. Showing read-only NCR seed data for review; run the matching local backend or deploy this branch to save zones/localities.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const visibleCities = useMemo(
    () => locations.cities.filter((city) => !cityFilter || city.name.toLowerCase().includes(cityFilter.toLowerCase())),
    [cityFilter, locations.cities],
  );
  const cityZones = useMemo(
    () => locations.zones.filter((zone) => !localityForm.city_id || Number(zone.city_id) === Number(localityForm.city_id)),
    [locations.zones, localityForm.city_id],
  );

  const cityName = (cityId?: number | null) => locations.cities.find((city) => Number(city.id) === Number(cityId))?.name || "Unassigned";
  const zoneName = (zoneId?: number | null) => locations.zones.find((zone) => Number(zone.id) === Number(zoneId))?.name || "No zone";
  const auditCards = audit ? [
    { label: "Public societies missing city ID", value: audit.societies.public_missing_city_id || 0, total: audit.societies.total },
    { label: "Public properties missing city ID", value: audit.properties.public_missing_city_id || 0, total: audit.properties.total },
    { label: "Leads with target city only", value: audit.leads.has_target_city_without_city_id || 0, total: audit.leads.total },
    { label: "Import jobs missing target city ID", value: audit.verified_import_jobs.missing_target_city_id || 0, total: audit.verified_import_jobs.total },
  ] : [];

  const saveZone = async (event: FormEvent) => {
    event.preventDefault();
    if (readOnlyPreview) {
      setError("Read-only preview: connect the matching NCR backend before saving zones.");
      return;
    }
    if (!zoneForm.name.trim()) return;
    try {
      setError("");
      setMessage("");
      await createNcrZone({
        city_id: zoneForm.city_id ? Number(zoneForm.city_id) : undefined,
        region_id: locations.regions[0]?.id,
        name: zoneForm.name,
        zone_type: zoneForm.zone_type,
      });
      setZoneForm((current) => ({ ...current, name: "" }));
      setMessage("Zone saved for NCR review.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save zone.");
    }
  };

  const saveLocality = async (event: FormEvent) => {
    event.preventDefault();
    if (readOnlyPreview) {
      setError("Read-only preview: connect the matching NCR backend before saving localities.");
      return;
    }
    if (!localityForm.name.trim()) return;
    const city = locations.cities.find((item) => Number(item.id) === Number(localityForm.city_id));
    try {
      setError("");
      setMessage("");
      await createNcrLocality({
        region_id: locations.regions[0]?.id,
        city_id: localityForm.city_id ? Number(localityForm.city_id) : undefined,
        zone_id: localityForm.zone_id ? Number(localityForm.zone_id) : undefined,
        name: localityForm.name,
        sector_code: localityForm.sector_code || undefined,
        locality_type: localityForm.locality_type,
        published_status: localityForm.published_status,
        city: city?.name,
        state: city?.state,
      });
      setLocalityForm((current) => ({ ...current, name: "", sector_code: "" }));
      setMessage("Locality saved as draft/review inventory. It is not public SEO.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save locality.");
    }
  };

  const previewBackfill = async () => {
    if (readOnlyPreview) {
      setError("Read-only preview: connect the matching NCR backend before previewing backfill.");
      return;
    }

    try {
      setBackfillLoading(true);
      setError("");
      setMessage("");
      const response = await fetchNcrBackfillPreview();
      setBackfill(response.data);
      setMessage(response.data.summary.total > 0 ? "Backfill preview ready. Review the counts before applying." : "Backfill preview found no exact city-text matches to apply.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not preview NCR city backfill.");
    } finally {
      setBackfillLoading(false);
    }
  };

  const applyBackfill = async () => {
    if (readOnlyPreview) {
      setError("Read-only preview: connect the matching NCR backend before applying backfill.");
      return;
    }

    const confirmed = window.confirm("Apply NCR city backfill for exact known city text only? This updates structured city IDs but does not publish, index, or add sitemap URLs.");
    if (!confirmed) return;

    try {
      setBackfillLoading(true);
      setError("");
      setMessage("");
      const response = await applyNcrCityBackfill();
      setBackfill(response.data);
      setMessage(`NCR city backfill applied: ${response.data.summary.total} rows updated from exact city-text matches.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply NCR city backfill.");
    } finally {
      setBackfillLoading(false);
    }
  };

  if (!enabled) {
    return (
      <AdminLayout title="NCR Locations" subtitle="Structured city, zone and locality controls.">
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <p className="font-black">NCR multi-city controls are disabled.</p>
          <p className="mt-2 text-sm">Set <code>VITE_NCR_MULTICITY_ENABLED=true</code> for frontend review and <code>NCR_MULTICITY_ENABLED=true</code> for backend review.</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="NCR Locations" subtitle="Review-only city, zone and locality foundation for Delhi NCR expansion.">
      <div className="mb-5 flex flex-wrap gap-2">
        {["Feature flagged", "Admin-only", "No public sitemap"].map((label) => (
          <span key={label} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">{label}</span>
        ))}
      </div>
      {message ? <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div> : null}
      {readOnlyPreview ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          Preview mode: these are the NCR seed cities from the branch. Saving is disabled until the API route <code>/api/admin/locations</code> is available on the backend your frontend is using.
        </div>
      ) : null}

      {audit ? (
        <section className="mb-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">NCR-4 readiness audit</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Structured mapping before public rollout</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">{audit.recommendation.message}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black ${audit.recommendation.ready_for_public_city_filters ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
              {audit.recommendation.ready_for_public_city_filters ? <CheckCircle2 className="mr-1.5 h-4 w-4" /> : <AlertTriangle className="mr-1.5 h-4 w-4" />}
              {audit.recommendation.ready_for_public_city_filters ? "Public rows mapped" : "Backfill before public filters"}
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              { label: "Cities", value: audit.summary.cities },
              { label: "Zones", value: audit.summary.zones },
              { label: "Localities", value: audit.summary.localities },
              { label: "Regions", value: audit.summary.regions },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-2xl font-black text-blue-950">{item.value}</p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-blue-500">{item.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {auditCards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className={`text-2xl font-black ${item.value > 0 ? "text-amber-700" : "text-emerald-700"}`}>{item.value}</p>
                <p className="mt-1 text-sm font-black text-slate-800">{item.label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.total} total rows checked</p>
              </div>
            ))}
          </div>

          {audit.city_readiness?.length ? (
            <div className="mt-6 rounded-[24px] border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">NCR-8 city readiness QA</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">City launch blockers, still admin-only</h3>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-blue-700">No sitemap change</span>
              </div>
              <div className="mt-4 overflow-auto">
                <table className="min-w-[920px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-blue-100 text-xs uppercase tracking-[0.12em] text-slate-500">
                      <th className="p-3">City</th>
                      <th>Societies</th>
                      <th>Localities</th>
                      <th>Properties</th>
                      <th>Importer jobs</th>
                      <th>Indexing</th>
                      <th>Status</th>
                      <th>Next action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.city_readiness.map((city) => (
                      <tr key={city.city_id} className="border-b border-blue-100 align-top">
                        <td className="p-3">
                          <p className="font-black text-slate-950">{city.name}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{city.state || "NCR"} · {city.city_type || "market"}</p>
                        </td>
                        <td>
                          <p className="font-black text-slate-950">{city.public_societies_count}</p>
                          <p className="text-xs text-slate-500">{city.draft_societies_count} draft/review</p>
                        </td>
                        <td>
                          <p className="font-black text-slate-950">{city.localities_count}</p>
                          <p className="text-xs text-slate-500">{city.zones_count} zones · {city.published_localities_count} published</p>
                        </td>
                        <td className="font-black text-slate-950">{city.public_properties_count}</td>
                        <td className="font-black text-slate-950">{city.verified_import_jobs_count}</td>
                        <td>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${city.indexing_approved ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-600"}`}>
                            {city.indexing_approved ? "Approved" : "Noindex"}
                          </span>
                          {city.unmapped_public_rows_count > 0 ? <p className="mt-2 text-xs font-black text-amber-700">{city.unmapped_public_rows_count} unmapped public rows</p> : null}
                        </td>
                        <td>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${cityStatusClasses(city.recommended_status)}`}>
                            {cityStatusLabel(city.recommended_status)}
                          </span>
                        </td>
                        <td className="max-w-[280px]">
                          <ul className="space-y-1 text-xs font-semibold text-slate-600">
                            {city.next_actions.slice(0, 2).map((action) => (
                              <li key={action}>• {action}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mb-5 rounded-[28px] border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">NCR-9 city ID backfill</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Preview exact city-text matches before applying</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-amber-900">
              This only links existing rows to structured NCR city IDs when the text is an exact known city match. It does not publish drafts, change filters, index city pages, or touch sitemap policy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void previewBackfill()} disabled={readOnlyPreview || backfillLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${backfillLoading ? "animate-spin" : ""}`} />
              Preview backfill
            </Button>
            <Button className="bg-amber-700 hover:bg-amber-800" onClick={() => void applyBackfill()} disabled={readOnlyPreview || backfillLoading || !backfill || backfill.summary.total === 0}>
              Apply exact matches
            </Button>
          </div>
        </div>

        {backfill ? (
          <div className="mt-5">
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { label: "Total", value: backfill.summary.total },
                { label: "Societies", value: backfill.summary.societies },
                { label: "Properties", value: backfill.summary.properties },
                { label: "Leads", value: backfill.summary.leads },
                { label: "Importer jobs", value: backfill.summary.verified_import_jobs },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-amber-200 bg-white p-4">
                  <p className="text-2xl font-black text-amber-800">{item.value}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-amber-600">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-bold text-amber-900">{backfill.matching_policy}</p>
            <div className="mt-4 overflow-auto">
              <table className="min-w-[820px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-amber-200 text-xs uppercase tracking-[0.12em] text-amber-700">
                    <th className="p-3">City</th>
                    <th>Matched text</th>
                    <th>Societies</th>
                    <th>Properties</th>
                    <th>Leads</th>
                    <th>Importer jobs</th>
                    <th>Sample IDs</th>
                  </tr>
                </thead>
                <tbody>
                  {backfill.cities.map((city) => {
                    const samples = [
                      ...city.societies.sample_ids,
                      ...city.properties.sample_ids,
                      ...city.leads.sample_ids,
                      ...city.verified_import_jobs.sample_ids,
                    ].slice(0, 8);
                    return (
                      <tr key={city.city_id} className="border-b border-amber-100 align-top">
                        <td className="p-3 font-black text-slate-950">{city.name}</td>
                        <td className="text-xs font-semibold text-slate-600">{city.matched_city_text.join(", ")}</td>
                        <td className="font-black">{city.societies.count}</td>
                        <td className="font-black">{city.properties.count}</td>
                        <td className="font-black">{city.leads.count}</td>
                        <td className="font-black">{city.verified_import_jobs.count}</td>
                        <td className="font-mono text-xs text-slate-500">{samples.length ? samples.join(", ") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Delhi NCR cities</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">{locations.cities.length} cities staged</h2>
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <Input value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Filter city" className="mt-4 h-11 rounded-2xl border-slate-200" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {visibleCities.map((city) => (
              <div key={city.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{city.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{city.state} · {city.city_type || "market"}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-blue-700">ID {city.id}</span>
                </div>
                <p className="mt-3 text-xs font-bold text-slate-600">
                  {locations.zones.filter((zone) => Number(zone.city_id) === Number(city.id)).length} zones · {locations.localities.filter((locality) => Number(locality.city_id) === Number(city.id)).length} localities
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <form onSubmit={saveZone} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Add zone</p>
            <h2 className="mt-1 text-xl font-black">Micro-market / corridor</h2>
            <select className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={zoneForm.city_id} onChange={(event) => setZoneForm({ ...zoneForm, city_id: event.target.value })}>
              {locations.cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
            <Input className="mt-3 h-11 rounded-2xl" placeholder="Example: Dwarka Expressway" value={zoneForm.name} onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })} />
            <Button className="mt-4 bg-blue-700" disabled={readOnlyPreview || !zoneForm.name.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Save zone
            </Button>
          </form>

          <form onSubmit={saveLocality} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">Add locality</p>
            <h2 className="mt-1 text-xl font-black">Sector / locality</h2>
            <select className="mt-4 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={localityForm.city_id} onChange={(event) => setLocalityForm({ ...localityForm, city_id: event.target.value, zone_id: "" })}>
              {locations.cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
            </select>
            <select className="mt-3 h-11 w-full rounded-2xl border border-slate-200 px-3 text-sm" value={localityForm.zone_id} onChange={(event) => setLocalityForm({ ...localityForm, zone_id: event.target.value })}>
              <option value="">No zone yet</option>
              {cityZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
            <Input className="mt-3 h-11 rounded-2xl" placeholder="Example: Sector 150" value={localityForm.name} onChange={(event) => setLocalityForm({ ...localityForm, name: event.target.value })} />
            <Input className="mt-3 h-11 rounded-2xl" placeholder="Sector code, optional" value={localityForm.sector_code} onChange={(event) => setLocalityForm({ ...localityForm, sector_code: event.target.value })} />
            <Button className="mt-4 bg-blue-700" disabled={readOnlyPreview || !localityForm.name.trim()}>
              <Plus className="mr-2 h-4 w-4" /> Save locality
            </Button>
          </form>
        </div>
      </section>

      <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <MapPinned className="h-5 w-5 text-blue-700" />
          <h2 className="text-xl font-black">Draft locality inventory</h2>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="p-3">Locality</th>
                <th>City</th>
                <th>Zone</th>
                <th>Status</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {locations.localities.slice(0, 100).map((locality) => (
                <tr key={locality.id} className="border-b">
                  <td className="p-3 font-bold">{locality.name}</td>
                  <td>{cityName(locality.city_id)}</td>
                  <td>{zoneName(locality.zone_id)}</td>
                  <td>{locality.published_status || "draft"}</td>
                  <td className="font-mono text-xs text-slate-500">{locality.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
