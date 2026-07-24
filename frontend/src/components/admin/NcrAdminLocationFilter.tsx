import { useEffect, useMemo, useState } from "react";

import { fetchNcrLocations, type NcrCity, type NcrLocality, type NcrLocationsResponse, type NcrZone } from "@/lib/ncrLocationsApi";

export type NcrAdminLocationFilterValue = {
  cityId: string;
  zoneId: string;
  localityId: string;
};

type NcrAdminLocationFilterProps = {
  value: NcrAdminLocationFilterValue;
  onChange: (next: NcrAdminLocationFilterValue) => void;
  label?: string;
};

const emptyLocations: NcrLocationsResponse["data"] = {
  regions: [],
  cities: [],
  zones: [],
  localities: [],
};

const previewCities: NcrCity[] = [
  { id: 1, name: "Gurugram", slug: "gurgaon", state: "Haryana", city_type: "core_market", is_active: true },
  { id: 2, name: "Delhi", slug: "delhi", state: "Delhi", city_type: "expansion_market", is_active: true },
  { id: 3, name: "Noida", slug: "noida", state: "Uttar Pradesh", city_type: "expansion_market", is_active: true },
  { id: 4, name: "Greater Noida", slug: "greater-noida", state: "Uttar Pradesh", city_type: "expansion_market", is_active: true },
  { id: 5, name: "Faridabad", slug: "faridabad", state: "Haryana", city_type: "expansion_market", is_active: true },
];

export function NcrAdminLocationFilter({
  value,
  onChange,
  label = "NCR location",
}: NcrAdminLocationFilterProps) {
  const [locations, setLocations] = useState<NcrLocationsResponse["data"]>(emptyLocations);
  const [loading, setLoading] = useState(false);
  const [readOnlyPreview, setReadOnlyPreview] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setReadOnlyPreview(false);

    fetchNcrLocations()
      .then((response) => {
        if (!cancelled) setLocations(response.data || emptyLocations);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unable to load NCR locations.";
        if (message.toLowerCase().includes("not found") || message.includes("404")) {
          setLocations({ ...emptyLocations, cities: previewCities });
          setReadOnlyPreview(true);
          setError("Using staged NCR city list until the matching backend API is deployed.");
        } else {
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const cityZones = useMemo<NcrZone[]>(
    () => locations.zones.filter((zone) => !value.cityId || Number(zone.city_id) === Number(value.cityId)),
    [locations.zones, value.cityId],
  );

  const visibleLocalities = useMemo<NcrLocality[]>(
    () =>
      locations.localities.filter((locality) => {
        if (value.cityId && Number(locality.city_id) !== Number(value.cityId)) return false;
        if (value.zoneId && Number(locality.zone_id) !== Number(value.zoneId)) return false;
        return true;
      }),
    [locations.localities, value.cityId, value.zoneId],
  );

  const patch = (partial: Partial<NcrAdminLocationFilterValue>) => onChange({ ...value, ...partial });

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{label}</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-blue-700">
          {loading ? "Loading" : readOnlyPreview ? "Preview fallback" : "Structured filters"}
        </span>
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-amber-700">{error}</p> : null}
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <select
          value={value.cityId}
          onChange={(event) => patch({ cityId: event.target.value, zoneId: "", localityId: "" })}
          className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none"
          aria-label="Filter by NCR city"
        >
          <option value="">All NCR cities</option>
          {locations.cities.map((city) => (
            <option key={city.id} value={city.id}>{city.name}</option>
          ))}
        </select>
        <select
          value={value.zoneId}
          onChange={(event) => patch({ zoneId: event.target.value, localityId: "" })}
          className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none"
          aria-label="Filter by NCR zone"
          disabled={!cityZones.length}
        >
          <option value="">All zones</option>
          {cityZones.map((zone) => (
            <option key={zone.id} value={zone.id}>{zone.name}</option>
          ))}
        </select>
        <select
          value={value.localityId}
          onChange={(event) => patch({ localityId: event.target.value })}
          className="h-10 rounded-xl border border-blue-100 bg-white px-3 text-sm text-slate-700 outline-none"
          aria-label="Filter by NCR locality"
          disabled={!visibleLocalities.length}
        >
          <option value="">All localities</option>
          {visibleLocalities.map((locality) => (
            <option key={locality.id} value={locality.id}>{locality.name}{locality.city ? ` · ${locality.city}` : ""}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
