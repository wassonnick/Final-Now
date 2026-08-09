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
      return cities;
    });

  return inFlight;
}

/**
 * The market map with live status. Renders immediately from the static list, then swaps in
 * whatever the backend says — so the first paint is never blank and a failed request just
 * leaves the fallback in place.
 */
export function useNcrCities(): NcrCity[] {
  const [cities, setCities] = useState<NcrCity[]>(resolved ?? NCR_CITIES);

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
