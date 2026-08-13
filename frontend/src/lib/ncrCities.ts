// The Delhi NCR market map. Gurgaon is the live core market; the rest are expansion
// markets held behind the launch-approval workflow until their inventory is verified.
//
// The array below is the ORDERING and the offline fallback, not the truth about status.
// It used to be both, which meant "Delhi — Launching" was a string in this file rather
// than a claim about the catalogue: approving a city in admin changed nothing a visitor
// could see, and correcting the site required a deploy. Status now comes from
// /api/ncr/cities and overlays these entries — see useNcrCities().

import { useEffect, useState, useSyncExternalStore } from "react";

import { API_BASE_URL } from "@/config/api";

export type NcrCityStatus = "live" | "launching" | "planned";

export type NcrCity = {
  slug: string;
  name: string;
  state: string;
  status: NcrCityStatus;
  /** Short editorial line used on cards/switchers. */
  blurb: string;
};

export const NCR_REGION = "Delhi NCR";

// Ordered the way the market map should read: the live city first, then the two
// markets actually being verified, then everything still on the roadmap.
export const NCR_CITIES: NcrCity[] = [
  { slug: "gurgaon", name: "Gurgaon", state: "Haryana", status: "live", blurb: "Verified societies, live now" },
  { slug: "delhi", name: "Delhi", state: "Delhi", status: "launching", blurb: "Verification underway" },
  { slug: "noida", name: "Noida", state: "Uttar Pradesh", status: "launching", blurb: "Verification underway" },
  { slug: "greater-noida", name: "Greater Noida", state: "Uttar Pradesh", status: "planned", blurb: "Coming soon" },
  { slug: "faridabad", name: "Faridabad", state: "Haryana", status: "planned", blurb: "Coming soon" },
  { slug: "ghaziabad", name: "Ghaziabad", state: "Uttar Pradesh", status: "planned", blurb: "Coming soon" },
];

export const LIVE_NCR_CITY = NCR_CITIES.find((city) => city.status === "live") ?? NCR_CITIES[0];

export function ncrCityBySlug(slug?: string | null): NcrCity {
  const clean = String(slug || "").trim().toLowerCase();
  return NCR_CITIES.find((city) => city.slug === clean) ?? LIVE_NCR_CITY;
}

export function ncrCityStatusLabel(status: NcrCityStatus): string {
  if (status === "live") return "Live";
  if (status === "launching") return "Launching";
  return "Coming soon";
}

// Fetched once per page load and shared. Every consumer renders the same market map, and
// four separate requests for one small, slow-moving list would be wasteful.
let inFlight: Promise<NcrCity[]> | null = null;
let resolved: NcrCity[] | null = null;

// The last statuses the backend gave us, kept so the first paint does not have to guess.
//
// The selected city was persisted and its status was not, which is the asymmetry behind
// the flash: a returning visitor on Delhi rendered the static array's "Launching", panel
// and all, and then swapped to the live search box a moment later. A remembered real
// status is a better opening claim than a hardcoded stale one.
const CITIES_CACHE_KEY = "sf.ncr.cities.v1";
const CITIES_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The statuses the first render will open on, before any request completes. Exported so the
 * opening claim can be inspected directly — a flash lasts a few hundred milliseconds, which
 * is too short to catch by sampling the page after it has loaded.
 */
export function firstPaintNcrCities(): NcrCity[] {
  return resolved ?? readCachedCities() ?? NCR_CITIES;
}

function readCachedCities(): NcrCity[] | null {
  try {
    const raw = window.localStorage.getItem(CITIES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; data?: Array<{ slug?: string; status?: string }> };
    // Capped rather than trusted forever: if the API has been unreachable for a week, a
    // stale claim about what is live stops being better than the fallback.
    if (!parsed?.at || Date.now() - parsed.at > CITIES_CACHE_TTL_MS) return null;
    return Array.isArray(parsed.data) ? overlay(parsed.data) : null;
  } catch {
    return null;
  }
}

function writeCachedCities(cities: NcrCity[]) {
  try {
    window.localStorage.setItem(
      CITIES_CACHE_KEY,
      JSON.stringify({ at: Date.now(), data: cities.map((city) => ({ slug: city.slug, status: city.status })) }),
    );
  } catch {
    // Not remembering costs a flash on the next load, nothing more.
  }
}

function overlay(remote: Array<{ slug?: string; status?: string }>): NcrCity[] {
  const bySlug = new Map(
    remote
      .filter((row) => row?.slug)
      .map((row) => [String(row.slug), String(row.status || "")]),
  );

  return NCR_CITIES.map((city) => {
    const status = bySlug.get(city.slug);
    // The local entry wins on anything the API does not recognise, so a bad or partial
    // response degrades to today's copy rather than blanking the market map.
    return status === "live" || status === "launching" || status === "planned"
      ? { ...city, status }
      : city;
  });
}

export async function fetchNcrCities(): Promise<NcrCity[]> {
  if (resolved) return resolved;

  inFlight ??= fetch(`${API_BASE_URL}/ncr/cities`, { headers: { Accept: "application/json" } })
    .then(async (response) => {
      if (!response.ok) return NCR_CITIES;
      const payload = await response.json().catch(() => null);
      return Array.isArray(payload?.data) ? overlay(payload.data) : NCR_CITIES;
    })
    .catch(() => NCR_CITIES)
    .then((cities) => {
      resolved = cities;
      writeCachedCities(cities);
      return cities;
    });

  return inFlight;
}

/**
 * The market map with live status.
 *
 * Opens on the last real statuses we were told, falling back to the static list only when
 * there is nothing remembered, then revalidates from the backend. So the first paint is
 * never blank, never a stale guess for a returning visitor, and a failed request leaves
 * whatever we last knew in place.
 */
export function useNcrCities(): NcrCity[] {
  // Read synchronously so the very first render already has real statuses; the fetch below
  // still runs every load, so an approval made since is picked up within the second.
  const [cities, setCities] = useState<NcrCity[]>(firstPaintNcrCities);

  useEffect(() => {
    let alive = true;
    fetchNcrCities().then((next) => {
      if (alive) setCities(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return cities;
}

export function ncrCityFrom(cities: NcrCity[], slug?: string | null): NcrCity {
  const clean = String(slug || "").trim().toLowerCase();
  return cities.find((city) => city.slug === clean) ?? cities.find((city) => city.status === "live") ?? cities[0];
}

function citySlugOf(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    // One city, two spellings, both in the catalogue. The backend normalises these on save,
    // but a row is only normalised once something saves it — until then a "New Delhi"
    // society would be invisible under the Delhi chip, which is the worse failure.
    .replace("gurugram", "gurgaon")
    .replace("new-delhi", "delhi");
}

/**
 * Does this row belong to the city being browsed?
 *
 * Matched on the city text rather than city_id because a good deal of the catalogue predates
 * the city table and carries only the string. A row with no city at all is Gurgaon by
 * history — the same assumption the backend's inLiveCities() makes.
 */
export function rowIsInCity(row: { city?: string | null } | null | undefined, city: NcrCity): boolean {
  const rowCity = citySlugOf(row?.city);

  return rowCity === "" ? city.slug === LIVE_NCR_CITY.slug : rowCity === citySlugOf(city.slug);
}

// Which city the visitor is browsing. One value for the whole app: the navbar chip, the
// hero switcher and the search placeholder are three views of the same choice, and holding
// it as component state in each of them meant picking Delhi in the hero left the navbar
// still saying Gurgaon. Kept as a module store rather than a context so any component can
// read it without the whole tree being wrapped.
const SELECTION_KEY = "sf.ncr.city";

function readStoredSlug(): string {
  if (typeof window === "undefined") return LIVE_NCR_CITY.slug;
  try {
    return window.localStorage.getItem(SELECTION_KEY) || LIVE_NCR_CITY.slug;
  } catch {
    // Private browsing and blocked storage both throw here; the default is fine.
    return LIVE_NCR_CITY.slug;
  }
}

let selectedSlug = readStoredSlug();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSelectedNcrCitySlug(slug: string) {
  if (slug === selectedSlug) return;
  selectedSlug = slug;
  try {
    window.localStorage.setItem(SELECTION_KEY, slug);
  } catch {
    // Not being able to remember the choice is survivable; not honouring it is not.
  }
  listeners.forEach((listener) => listener());
}

/** The selected city, resolved against live status, plus a setter every consumer shares. */
export function useSelectedNcrCity(): [NcrCity, (city: NcrCity) => void] {
  const cities = useNcrCities();
  const slug = useSyncExternalStore(subscribe, () => selectedSlug, () => selectedSlug);

  return [ncrCityFrom(cities, slug), (city: NcrCity) => setSelectedNcrCitySlug(city.slug)];
}
