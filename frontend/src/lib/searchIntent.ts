/**
 * What people type when they know what they want but not where it is.
 *
 * "2 bhk under 50k with a pool", "semi furnished 3bhk near metro", "pet friendly society" —
 * none of that is a society name, a sector or a locality, which is all search understood.
 * A text search for "under 50k" matches the word "50k" in no listing on earth, so these
 * queries returned either nothing or an arbitrary ranking of the whole catalogue.
 *
 * This reads the constraints out of the sentence and applies them as filters. It is
 * deliberately a plain parser rather than an AI call: these phrases are a small, stable
 * vocabulary, users type them constantly, and paying a model to re-derive "bhk means
 * bedrooms" on every keystroke would be both slow and expensive.
 */

export interface SearchIntent {
  /** Bedroom counts, e.g. [2, 3] for "2 or 3 bhk". Studio is 0. */
  bhk: number[];
  /** Monthly rent ceiling in rupees. */
  maxRent: number | null;
  /** Purchase price ceiling in rupees. */
  maxBuy: number | null;
  /** Monthly rent floor, from "between 30k and 50k". */
  minRent: number | null;
  /** Canonical amenity tokens the home must have. */
  amenities: string[];
  /** "furnished" | "semi furnished" | "unfurnished" */
  furnished: string | null;
  /** Compass orientation of the unit — recorded per home, never per society. */
  facing: string | null;
  /** "ground" | "top" | a storey number. */
  floor: string | null;
  nearMetro: boolean;
  /** Everything left after the understood parts were lifted out. */
  remainder: string;
}

/** True when the query said anything this parser can act on. */
export function hasIntent(intent: SearchIntent): boolean {
  return (
    intent.bhk.length > 0 ||
    intent.maxRent !== null ||
    intent.maxBuy !== null ||
    intent.amenities.length > 0 ||
    intent.furnished !== null ||
    intent.facing !== null ||
    intent.floor !== null ||
    intent.nearMetro
  );
}

/**
 * Rent and sale prices are told apart by size, not by wording.
 *
 * People say "under 50k" for rent and "under 2 cr" to buy without ever naming which they
 * mean, and they are never ambiguous in practice: nobody rents at five lakh a month and
 * nothing sells for less.
 */
const RENT_CEILING = 500000;

const AMENITY_WORDS: Array<[string, string[]]> = [
  ["swimming pool", ["swimming pool", "pool", "swimming"]],
  ["gym", ["gym", "gymnasium", "fitness"]],
  ["clubhouse", ["clubhouse", "club house", "club"]],
  ["power backup", ["power backup", "backup", "generator", "dg backup"]],
  ["parking", ["parking", "car park", "covered parking"]],
  ["security", ["security", "gated", "guarded", "cctv"]],
  ["lift", ["lift", "elevator"]],
  ["park", ["park", "garden", "green", "lawn"]],
  ["kids play area", ["kids play area", "play area", "kids area", "children play"]],
  ["pet friendly", ["pet friendly", "pets allowed", "pet"]],
];

const FURNISHING_WORDS: Array<[string, string[]]> = [
  // Longest first: "semi furnished" must win before "furnished" can claim it.
  ["semi furnished", ["semi furnished", "semi-furnished", "semifurnished"]],
  ["unfurnished", ["unfurnished", "un furnished", "bare shell"]],
  ["furnished", ["fully furnished", "furnished"]],
];

const METRO_WORDS = ["near metro", "metro nearby", "close to metro", "walk to metro", "metro connectivity"];

function normalise(value: string): string {
  return ` ${String(value ?? "").toLowerCase().replace(/[^a-z0-9.\s]/g, " ").replace(/\s+/g, " ").trim()} `;
}

/** "50k" → 50000, "1.2 lakh" → 120000, "2 cr" → 20000000, "45000" → 45000. */
function toRupees(amount: string, unit: string): number | null {
  const value = Number.parseFloat(amount);
  if (!Number.isFinite(value)) return null;

  const scale = unit.startsWith("k") || unit.startsWith("thousand")
    ? 1000
    : unit.startsWith("l")
      ? 100000
      : unit.startsWith("c")
        ? 10000000
        : 1;

  return Math.round(value * scale);
}

// Longest spelling first: "lakh" must match before the bare "l" can claim its first letter.
const MONEY = "([0-9]+(?:\\.[0-9]+)?)\\s*(thousand|lakhs|lakh|lacs|lac|crores|crore|cr|k|l)?";

export function parseSearchIntent(rawQuery: string): SearchIntent {
  let text = normalise(rawQuery);

  const intent: SearchIntent = {
    bhk: [],
    maxRent: null,
    maxBuy: null,
    minRent: null,
    amenities: [],
    furnished: null,
    facing: null,
    floor: null,
    nearMetro: false,
    remainder: "",
  };

  const lift = (pattern: RegExp, take: (match: RegExpMatchArray) => void) => {
    const match = text.match(pattern);
    if (!match) return;
    take(match);
    text = text.replace(pattern, " ");
  };

  // A range first — "between 30k and 50k" also contains something that looks like a
  // ceiling, so reading the ceiling first would swallow half the sentence.
  lift(new RegExp(`(?:between\\s+)?${MONEY}\\s*(?:to|and|-|–)\\s*${MONEY}`), (m) => {
    const low = toRupees(m[1], m[2] ?? "");
    const high = toRupees(m[3], m[4] ?? "");
    if (low === null || high === null) return;
    // "30k to 50" means 30k to 50k; a bare second number inherits the first one's unit.
    const scaled = m[4] ? high : Math.round((low / Number.parseFloat(m[1])) * Number.parseFloat(m[3]));
    if (scaled <= RENT_CEILING) {
      intent.minRent = low;
      intent.maxRent = scaled;
    } else {
      intent.maxBuy = scaled;
    }
  });

  lift(new RegExp(`(?:under|below|less than|upto|up to|within|max|maximum|budget(?: of)?)\\s*(?:rs|inr)?\\s*${MONEY}`), (m) => {
    const value = toRupees(m[1], m[2] ?? "");
    if (value === null) return;
    if (value <= RENT_CEILING) intent.maxRent = value;
    else intent.maxBuy = value;
  });

  // "2 bhk", "2/3 bhk", "2 or 3 bhk", "3bhk"
  lift(/([0-9])\s*(?:\/|or|,|and|-)\s*([0-9])\s*(?:bhk|bed|beds|bedroom|bedrooms)/, (m) => {
    intent.bhk = [Number(m[1]), Number(m[2])];
  });
  lift(/([0-9])\s*(?:bhk|bed|beds|bedroom|bedrooms)/, (m) => {
    if (intent.bhk.length === 0) intent.bhk = [Number(m[1])];
  });
  lift(/\bstudio\b/, () => {
    if (!intent.bhk.includes(0)) intent.bhk.push(0);
  });

  lift(/\b(north\s*east|north\s*west|south\s*east|south\s*west|north|south|east|west)\s*(?:facing|face)\b/, (m) => {
    intent.facing = m[1].replace(/\s+/g, "-");
  });

  lift(/\b(?:on the\s+)?(ground|top|first|second|third|higher|lower)\s*floor\b/, (m) => {
    intent.floor = m[1];
  });
  lift(/\b(?:floor\s*([0-9]{1,2})|([0-9]{1,2})(?:st|nd|rd|th)\s*floor)\b/, (m) => {
    intent.floor ??= m[1] ?? m[2];
  });

  for (const phrase of METRO_WORDS) {
    if (text.includes(` ${phrase} `) || text.includes(`${phrase} `)) {
      intent.nearMetro = true;
      text = text.replace(phrase, " ");
      break;
    }
  }

  for (const [canonical, words] of FURNISHING_WORDS) {
    const hit = words.find((word) => text.includes(word));
    if (!hit) continue;
    intent.furnished = canonical;
    text = text.replace(hit, " ");
    break;
  }

  for (const [canonical, words] of AMENITY_WORDS) {
    // Longest spelling first, so "swimming pool" is lifted whole rather than leaving "pool".
    const hit = [...words].sort((a, b) => b.length - a.length).find((word) => text.includes(` ${word} `));
    if (!hit) continue;
    // "park facing" and "golf course view" describe an outlook, not a facility on site.
    // Claiming the noun here would leave the free-text layer holding a bare "facing".
    if (new RegExp(`${hit}\\s+(?:facing|view|views|overlooking)|(?:facing|overlooking)\\s+(?:the\\s+)?${hit}`).test(text)) continue;
    intent.amenities.push(canonical);
    text = text.replace(` ${hit} `, " ");
  }

  // What is left, with its connectives intact. This is the input to the free-text layer,
  // and squashing filler words out here destroyed phrases before that layer could see
  // them: "ready to move" arrived as "ready move" and stopped matching anything.
  intent.remainder = text.replace(/\s+/g, " ").trim();

  return intent;
}

/** Short human labels for what was understood, so a misread is visible. */
export function describeIntent(intent: SearchIntent): string[] {
  const chips: string[] = [];

  if (intent.bhk.length > 0) {
    chips.push(intent.bhk.map((n) => (n === 0 ? "Studio" : `${n} BHK`)).join(" or "));
  }
  if (intent.maxRent !== null) {
    chips.push(`${intent.minRent !== null ? `${formatMoney(intent.minRent)}–` : "Under "}${formatMoney(intent.maxRent)}/mo`);
  }
  if (intent.maxBuy !== null) chips.push(`Under ${formatMoney(intent.maxBuy)}`);
  if (intent.furnished) chips.push(titleCase(intent.furnished));
  if (intent.facing) chips.push(`${titleCase(intent.facing.replace(/-/g, " "))} facing`);
  if (intent.floor) chips.push(/^[0-9]+$/.test(intent.floor) ? `Floor ${intent.floor}` : `${titleCase(intent.floor)} floor`);
  if (intent.nearMetro) chips.push("Near metro");
  for (const amenity of intent.amenities) chips.push(titleCase(amenity));

  return chips;
}

function titleCase(value: string): string {
  return value.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function formatMoney(rupees: number): string {
  if (rupees >= 10000000) return `₹${trim(rupees / 10000000)}Cr`;
  if (rupees >= 100000) return `₹${trim(rupees / 100000)}L`;
  if (rupees >= 1000) return `₹${trim(rupees / 1000)}K`;
  return `₹${rupees}`;
}

function trim(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** The first rupee figure in a string like "₹1.1L - ₹2.4L" or "₹45,000". */
export function lowestRupees(value: unknown): number | null {
  const text = String(value ?? "").toLowerCase().replace(/,/g, "");
  const match = text.match(new RegExp(MONEY));
  if (!match) return null;

  return toRupees(match[1], match[2] ?? "");
}

function amenityText(row: any): string {
  const list = Array.isArray(row?.amenities) ? row.amenities : [];

  return normalise([...list, row?.description, row?.nearby_metro, row?.nearbyMetro].filter(Boolean).join(" "));
}

function hasAmenities(row: any, intent: SearchIntent): boolean {
  const text = amenityText(row);

  return intent.amenities.every((amenity) => {
    const words = AMENITY_WORDS.find(([canonical]) => canonical === amenity)?.[1] ?? [amenity];
    return words.some((word) => text.includes(word));
  });
}

function nearMetro(row: any): boolean {
  const metro = row?.nearby_metro ?? row?.nearbyMetro;
  if (Array.isArray(metro) ? metro.length > 0 : String(metro ?? "").trim() !== "") return true;

  return amenityText(row).includes("metro");
}

/**
 * A society passes a budget if anything in it could plausibly cost that much — its range
 * starts at or below the ceiling. Filtering on the top of the range would drop every large
 * society, which all have an expensive penthouse and a normal 2 BHK.
 */
export function societyMatchesIntent(society: any, intent: SearchIntent): boolean {
  if (intent.maxRent !== null) {
    const floor = lowestRupees(society?.rent_range ?? society?.rentRange);
    if (floor !== null && floor > intent.maxRent) return false;
  }
  if (intent.maxBuy !== null) {
    const floor = lowestRupees(society?.buy_range ?? society?.buyRange);
    if (floor !== null && floor > intent.maxBuy) return false;
  }
  if (intent.nearMetro && !nearMetro(society)) return false;

  return hasAmenities(society, intent);
}

/**
 * The parts of a search that describe the home rather than where it is.
 *
 * "a park facing home in a society near golf course" is two questions: the society answers
 * "near golf course", only a listed unit can answer "park facing". Keeping them apart is
 * what lets the page say which half it could satisfy.
 */
export function unitAsks(intent: SearchIntent): string[] {
  const asks: string[] = [];

  if (intent.bhk.length > 0) asks.push(intent.bhk.map((n) => (n === 0 ? "Studio" : `${n} BHK`)).join(" or "));
  if (intent.facing) asks.push(`${titleCase(intent.facing.replace(/-/g, " "))} facing`);
  if (intent.floor) asks.push(/^[0-9]+$/.test(intent.floor) ? `Floor ${intent.floor}` : `${titleCase(intent.floor)} floor`);
  if (intent.furnished) asks.push(titleCase(intent.furnished));
  if (intent.maxRent !== null) asks.push(`Under ${formatMoney(intent.maxRent)}/mo`);
  if (intent.maxBuy !== null) asks.push(`Under ${formatMoney(intent.maxBuy)}`);

  return asks;
}

export function propertyMatchesIntent(property: any, intent: SearchIntent): boolean {
  if (intent.facing) {
    const facing = String(property?.facing ?? "").toLowerCase().replace(/[^a-z]/g, "-");
    if (facing && facing !== intent.facing) return false;
  }

  if (intent.floor) {
    const floor = String(property?.floor ?? "").toLowerCase().trim();
    if (floor && !floorMatches(floor, intent.floor)) return false;
  }

  if (intent.bhk.length > 0) {
    const bedrooms = Number(property?.bedrooms ?? property?.bhk);
    if (Number.isFinite(bedrooms) && !intent.bhk.includes(bedrooms)) return false;
  }

  const price = lowestRupees(property?.price ?? property?.rent ?? property?.expectedPrice);
  const isRental = String(property?.listingType ?? "").toLowerCase().includes("rent");

  if (price !== null) {
    if (isRental && intent.maxRent !== null && price > intent.maxRent) return false;
    if (!isRental && intent.maxBuy !== null && price > intent.maxBuy) return false;
    // A rent ceiling asked of a sale listing (or the reverse) is not a reason to hide it;
    // the tab already separates those, and guessing here drops correct results.
  }

  if (intent.furnished) {
    // Compared as whole categories. "Semi-Furnished" contains the word "furnished", so a
    // substring test would offer a semi-furnished flat to someone who asked for a fully
    // furnished one — the single most annoying way for a filter to be wrong.
    const status = String(property?.furnishedStatus ?? property?.furnished_status ?? "").toLowerCase().replace(/[-_]/g, " ").trim();
    if (status) {
      const category = FURNISHING_WORDS.find(([, words]) => words.some((word) => status.includes(word)))?.[0];
      if (category && category !== intent.furnished) return false;
    }
  }

  if (intent.nearMetro && !nearMetro(property)) return false;

  return hasAmenities(property, intent);
}

/** "ground", "top", "3" — compared as people mean them, not as strings. */
function floorMatches(actual: string, wanted: string): boolean {
  if (wanted === actual) return true;

  const storey = Number.parseInt(actual, 10);
  if (!Number.isFinite(storey)) return false;

  if (wanted === "ground") return storey === 0;
  if (wanted === "first") return storey === 1;
  if (wanted === "second") return storey === 2;
  if (wanted === "third") return storey === 3;
  if (wanted === "lower") return storey <= 3;
  if (wanted === "higher") return storey >= 8;
  // "top floor" needs the tower height, which a listing does not carry, so it is not
  // guessed at — a wrong exclusion here hides the one home someone wanted.
  if (wanted === "top") return true;

  return String(storey) === wanted;
}
