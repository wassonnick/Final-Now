import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { fetchNcrLocations, type NcrCity, type NcrLocality, type NcrLocationsResponse, type NcrRegion, type NcrZone } from "@/lib/ncrLocationsApi";

export type NcrLocationSelection = {
  regionId?: number | "";
  cityId?: number | "";
  zoneId?: number | "";
  localityId?: string;
  city?: string;
  state?: string;
  locality?: string;
  sector?: string;
  microMarket?: string;
  authority?: string;
  pincode?: string;
};

type NcrLocationSelectorProps = {
  value: NcrLocationSelection;
  onChange: (next: NcrLocationSelection) => void;
  title?: string;
  helper?: string;
  compact?: boolean;
  includeAdminFields?: boolean;
};

const emptyLocations: NcrLocationsResponse["data"] = {
  regions: [],
  cities: [],
  zones: [],
  localities: [],
};

function numberOrBlank(value: string): number | "" {
  return value ? Number(value) : "";
}

export function NcrLocationSelector({
  value,
  onChange,
  title = "NCR structured location",
  helper = "Use this for review-only NCR mapping. Public city, sector and locality text still remain as fallback.",
  compact = false,
  includeAdminFields = true,
}: NcrLocationSelectorProps) {
  const [locations, setLocations] = useState(emptyLocations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchNcrLocations()
      .then((response) => {
        if (!cancelled) setLocations(response.data || emptyLocations);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load NCR locations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRegion = useMemo<NcrRegion | undefined>(
    () => locations.regions.find((region) => Number(region.id) === Number(value.regionId)),
    [locations.regions, value.regionId],
  );
  const selectedCity = useMemo<NcrCity | undefined>(
    () => locations.cities.find((city) => Number(city.id) === Number(value.cityId)),
    [locations.cities, value.cityId],
  );
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

  const patch = (partial: NcrLocationSelection) => onChange({ ...value, ...partial });

  const chooseRegion = (regionId: string) => {
    patch({ regionId: numberOrBlank(regionId), cityId: "", zoneId: "", localityId: "" });
  };

  const chooseCity = (cityId: string) => {
    const city = locations.cities.find((item) => Number(item.id) === Number(cityId));
    patch({
      regionId: city?.region_id || value.regionId || "",
      cityId: numberOrBlank(cityId),
      zoneId: "",
      localityId: "",
      city: city?.name || value.city,
      state: city?.state || value.state,
    });
  };

  const chooseZone = (zoneId: string) => {
    patch({ zoneId: numberOrBlank(zoneId), localityId: "" });
  };

  const chooseLocality = (localityId: string) => {
    const locality = locations.localities.find((item) => item.id === localityId);
    patch({
      localityId,
      regionId: locality?.region_id || value.regionId || "",
      cityId: locality?.city_id || value.cityId || "",
      zoneId: locality?.zone_id || value.zoneId || "",
      locality: locality?.name || value.locality,
      sector: locality?.sector_code || value.sector,
      city: locality?.city || selectedCity?.name || value.city,
      state: locality?.state || selectedCity?.state || value.state,
      pincode: locality?.pincode || value.pincode,
    });
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-blue-700">
          {loading ? "Loading" : selectedRegion?.name || "Delhi NCR"}
        </span>
      </div>
      {error ? <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
      <div className={`mt-3 grid gap-3 ${compact ? "md:grid-cols-2" : "md:grid-cols-4"}`}>
        <label className="text-xs font-bold text-slate-600">
          Region
          <select className="mt-1 h-10 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm" value={value.regionId || ""} onChange={(event) => chooseRegion(event.target.value)}>
            <option value="">Delhi NCR</option>
            {locations.regions.map((region) => <option key={region.id} value={region.id}>{region.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          City
          <select className="mt-1 h-10 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm" value={value.cityId || ""} onChange={(event) => chooseCity(event.target.value)}>
            <option value="">Keep current city</option>
            {locations.cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Zone
          <select className="mt-1 h-10 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm" value={value.zoneId || ""} onChange={(event) => chooseZone(event.target.value)}>
            <option value="">No zone yet</option>
            {cityZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Locality
          <select className="mt-1 h-10 w-full rounded-xl border border-blue-100 bg-white px-3 text-sm" value={value.localityId || ""} onChange={(event) => chooseLocality(event.target.value)}>
            <option value="">No locality mapped</option>
            {visibleLocalities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}{locality.city ? ` · ${locality.city}` : ""}</option>)}
          </select>
        </label>
        {includeAdminFields ? (
          <>
            <Input value={value.microMarket || ""} onChange={(event) => patch({ microMarket: event.target.value })} placeholder="Micro-market" className="h-10 rounded-xl border-blue-100 bg-white" />
            <Input value={value.authority || ""} onChange={(event) => patch({ authority: event.target.value })} placeholder="Authority" className="h-10 rounded-xl border-blue-100 bg-white" />
            <Input value={value.pincode || ""} onChange={(event) => patch({ pincode: event.target.value })} placeholder="Pincode" className="h-10 rounded-xl border-blue-100 bg-white" />
          </>
        ) : null}
      </div>
    </div>
  );
}
