// Price-segment landing pages — high-intent search demand ("luxury flats in Gurgaon",
// "flats under 2 cr"). Each renders BudgetLandingPage, filtered by the society's verified
// buy range. Bands are in absolute rupees; max = Infinity for open-ended tiers.
export type BudgetSegment = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  min: number;
  max: number;
  seo: { title: string; description: string };
};

const CR = 1e7;

export const BUDGET_SEGMENTS: Record<string, BudgetSegment> = {
  affordable: {
    slug: "affordable",
    eyebrow: "Value homes",
    title: "Affordable flats in Gurgaon",
    subtitle: "Verified Gurgaon societies with resale entry points up to ₹1.5 Cr — sensible, checked homes without the premium.",
    min: 0,
    max: 1.5 * CR,
    seo: { title: "Affordable Flats in Gurgaon under ₹1.5 Cr — Verified Societies | SocietyFlats", description: "Browse verified affordable Gurgaon societies with resale ranges up to ₹1.5 Cr. Real scores, honest price context, no fake listings." },
  },
  "under-2-cr": {
    slug: "under-2-cr",
    eyebrow: "Budget-led",
    title: "Flats under ₹2 Cr in Gurgaon",
    subtitle: "Verified societies with resale entry points under ₹2 Cr — compared on connectivity, lifestyle and honest market ranges.",
    min: 0,
    max: 2 * CR,
    seo: { title: "Flats Under ₹2 Cr in Gurgaon — Verified Societies & Prices | SocietyFlats", description: "Verified Gurgaon societies with resale ranges under ₹2 Cr. Society scores, real price context and no fake inventory." },
  },
  "under-3-cr": {
    slug: "under-3-cr",
    eyebrow: "Budget-led",
    title: "Flats under ₹3 Cr in Gurgaon",
    subtitle: "Verified societies with resale entry points under ₹3 Cr — a strong mid-premium band across sectors.",
    min: 0,
    max: 3 * CR,
    seo: { title: "Flats Under ₹3 Cr in Gurgaon — Verified Societies & Prices | SocietyFlats", description: "Verified Gurgaon societies with resale ranges under ₹3 Cr. Real scores, honest pricing, verified inventory only." },
  },
  luxury: {
    slug: "luxury",
    eyebrow: "Premium living",
    title: "Luxury flats in Gurgaon",
    subtitle: "Verified premium societies with resale entry points from ₹3 Cr to ₹7 Cr — polished addresses, checked against the market.",
    min: 3 * CR,
    max: 7 * CR,
    seo: { title: "Luxury Flats in Gurgaon (₹3–7 Cr) — Verified Premium Societies | SocietyFlats", description: "Explore verified luxury Gurgaon societies priced ₹3–7 Cr. Society scores, market ranges and the Buyer's Truth on every profile." },
  },
  elite: {
    slug: "elite",
    eyebrow: "Elite addresses",
    title: "Elite flats in Gurgaon",
    subtitle: "Verified elite societies with resale entry points from ₹7 Cr to ₹15 Cr — the sought-after Golf Course and prime-sector addresses.",
    min: 7 * CR,
    max: 15 * CR,
    seo: { title: "Elite Flats in Gurgaon (₹7–15 Cr) — Verified Prime Societies | SocietyFlats", description: "Verified elite Gurgaon societies priced ₹7–15 Cr. Real scores, honest market context, verified availability only." },
  },
  "ultra-luxury": {
    slug: "ultra-luxury",
    eyebrow: "Ultra-luxury",
    title: "Ultra-luxury flats in Gurgaon",
    subtitle: "Verified ultra-luxury societies with resale entry points above ₹15 Cr — Gurgaon's most exclusive verified addresses.",
    min: 15 * CR,
    max: Infinity,
    seo: { title: "Ultra-Luxury Flats in Gurgaon (₹15 Cr+) — Verified Societies | SocietyFlats", description: "Discover verified ultra-luxury Gurgaon societies above ₹15 Cr. Society intelligence scores and honest market ranges, no fake listings." },
  },
};

export const BUDGET_SEGMENT_LIST = Object.values(BUDGET_SEGMENTS);
