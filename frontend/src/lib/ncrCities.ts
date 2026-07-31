// The Delhi NCR market map. Gurgaon is the live core market; the rest are expansion
// markets held behind the launch-approval workflow until their inventory is verified.
// This is the single front-end source of truth for the multi-city design language.

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
