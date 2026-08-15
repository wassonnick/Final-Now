/**
 * Score every society against what one person said they need.
 *
 * A search box answers "what matches these words". A brief answers a harder and more
 * useful question — "of everything we hold, which few are actually right for you, and
 * why". The difference matters most when there is little listed inventory: a shortlist
 * drawn from 526 scored societies is valuable on a day when two flats are listed.
 *
 * Every number here has to be defensible. `score_breakdown` carries five scored
 * dimensions per society with per-signal labels ("911m to nearest metro/transit") and a
 * confidence, so a fit percentage can show its working rather than ask to be believed.
 * Where the data is thin the fit says so instead of quietly averaging over the hole.
 */

export type BriefMode = "rent" | "buy";

export interface Brief {
  mode: BriefMode;
  /** Who it is for — shapes tone and which priorities are pre-selected. */
  purpose: string;
  /** Rupees per month when renting, total rupees when buying. */
  budget: number;
  /** Bedroom counts. 0 is a studio. */
  bhk: number[];
  /** Locality, sector or landmark, as typed or picked. */
  where: string;
  /** Where they travel to most days — an office, a campus, a metro line. */
  commute: string;
  /** How soon they need it. */
  timeline: string;
  /** Chosen priority ids. */
  priorities: string[];
  /** Anything the options did not capture. */
  notes: string;
}

export const EMPTY_BRIEF: Brief = {
  mode: "rent",
  purpose: "",
  budget: 40000,
  bhk: [],
  where: "",
  commute: "",
  timeline: "",
  priorities: [],
  notes: "",
};

export interface Priority {
  id: string;
  label: string;
  /** The scored dimension this priority reads, when one exists. */
  dimension?: "connectivity" | "lifestyle" | "security" | "maintenance" | "investment";
  /** Judged from fields rather than a score. */
  evidence?: "rera" | "builder" | "ready";
  /** Nothing we hold answers this. Captured and carried to a human instead. */
  unrecorded?: boolean;
  modes?: BriefMode[];
}

/**
 * What people say matters, including the things no column of ours answers.
 *
 * Payment plans and possession guarantees are the questions buyers ask first and the
 * ones a catalogue is worst at. Leaving them off the list does not make them go away —
 * it just means the requirement is never captured. They are collected here, marked
 * honestly, and carried into the conversation a person will actually have.
 */
export const PRIORITIES: Priority[] = [
  { id: "location", label: "Location & commute", dimension: "connectivity" },
  { id: "amenities", label: "Amenities & lifestyle", dimension: "lifestyle" },
  { id: "safety", label: "Safety & security", dimension: "security" },
  { id: "upkeep", label: "Build quality & upkeep", dimension: "maintenance" },
  { id: "value", label: "Value & resale", dimension: "investment", modes: ["buy"] },
  { id: "legal", label: "Legal safety (RERA)", evidence: "rera", modes: ["buy"] },
  { id: "developer", label: "Developer reputation", evidence: "builder" },
  { id: "ready", label: "Ready to move in", evidence: "ready" },
  { id: "no_emi", label: "No EMI till possession", unrecorded: true, modes: ["buy"] },
  { id: "payment_plan", label: "Flexible payment plan", unrecorded: true, modes: ["buy"] },
  { id: "pet_friendly", label: "Pet friendly", unrecorded: true, modes: ["rent"] },
  { id: "negotiable", label: "Negotiable deposit", unrecorded: true, modes: ["rent"] },
];

export function prioritiesFor(mode: BriefMode): Priority[] {
  return PRIORITIES.filter((priority) => !priority.modes || priority.modes.includes(mode));
}

export function priorityById(id: string): Priority | undefined {
  return PRIORITIES.find((priority) => priority.id === id);
}

/** Priorities we cannot answer from data, so a person has to. */
export function unrecordedPriorities(brief: Brief): Priority[] {
  return brief.priorities.map(priorityById).filter((p): p is Priority => Boolean(p?.unrecorded));
}

export interface FitReason {
  label: string;
  /** Whether this counted for or against the society. */
  good: boolean;
}

export interface Fit {
  society: any;
  /** 0–100. */
  percent: number;
  reasons: FitReason[];
  /** Priorities we could not judge for this society because the data is missing. */
  unknown: string[];
  verdict: "Strong match" | "Good match" | "Worth a look";
}

/**
 * Measured distances from wherever they said they commute to.
 *
 * Resolved through the same landmark service the search box uses, so "Cyber Hub" or
 * "AIIMS" becomes a coordinate and then a real number of kilometres per society. It is
 * the one question here nobody can answer by guessing, which is why it is worth asking.
 */
export interface CommuteContext {
  name: string;
  /** Society id → kilometres. */
  distances: Map<string, number>;
}

export interface Shortlist {
  /** How many societies were considered in the selected city. */
  scanned: number;
  /** How many cleared every hard requirement. */
  eligible: number;
  fits: Fit[];
  /** Requirements that excluded everything and had to be loosened. */
  loosened: string[];
}

function num(value: unknown): number | null {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));

  return Number.isFinite(parsed) ? parsed : null;
}

/** The lowest rupee figure in "₹1.1L - ₹2.4L" or "₹98 lakh - ₹1.25 Cr". */
function lowestRupees(value: unknown): number | null {
  const text = String(value ?? "").toLowerCase().replace(/,/g, "");
  const match = text.match(/([0-9]+(?:\.[0-9]+)?)\s*(thousand|lakhs|lakh|lacs|lac|crores|crore|cr|k|l)?/);
  if (!match) return null;

  const value_ = Number.parseFloat(match[1]);
  const unit = match[2] ?? "";
  const scale = unit.startsWith("k") || unit.startsWith("thousand") ? 1000
    : unit.startsWith("la") || unit === "l" ? 100000
      : unit.startsWith("cr") || unit === "c" ? 10000000
        : 1;

  return Math.round(value_ * scale);
}

function configurationBhk(society: any): number[] {
  return [...String(society?.configuration ?? "").matchAll(/([0-9])\s*bhk/gi)].map((m) => Number(m[1]));
}

function dimension(society: any, name: string): { value: number; confidence: number; label: string } | null {
  const breakdown = society?.scoreBreakdown ?? society?.score_breakdown;
  const entry = breakdown?.[name];
  if (!entry || typeof entry !== "object") return null;

  const value = num(entry.value);
  if (value === null) return null;

  // The strongest signal is the one worth quoting: it is what actually moved the score.
  const signals = Object.values(entry.signals ?? {}) as any[];
  const best = signals
    .filter((signal) => signal?.present && signal?.label)
    .sort((a, b) => (num(b.value) ?? 0) * (num(b.weight) ?? 1) - (num(a.value) ?? 0) * (num(a.weight) ?? 1))[0];

  return { value, confidence: num(entry.confidence) ?? 0, label: String(best?.label ?? "") };
}

const TIMELINE_READY = ["now", "1"];

/**
 * Requirements that are not negotiable, in the order a person would give them up.
 *
 * Returned rather than applied so the shortlist can loosen the last one instead of
 * showing nothing — and say which one it loosened.
 */
function hardChecks(brief: Brief): Array<{ id: string; label: string; test: (society: any) => boolean }> {
  const checks: Array<{ id: string; label: string; test: (society: any) => boolean }> = [];

  if (brief.where.trim()) {
    const wanted = brief.where.toLowerCase().trim();
    checks.push({
      id: "where",
      label: brief.where,
      test: (society) =>
        `${society?.locality ?? ""} ${society?.sector ?? ""} ${society?.city ?? ""} ${society?.name ?? ""}`
          .toLowerCase().includes(wanted),
    });
  }

  if (brief.bhk.length > 0) {
    checks.push({
      id: "bhk",
      label: brief.bhk.map((n) => (n === 0 ? "Studio" : `${n} BHK`)).join(" / "),
      test: (society) => {
        const available = configurationBhk(society);
        // No configuration recorded is not evidence of absence, so it is not a rejection.
        return available.length === 0 || available.some((n) => brief.bhk.includes(n));
      },
    });
  }

  if (brief.budget > 0) {
    checks.push({
      id: "budget",
      label: brief.mode === "rent" ? `Under ${formatMoney(brief.budget)}/mo` : `Around ${formatMoney(brief.budget)}`,
      test: (society) => {
        const floor = lowestRupees(brief.mode === "rent" ? society?.rentRange ?? society?.rent_range : society?.buyRange ?? society?.buy_range);
        if (floor === null) return true;
        // Buyers stretch, renters do not. A tenth over is still worth showing to a buyer.
        return brief.mode === "rent" ? floor <= brief.budget : floor <= brief.budget * 1.1;
      },
    });
  }

  if (TIMELINE_READY.includes(brief.timeline)) {
    checks.push({
      id: "timeline",
      label: "Ready to move",
      test: (society) => String(society?.projectStatus ?? society?.project_status ?? "").toLowerCase().includes("ready"),
    });
  }

  return checks;
}

export function formatMoney(rupees: number): string {
  if (rupees >= 10000000) return `₹${Number((rupees / 10000000).toFixed(2))} Cr`;
  if (rupees >= 100000) return `₹${Number((rupees / 100000).toFixed(2))} L`;
  if (rupees >= 1000) return `₹${Math.round(rupees / 1000)}K`;

  return `₹${rupees}`;
}

/**
 * How well one society answers the brief, and why.
 *
 * Chosen priorities weigh triple. Everything else still counts a little, because a
 * society that is strong across the board is a better answer than one that spikes on the
 * two boxes someone happened to tick.
 */
function fitFor(society: any, brief: Brief, commute?: CommuteContext): Fit {
  const chosen = new Set(brief.priorities);
  const reasons: FitReason[] = [];
  const unknown: string[] = [];

  let total = 0;
  let weightUsed = 0;

  for (const priority of prioritiesFor(brief.mode)) {
    if (priority.unrecorded) continue;

    const picked = chosen.has(priority.id);
    const weight = picked ? 3 : 1;
    let value: number | null = null;
    let label = "";

    if (priority.dimension) {
      const scored = dimension(society, priority.dimension);
      if (scored) {
        value = scored.value;
        label = scored.label;
      }
    } else if (priority.evidence === "rera") {
      const rera = String(society?.reraNumber ?? society?.rera_number ?? "").trim();
      value = rera ? 9.5 : 4;
      // Registration numbers are stored with their provenance appended ("(Square Yards
      // reference); 121 OF 2017 (alternate source)"), which is right for an audit trail and
      // unreadable on a card.
      label = rera ? `RERA ${rera.split(/[;(]/)[0].trim()}` : "No RERA number on file";
    } else if (priority.evidence === "builder") {
      const builder = String(society?.builder ?? "").trim();
      const known = builder && !/to be verified|unknown/i.test(builder);
      value = known ? Math.min(10, 6 + (num(society?.score) ?? 0) / 2.5) : 5;
      label = known ? `Built by ${builder}` : "Developer not verified";
    } else if (priority.evidence === "ready") {
      const status = String(society?.projectStatus ?? society?.project_status ?? "").toLowerCase();
      if (status) {
        value = status.includes("ready") ? 10 : status.includes("under construction") ? 4 : 7;
        label = status.includes("ready") ? "Ready to move" : `Status: ${society?.projectStatus ?? society?.project_status}`;
      }
    }

    if (value === null) {
      if (!picked) continue;

      /**
       * A priority we cannot judge counts against the score, it does not vanish.
       *
       * Skipping it scored the society on everything except the one thing the person
       * said mattered most — which put a society with no connectivity data at the top of
       * a brief led by commute, at 96%, while admitting on the same card that it could
       * not be assessed on it. Unmeasured is not the same as good.
       */
      unknown.push(priority.label);
      total += 5 * weight;
      weightUsed += weight;
      continue;
    }

    total += value * weight;
    weightUsed += weight;

    if (picked && label) {
      reasons.push({ label, good: value >= 7 });
    }
  }

  /**
   * A stated commute outweighs everything else, because it is the constraint people
   * regret most and the only one here measured in metres rather than judged.
   */
  if (commute) {
    const km = commute.distances.get(String(society?.id));

    if (km === undefined) {
      // Out of range of the search, so genuinely far — not merely unknown.
      total += 3 * 4;
      weightUsed += 4;
    } else {
      const value = km <= 2 ? 10 : km <= 5 ? 8.5 : km <= 10 ? 6.5 : 5;
      total += value * 4;
      weightUsed += 4;
      reasons.unshift({
        label: `${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} from ${commute.name}`,
        good: km <= 8,
      });
    }
  }

  // Nothing scored at all: say so rather than return a confident zero.
  const percent = weightUsed === 0 ? 0 : Math.round((total / (weightUsed * 10)) * 100);

  return {
    society,
    percent,
    reasons: reasons.slice(0, 3),
    unknown,
    verdict: percent >= 80 ? "Strong match" : percent >= 65 ? "Good match" : "Worth a look",
  };
}

/**
 * The shortlist, with the funnel that produced it.
 *
 * Requirements are loosened one at a time, least important first, rather than returning
 * an empty page — and whatever was loosened is named, so nobody is shown a result that
 * quietly ignores what they asked for.
 */
export function buildShortlist(societies: any[], brief: Brief, limit = 6, commute?: CommuteContext): Shortlist {
  const scanned = societies.length;
  let checks = hardChecks(brief);
  const loosened: string[] = [];

  const eligibleFor = (active: typeof checks) =>
    societies.filter((society) => active.every((check) => check.test(society)));

  let eligible = eligibleFor(checks);

  // Where someone wants to live is the last thing they give up, so it is dropped last.
  const givingOrder = ["timeline", "bhk", "budget", "where"];
  const loosenedIds = new Set<string>();

  while (eligible.length === 0 && checks.length > 0) {
    const nextId = givingOrder.find((id) => checks.some((check) => check.id === id));
    const dropped = checks.find((check) => check.id === nextId) ?? checks[0];
    loosened.push(dropped.label);
    loosenedIds.add(dropped.id);
    checks = checks.filter((check) => check !== dropped);
    eligible = eligibleFor(checks);
  }

  const priceOf = (society: any) =>
    lowestRupees(brief.mode === "rent" ? society?.rentRange ?? society?.rent_range : society?.buyRange ?? society?.buy_range);

  /**
   * Once the budget has been let go, the cheapest near-miss leads.
   *
   * Ranking purely on fit put a ₹5.31 Cr project at the top of a ₹1.5 Cr first-home brief,
   * which is a good match to everything except the only number that decides whether it is
   * possible at all. Someone who has to stretch wants the smallest stretch first.
   */
  const fits = eligible
    .map((society) => fitFor(society, brief, commute))
    .sort((a, b) => {
      if (loosenedIds.has("budget") && brief.budget > 0) {
        const overA = Math.max(0, (priceOf(a.society) ?? Infinity) - brief.budget);
        const overB = Math.max(0, (priceOf(b.society) ?? Infinity) - brief.budget);
        if (overA !== overB) return overA - overB;
      }

      return b.percent - a.percent || (num(b.society?.score) ?? 0) - (num(a.society?.score) ?? 0);
    })
    .slice(0, limit);

  return { scanned, eligible: eligible.length, fits, loosened };
}

/** The brief as a person would say it, for the chip and for a human to read on a lead. */
export function describeBrief(brief: Brief): string[] {
  const parts: string[] = [];

  if (brief.budget > 0) parts.push(brief.mode === "rent" ? `${formatMoney(brief.budget)}/mo` : formatMoney(brief.budget));
  if (brief.bhk.length > 0) parts.push(brief.bhk.map((n) => (n === 0 ? "Studio" : `${n} BHK`)).join("/"));
  if (brief.where.trim()) parts.push(brief.where.trim());
  if (brief.commute.trim()) parts.push(`Near ${brief.commute.trim()}`);
  if (brief.timeline) parts.push(timelineLabel(brief));
  for (const id of brief.priorities) {
    const priority = priorityById(id);
    if (priority) parts.push(priority.label);
  }

  return parts;
}

export function timelineLabel(brief: Brief): string {
  const rent: Record<string, string> = {
    now: "Move in now", "1": "Within a month", "3": "In 2–3 months", flexible: "Flexible",
  };
  const buy: Record<string, string> = {
    now: "Ready to move", "1": "Within a year", "3": "Within 3 years", "5": "Within 5 years", flexible: "Flexible",
  };

  return (brief.mode === "rent" ? rent : buy)[brief.timeline] ?? "";
}
