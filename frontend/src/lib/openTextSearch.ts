/**
 * Search everything we know about a society, not just its name.
 *
 * People ask for things no schema has a column for — "park facing", "luxury flats facing
 * Aravalli", "low rise near golf course". Those words are not attributes; they are things
 * written in the society's own description, its amenity list, its FAQ, its neighbourhood
 * notes. That text is already fetched by the browser for every society, so searching it
 * costs nothing and needs no round trip.
 *
 * The important behaviour is not the matching, it is the reporting. When a word appears
 * nowhere in the catalogue, the search says so and names the word, because "we do not
 * record builder payment plans" and "no society matched" look identical from a blank page
 * and mean completely different things.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "at", "to", "for", "with", "without",
  "is", "are", "be", "my", "me", "i", "we", "want", "need", "looking", "show", "find",
  "please", "any", "some", "that", "this", "it", "its", "home", "homes", "house", "flat",
  "flats", "apartment", "apartments", "property", "properties", "society", "societies",
  "place", "buy", "rent", "sale", "available", "give", "get", "good", "nice", "best",
  "near", "close", "by", "around", "from", "have", "has", "who", "which", "where", "till",
  // Words every listing contains, so requiring them narrows nothing and hides the terms
  // that would have.
  "project", "residential", "unit", "units", "option", "options", "area", "location",
  "located", "offers", "offering", "phase", "block", "road", "station", "type",
]);

/**
 * How people say it, mapped to how the catalogue writes it.
 *
 * These are not general synonyms — each one is a phrase people actually type paired with
 * the wording that appears in real descriptions. "Aravalli" is spelled both ways in the
 * source data and nobody should have to guess which.
 */
const SYNONYMS: Record<string, string[]> = {
  // View and outlook. A description says "overlooking the Aravalli range", never "aravalli
  // facing", so the phrase people type has to carry the wording the data actually uses.
  "park facing": ["park facing", "park view", "facing the park", "overlooking the park", "green view", "garden facing"],
  "golf course facing": ["golf course facing", "golf course view", "golf view", "overlooking the golf"],
  "aravalli facing": ["aravalli facing", "aravalli view", "aravali view", "overlooking the aravalli", "hill view"],
  aravalli: ["aravalli", "aravali"],
  "golf course": ["golf course", "golf"],
  facing: ["facing", "view", "views", "overlooking"],
  park: ["park", "green", "greens", "garden", "gardens", "landscaped", "open space"],

  // Tier and character.
  luxury: ["luxury", "luxurious", "premium", "upscale", "high end", "ultra luxury"],
  affordable: ["affordable", "budget", "value", "mid segment"],
  quiet: ["quiet", "peaceful", "serene", "tranquil", "calm"],
  spacious: ["spacious", "expansive", "large", "oversized"],
  gated: ["gated", "gated community"],

  // Built form.
  "low rise": ["low rise", "low-rise", "stilt", "independent floor"],
  "builder floor": ["builder floor", "independent floor", "low rise", "stilt"],
  "high rise": ["high rise", "high-rise", "tower", "towers"],
  penthouse: ["penthouse", "penthouses"],
  duplex: ["duplex", "duplexes"],
  villa: ["villa", "villas"],
  studio: ["studio", "studios"],

  // Readiness.
  "ready to move": ["ready to move", "ready-to-move", "ready for possession", "completed"],
  "under construction": ["under construction", "ongoing construction"],
  "new launch": ["new launch", "newly launched", "pre launch"],

  // Neighbourhood.
  metro: ["metro", "rapid metro"],
  school: ["school", "schools"],
  hospital: ["hospital", "hospitals"],
  market: ["market", "markets", "shopping"],
  "pet friendly": ["pet friendly", "pets allowed"],
  "power backup": ["power backup", "dg backup", "generator"],
};

const PHRASES = Object.keys(SYNONYMS).filter((key) => key.includes(" "));

/**
 * Terms that must be earned in prose, never in a name.
 *
 * "Bestech Park View" is a brand, not an outlook, and it came back top for "park facing
 * home" purely on its signage. What a builder called the project says nothing about what
 * the windows look at; only the description does.
 */
const PROSE_ONLY = new Set(["park facing", "golf course facing", "aravalli facing", "facing", "park"]);

/**
 * Things we are asked for and do not record.
 *
 * Builder payment schemes, floor-level preferences and unit orientation are real questions
 * that no field in the catalogue answers. Naming them explicitly turns a silent empty page
 * into an honest "we don't have that yet" — which is information, and tells us what to go
 * and collect.
 */
const NOT_RECORDED: Record<string, string> = {
  emi: "builder payment plans",
  "no emi": "builder payment plans",
  "payment plan": "builder payment plans",
  subvention: "builder payment plans",
  "down payment": "builder payment plans",
  offer: "builder offers",
  discount: "builder offers",
  loan: "financing terms",
  vastu: "Vastu orientation",
  "east facing": "unit orientation",
  "west facing": "unit orientation",
  "north facing": "unit orientation",
  "south facing": "unit orientation",
  "corner unit": "unit position",
  "top floor": "floor preference",
  "ground floor": "floor preference",
};

export interface TextTerm {
  /** The word or phrase as the user typed it. */
  term: string;
  /** Every spelling that counts as a match for it. */
  variants: string[];
}

export interface TextSearchOutcome {
  /** Rows that mention every term we could match, best first. */
  matches: any[];
  /** Terms nothing in the catalogue mentions. */
  unknownTerms: string[];
  /** Things we are asked for but do not record at all, as plain-English topics. */
  notRecorded: string[];
  /** Terms that matched, in the order they were understood. */
  matchedTerms: string[];
  /** Terms that had to be given up to return anything at all. */
  relaxedTerms: string[];
  /** Of the matched terms, the ones that name a place rather than describe a home. */
  placeTerms: string[];
  /** Per-row: which terms it matched and the sentence it matched in. */
  reasons: Map<string, { terms: string[]; snippet: string }>;
}

/** Padded and punctuation-free, so `includes(" emi ")` cannot match "premium". */
function padded(value: string): string {
  return ` ${String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

/** Where a society IS, kept apart from what it says about itself. */
function locationText(row: any): string {
  return padded([row?.name, row?.builder, row?.locality, row?.sector, row?.city, row?.address, row?.society]
    .filter(Boolean).join(" "));
}

/** Only the fields that name a place, used to decide whether a word IS one. */
function placeFields(row: any): string {
  return padded([row?.locality, row?.sector, row?.city].filter(Boolean).join(" "));
}

/**
 * A word is treated as a location only if it names one for several societies.
 *
 * Checking any location-ish text was too eager: a single society with "Aravalli" in its
 * postal address made "aravalli" a place for every search, after which the term was
 * matched against addresses instead of descriptions and found nothing anywhere.
 */
const PLACE_EVIDENCE = 2;

/**
 * Description and FAQ, with the project's own name taken out.
 *
 * Dropping the name field was not enough — a description repeats the project name in
 * nearly every sentence, so "Bestech Park View Sanskruti has 8 towers" still answered
 * "park facing". A project cannot be evidence for its own marketing.
 */
function proseOf(row: any): string {
  const faq = Array.isArray(row?.faq)
    ? row.faq.map((entry: any) => `${entry?.question ?? ""} ${entry?.answer ?? ""}`)
    : [];

  let prose = padded([row?.description, row?.meta_description, ...faq].filter(Boolean).join(" "));

  for (const label of [row?.name, row?.builder]) {
    const name = padded(label).trim();
    if (name.length < 4) continue;
    prose = prose.split(` ${name} `).join(" ");
  }

  return prose;
}

/** What a society SAYS — prose, amenities, FAQ, neighbourhood notes. */
export function corpusOf(row: any): string {
  const amenities = Array.isArray(row?.amenities) ? row.amenities : [];
  const faq = Array.isArray(row?.faq)
    ? row.faq.map((entry: any) => `${entry?.question ?? ""} ${entry?.answer ?? ""}`)
    : [];

  return padded([
    row?.name, row?.builder, row?.locality, row?.sector,
    row?.description, row?.meta_description, row?.meta_title,
    row?.nearby_metro, row?.nearby_schools, row?.nearby_hospitals, row?.nearby_office_hubs,
    row?.configuration, row?.project_status, row?.unit_size_range, row?.possession_date,
    row?.title, row?.property_type, row?.facing, row?.furnished_status,
    ...amenities,
    ...faq,
  ].filter(Boolean).join(" "));
}

function contains(haystack: string, variant: string): boolean {
  return haystack.includes(` ${padded(variant).trim()} `);
}

/** Naive but adequate: "schools" should find "school" and the other way round. */
function withPlurals(word: string): string[] {
  const forms = new Set([word]);
  if (word.endsWith("s") && word.length > 3) forms.add(word.slice(0, -1));
  else forms.add(`${word}s`);

  return [...forms];
}

export interface ReadTerms {
  terms: TextTerm[];
  notRecorded: string[];
}

/** Split what the user typed into the things they are actually asking about. */
export function readTerms(text: string): ReadTerms {
  let rest = padded(text);
  const terms: TextTerm[] = [];
  const notRecorded = new Set<string>();

  // Things we know we cannot answer come out first, so they are reported rather than
  // silently matched against a word that happens to appear somewhere.
  for (const phrase of Object.keys(NOT_RECORDED).sort((a, b) => b.length - a.length)) {
    if (!contains(rest, phrase)) continue;
    notRecorded.add(NOT_RECORDED[phrase]);
    rest = rest.replace(` ${phrase} `, " ");
  }

  // Longest phrase first, so "golf course facing" is taken whole rather than as two
  // separate weaker requirements.
  for (const phrase of [...PHRASES].sort((a, b) => b.length - a.length)) {
    if (!contains(rest, phrase)) continue;
    terms.push({ term: phrase, variants: SYNONYMS[phrase] });
    rest = rest.replace(` ${phrase} `, " ");
  }

  for (const word of rest.trim().split(" ")) {
    if (!word || STOPWORDS.has(word) || word.length < 3) continue;
    if (terms.some((term) => term.term === word)) continue;
    terms.push({ term: word, variants: SYNONYMS[word] ?? withPlurals(word) });
  }

  return { terms, notRecorded: [...notRecorded] };
}

/**
 * Descriptions carry citation markup from the enrichment pipeline.
 *
 * Left in, a matched sentence rendered as `<cite index="3-1">Sanskruti is...` on the card.
 * Stripped here rather than at the source because the tags are real provenance the admin
 * side still uses — they just have no business in a search result.
 */
function plainText(value: unknown): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function firstSentenceWith(row: any, variants: string[]): string {
  for (const sentence of plainText(row?.description).split(/(?<=[.!?])\s+/)) {
    const lower = padded(sentence);
    if (variants.some((variant) => contains(lower, variant))) return sentence.trim();
  }

  return "";
}

/**
 * Match rows against free text, and report what could not be matched at all.
 *
 * Terms combine with AND: "luxury aravalli" means both, because someone who names two
 * things wants both and a row matching only "luxury" is noise. A term that no row anywhere
 * satisfies is dropped from the AND rather than emptying the result — and returned in
 * `unknownTerms` so the page can say which part of the question went unanswered.
 */
export function searchOpenText(rows: any[], text: string): TextSearchOutcome {
  const { terms, notRecorded } = readTerms(text);
  const reasons = new Map<string, { terms: string[]; snippet: string }>();

  if (terms.length === 0) {
    return { matches: rows, unknownTerms: [], notRecorded, matchedTerms: [], relaxedTerms: [], placeTerms: [], reasons };
  }

  const indexed = rows.map((row) => ({
    row,
    text: corpusOf(row),
    place: locationText(row),
    placeOnly: placeFields(row),
    prose: proseOf(row),
  }));
  const known: Array<TextTerm & { isPlace: boolean }> = [];
  const unknownTerms: string[] = [];

  for (const term of terms) {
    // A word that names a place is a place, not a topic. "Noida" appears in the prose of
    // Delhi societies that mention the expressway; matching those was how a Greater Kailash
    // society came back first for "schools in noida".
    const places = indexed.filter(({ placeOnly }) => term.variants.some((variant) => contains(placeOnly, variant))).length;
    const isPlace = places >= PLACE_EVIDENCE;
    const haystackFor = PROSE_ONLY.has(term.term)
      ? (entry: (typeof indexed)[number]) => entry.prose
      : (entry: (typeof indexed)[number]) => entry.text;
    const inProse = indexed.some((entry) => term.variants.some((variant) => contains(haystackFor(entry), variant)));

    if (isPlace || inProse) known.push({ ...term, isPlace });
    else unknownTerms.push(term.term);
  }

  if (known.length === 0) {
    return { matches: [], unknownTerms, notRecorded, matchedTerms: [], relaxedTerms: [], placeTerms: [], reasons };
  }

  const run = (required: typeof known) => {
    const scored: Array<{ row: any; score: number; hits: string[] }> = [];

    for (const { row, text: corpus, place, prose } of indexed) {
      const hits: string[] = [];
      let score = 0;

      for (const term of required) {
        const haystack = term.isPlace ? place : PROSE_ONLY.has(term.term) ? prose : corpus;
        const variant = term.variants.find((candidate) => contains(haystack, candidate));
        if (!variant) break;

        hits.push(term.term);
        // A hit in the name beats one in the locality, which beats one buried in prose.
        score += contains(padded(row?.name), variant) ? 6 : term.isPlace ? 4 : 1;
      }

      if (hits.length < required.length) continue;
      scored.push({ row, score: score + Number(row?.score ?? 0) / 10, hits });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored;
  };

  /**
   * Give up the vaguest requirement rather than the whole question.
   *
   * "low rise builder floor" is three ways of saying one thing, and demanding all three
   * returned nothing at all. When everything together matches nothing, the commonest term
   * is dropped and the search runs again — the rare word is the one carrying the meaning,
   * and it is the one worth keeping. Whatever gets dropped is reported.
   */
  const frequency = new Map<string, number>();
  for (const term of known) {
    frequency.set(
      term.term,
      indexed.filter(({ text: corpus, place, prose }) =>
        term.variants.some((variant) =>
          contains(term.isPlace ? place : PROSE_ONLY.has(term.term) ? prose : corpus, variant))).length,
    );
  }

  let required = [...known];
  let scored = run(required);
  const relaxedTerms: string[] = [];

  while (scored.length === 0 && required.length > 1) {
    // Where a home is survives longer than what it is like. "park facing home in golf
    // course" has no society satisfying both; dropping the location leaves park-facing
    // homes on the wrong side of the city, while dropping the adjective leaves the right
    // neighbourhood — which is the compromise a person would actually make.
    const vaguest = [...required].sort((a, b) =>
      Number(a.isPlace) - Number(b.isPlace) || (frequency.get(b.term) ?? 0) - (frequency.get(a.term) ?? 0))[0];
    relaxedTerms.push(vaguest.term);
    required = required.filter((term) => term !== vaguest);
    scored = run(required);
  }

  for (const entry of scored) {
    reasons.set(String(entry.row?.id ?? entry.row?.slug), {
      terms: entry.hits,
      snippet: firstSentenceWith(entry.row, required.find((term) => !term.isPlace)?.variants ?? required[0].variants),
    });
  }

  return {
    matches: scored.map((entry) => entry.row),
    unknownTerms,
    notRecorded,
    matchedTerms: required.map((term) => term.term),
    relaxedTerms,
    placeTerms: required.filter((term) => term.isPlace).map((term) => term.term),
    reasons,
  };
}
