export type AdminTone =
  | "blue"
  | "emerald"
  | "rose"
  | "amber"
  | "orange"
  | "violet"
  | "sky"
  | "indigo"
  | "slate";

const TONE_CLASS: Record<AdminTone, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
  violet: "bg-violet-50 text-violet-700 border-violet-100",
  sky: "bg-sky-50 text-sky-700 border-sky-100",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

export function adminToneClass(tone: AdminTone): string {
  return TONE_CLASS[tone] ?? TONE_CLASS.slate;
}

/** bg + text only, no border — for badges/selects that already manage their own border. */
export function adminToneBgText(tone: AdminTone): string {
  return adminToneClass(tone).replace(/\bborder-\S+/g, "").trim();
}

/**
 * Single source of truth for status/priority/source -> tone across all admin pages.
 * Add new domain values here instead of inventing a new className map per page.
 */
const DOMAIN_TONE: Record<string, AdminTone> = {
  // Society status
  Verified: "emerald",
  Premium: "blue",
  Draft: "slate",
  Archived: "rose",
  // Property status
  Live: "emerald",
  Verification: "amber",
  // Property listing type
  Rent: "blue",
  Sale: "violet",
  "Buy / Resale": "violet",
  "Sell Listing": "amber",
  "Builder Floor": "slate",
  // Lead status
  New: "blue",
  Contacted: "sky",
  "Site Visit": "violet",
  Negotiation: "amber",
  Booked: "emerald",
  Lost: "rose",
  // Lead priority
  Hot: "rose",
  Warm: "amber",
  Cold: "slate",
  // Publish state
  Published: "emerald",
  Unpublished: "slate",
};

export function adminToneForValue(value: string | undefined | null, fallback: AdminTone = "slate"): AdminTone {
  if (!value) return fallback;
  return DOMAIN_TONE[value] ?? fallback;
}

export function adminClassForValue(value: string | undefined | null, fallback: AdminTone = "slate"): string {
  return adminToneClass(adminToneForValue(value, fallback));
}
