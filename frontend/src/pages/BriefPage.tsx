import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Check, Loader2, Pencil, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPublicSocieties } from "@/lib/publicData";
import { rowIsInCity, useSelectedNcrCity } from "@/lib/ncrCities";
import { setPublicSeo } from "@/lib/seo";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import {
  buildShortlist, describeBrief, EMPTY_BRIEF, formatMoney, prioritiesFor, timelineLabel,
  unrecordedPriorities, type Brief, type BriefMode, type CommuteContext,
} from "@/lib/briefMatch";
import { fetchLandmarkShortcuts, searchNearLandmark } from "@/lib/landmarkSearchApi";
import { clearDraft, isSignedIn, loadDraft, saveBriefToAccount, saveDraft } from "@/lib/briefStorage";
import { useBottomChrome } from "@/lib/bottomChrome";

/** Kept in step with the question list below. */
const BRIEF_STEP_COUNT = 9;

/*
  Design language, as measured on the live site rather than assumed:
  canvas #FFFFFF / #F5F5F7 · ink #1D1D1F · secondary #6E6E73 · line #E4E4E9
  accent #0F7B63 · soft accent #ECF6F2 · pill buttons · sans throughout,
  headings at weight 500 with tight tracking. Matches the note in HomePremium.
*/

/**
 * A brief, then a shortlist — instead of a search box and a grid.
 *
 * Searching assumes you know what to type. Most people looking for a home know their
 * budget, their commute and what they cannot live without, and nothing else. Asking for
 * that directly is both easier to answer and better to answer with: a shortlist scored
 * against a stated brief is worth reading on a day when barely anything is listed, which
 * a results grid is not.
 *
 * The questions sit in one stack rather than taking over the screen one at a time. Every
 * answer stays on the page as a line you can reopen, so the brief reads as a document
 * being assembled rather than a quiz being sat — which matches how people actually decide:
 * the budget moves once you see what the area costs.
 *
 * Nothing is hidden behind a sign-in. The shortlist is the promise; withholding it to
 * collect a phone number would undo the reason anyone trusts a verified catalogue.
 */

const RENT_PURPOSES = ["Family home", "Couple", "Working professional", "Company lease"];
const BUY_PURPOSES = ["First home", "Upgrading", "Investment", "For parents"];

const RENT_TIMELINES = [
  ["now", "Right away"], ["1", "Within a month"], ["3", "In 2–3 months"], ["flexible", "Flexible"],
];
const BUY_TIMELINES = [
  ["now", "Ready to move"], ["1", "Within a year"], ["3", "Within 3 years"], ["5", "Within 5 years"], ["flexible", "Flexible"],
];

/**
 * Used only if the landmarks endpoint cannot be reached.
 *
 * The real list is per-city and comes from the server; this exists so the question still
 * offers something on a failed request, and IGI is the one place every NCR city commutes
 * to regardless of which one you are browsing.
 */
const FALLBACK_COMMUTES = ["IGI Airport"];

const BHK_CHOICES: Array<[number, string]> = [
  [0, "Studio"], [1, "1 BHK"], [2, "2 BHK"], [3, "3 BHK"], [4, "4 BHK"], [5, "5 BHK+"],
];

/** Rent is read per month, purchase as a total. One slider, two scales. */
const RENT_STEPS = [15000, 20000, 25000, 30000, 40000, 50000, 65000, 80000, 100000, 150000, 200000, 300000];
const BUY_STEPS = [5000000, 7500000, 10000000, 15000000, 20000000, 30000000, 40000000, 60000000, 80000000, 120000000, 200000000];

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-[13px] font-medium transition sm:px-5 sm:py-2.5 sm:text-[14px] ${
        active
          ? "border-[#0F7B63] bg-[#0F7B63] text-white"
          : "border-[#E4E4E9] bg-white text-[#1D1D1F] hover:border-[#0F7B63]"
      }`}
    >
      {children}
    </button>
  );
}

export function BriefPage() {
  const [city] = useSelectedNcrCity();
  const [societies, setSocieties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState<Brief>(EMPTY_BRIEF);
  const [thinking, setThinking] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  // The sticky Continue bar is 62px of tab bar plus its own ~73px. Declared so the consent
  // banner floats above it instead of covering the only button that matters here.
  useBottomChrome(8.5);
  const openStepRef = useRef<HTMLElement | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [alerts, setAlerts] = useState(true);

  // Restored before anything else, so a refresh or a trip through the login screen does
  // not cost someone nine answers.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setBrief(draft.brief);
      // A brief reopened from the account is stored past the last question so it lands on
      // its shortlist; clamped so the step can never point beyond the list.
      setStep(Math.min(draft.step, BRIEF_STEP_COUNT));
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) saveDraft(brief, step);
  }, [brief, step, restored]);

  useEffect(() => {
    setPublicSeo(
      "Build your brief | SocietyFlats",
      "Tell us your budget, area and what matters most. We score every verified Delhi NCR society against it and show the few that fit.",
    );

    fetchPublicSocieties()
      .then(setSocieties)
      .catch(() => setSocieties([]))
      .finally(() => setLoading(false));
  }, []);

  const inCity = useMemo(() => societies.filter((row) => rowIsInCity(row, city)), [societies, city]);

  // The busiest areas in this city, so the shortcuts always lead somewhere real.
  const areas = useMemo(() => {
    const counts = new Map<string, number>();
    // A locality that is just the city name is not an area anyone would pick — those rows
    // are ones whose real neighbourhood was never resolved, and offering "Gurugram" as a
    // shortcut inside Gurgaon narrows nothing.
    const cityWords = new Set([city.name.toLowerCase(), city.slug, "gurugram", "new delhi"]);

    for (const row of inCity) {
      const area = String(row?.locality || row?.sector || "").trim();
      if (area && !cityWords.has(area.toLowerCase())) counts.set(area, (counts.get(area) ?? 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([area]) => area.replace(/\b[a-z]/g, (c) => c.toUpperCase()));
  }, [inCity, city]);

  const set = (patch: Partial<Brief>) => setBrief((current) => ({ ...current, ...patch }));

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const budgetSteps = brief.mode === "rent" ? RENT_STEPS : BUY_STEPS;
  const purposes = brief.mode === "rent" ? RENT_PURPOSES : BUY_PURPOSES;
  const timelines = brief.mode === "rent" ? RENT_TIMELINES : BUY_TIMELINES;

  /**
   * The commute, turned into real distances.
   *
   * Reuses the landmark resolver the search box already uses, so a typed office name
   * becomes a coordinate and then a measured kilometre figure per society. This is the
   * one answer on the page that cannot be guessed at, which is the point of asking.
   */
  const [commute, setCommute] = useState<CommuteContext | null>(null);
  const [commuteOptions, setCommuteOptions] = useState<string[]>([]);

  // Refetched when the city changes, so switching from Gurgaon to Delhi swaps the
  // shortcuts instead of leaving Cyber Hub on offer in West Delhi.
  useEffect(() => {
    let cancelled = false;

    void fetchLandmarkShortcuts(city.name).then((rows) => {
      if (cancelled) return;
      const names = rows.map((row) => row.name).filter(Boolean);
      setCommuteOptions(names.length > 0 ? names : FALLBACK_COMMUTES);
    });

    return () => { cancelled = true; };
  }, [city]);

  useEffect(() => {
    const place = brief.commute.trim();
    if (place.length < 3) {
      setCommute(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void searchNearLandmark(`near ${place}`).then((result) => {
        if (cancelled) return;
        if (!result?.landmark) {
          setCommute(null);
          return;
        }

        setCommute({
          name: result.landmark.name,
          slug: result.landmark.slug,
          distances: new Map(result.societies.map((hit) => [String(hit.id), hit.distance_km])),
        });
      });
    }, 500);

    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [brief.commute]);

  const shortlist = useMemo(
    () => (inCity.length > 0 ? buildShortlist(inCity, brief, 6, commute ?? undefined) : null),
    [inCity, brief, commute],
  );

  const briefChips = useMemo(() => describeBrief(brief), [brief]);
  const unrecorded = useMemo(() => unrecordedPriorities(brief), [brief]);

  const steps = [
    {
      label: "Renting or buying",
      question: "Renting, or buying?",
      hint: "The two are scored on completely different things.",
      summary: brief.mode === "rent" ? "Renting" : "Buying",
      done: true,
      body: (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {([["rent", "Renting", "Scored on living there — upkeep, security, commute."],
            ["buy", "Buying", "Scored on value too — RERA, developer, possession."]] as Array<[BriefMode, string, string]>)
            .map(([mode, label, blurb]) => (
              <button
                key={mode}
                type="button"
                // The slider starts somewhere real. Left at zero the thumb sits on the
                // lowest step while the figure reads "—", which says two different things.
                onClick={() => set({
                  mode, purpose: "", timeline: "", priorities: [],
                  budget: mode === "rent" ? RENT_STEPS[4] : BUY_STEPS[3],
                })}
                className={`rounded-xl border p-4 text-left transition ${
                  brief.mode === mode ? "border-[#0F7B63] bg-[#ECF6F2]" : "border-[#E4E4E9] bg-white hover:border-[#C9C9D1]"
                }`}
              >
                <p className="text-[15px] font-semibold text-[#1D1D1F]">{label}</p>
                <p className="mt-0.5 text-[12.5px] leading-5 text-[#6E6E73]">{blurb}</p>
              </button>
            ))}
        </div>
      ),
    },
    {
      label: "Who it's for",
      question: "Who's moving in?",
      hint: "It decides which trade-offs we weigh against each other.",
      summary: brief.purpose,
      done: Boolean(brief.purpose),
      body: (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {purposes.map((purpose) => (
            <Chip key={purpose} active={brief.purpose === purpose} onClick={() => set({ purpose })}>{purpose}</Chip>
          ))}
        </div>
      ),
    },
    {
      label: "Budget",
      question: brief.mode === "rent" ? "What can you pay a month?" : "What can you spend?",
      hint: `We'll show what that actually buys in ${city.name} — and the near misses worth stretching for.`,
      summary: brief.budget > 0 ? `${formatMoney(brief.budget)}${brief.mode === "rent" ? "/mo" : ""}` : "",
      done: brief.budget > 0,
      body: (
        <div className="rounded-xl border border-[#E4E4E9] bg-[#F5F5F7] p-4">
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-semibold tabular-nums text-[#1D1D1F]">
              {formatMoney(brief.budget)}
              {brief.mode === "rent" ? <span className="text-base font-bold text-[#86868B]">/mo</span> : null}
            </p>
            <p className="text-[11.5px] font-bold text-[#86868B]">
              {formatMoney(budgetSteps[0])} – {formatMoney(budgetSteps[budgetSteps.length - 1])}+
            </p>
          </div>
          <input
            type="range"
            min={0}
            max={budgetSteps.length - 1}
            value={Math.max(0, budgetSteps.indexOf(brief.budget))}
            onChange={(event) => set({ budget: budgetSteps[Number(event.target.value)] })}
            className="mt-3 w-full accent-[#0F7B63]"
          />
        </div>
      ),
    },
    {
      label: "Size",
      question: "How many bedrooms?",
      hint: "Tick every size you would seriously consider.",
      summary: brief.bhk.map((n) => (n === 0 ? "Studio" : `${n} BHK`)).join(", "),
      done: brief.bhk.length > 0,
      body: (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {BHK_CHOICES.map(([value, label]) => (
            <Chip key={value} active={brief.bhk.includes(value)} onClick={() => set({ bhk: toggle(brief.bhk, value) })}>
              {label}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      label: "Area",
      question: `Which part of ${city.name}?`,
      hint: "A sector or a locality. Skip it and we'll read the whole city.",
      summary: brief.where.trim() || `Anywhere in ${city.name}`,
      done: true,
      body: (
        <div>
          <Input
            value={brief.where}
            placeholder="Golf Course Road, Sector 65, near Cyber Hub…"
            onChange={(event) => set({ where: event.target.value })}
            className="h-12"
          />
          {areas.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {areas.map((area) => (
                <Chip key={area} active={brief.where === area} onClick={() => set({ where: brief.where === area ? "" : area })}>
                  {area}
                </Chip>
              ))}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      label: "Commute",
      question: "Where do you go most days?",
      hint: "An office, a campus, a hospital, a metro station. We measure the distance rather than guess it.",
      summary: brief.commute.trim(),
      done: true,
      body: (
        <div>
          <Input
            value={brief.commute}
            placeholder={commuteOptions.length > 0 ? `${commuteOptions.slice(0, 3).join(", ")}…` : "Your office, campus or metro station…"}
            onChange={(event) => set({ commute: event.target.value })}
            className="h-12 rounded-xl"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {commuteOptions.map((place) => (
              <Chip
                key={place}
                active={brief.commute === place}
                onClick={() => set({ commute: brief.commute === place ? "" : place })}
              >
                {place}
              </Chip>
            ))}
          </div>
          {commute ? (
            <p className="mt-3 text-[13px] font-semibold text-[#0F7B63]">
              Found {commute.name} — every society below is ranked by how far it actually is.
              {/* Linked only when a landmark page will actually exist: the page needs three
                  verified societies nearby, and the distance map already tells us how many
                  there are, so no extra request and no link into a dead end. */}
              {commute.distances.size >= 3 ? (
                <>
                  {" "}
                  <Link to={`/near/${commute.slug}`} className="underline hover:no-underline">
                    See every society near it
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      label: "Timing",
      question: brief.mode === "rent" ? "When do you need to move?" : "When do you need possession?",
      hint: "",
      summary: timelineLabel(brief),
      done: Boolean(brief.timeline),
      body: (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {timelines.map(([value, label]) => (
            <Chip key={value} active={brief.timeline === value} onClick={() => set({ timeline: value })}>{label}</Chip>
          ))}
        </div>
      ),
    },
    {
      label: "Priorities",
      question: "What would you not compromise on?",
      hint: "Pick the few that are real. Everything you tick is weighted three times heavier.",
      summary: brief.priorities.length > 0 ? `${brief.priorities.length} chosen` : "",
      done: brief.priorities.length > 0,
      body: (
        <div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {prioritiesFor(brief.mode).map((priority) => (
              <Chip
                key={priority.id}
                active={brief.priorities.includes(priority.id)}
                onClick={() => set({ priorities: toggle(brief.priorities, priority.id) })}
              >
                {priority.label}
              </Chip>
            ))}
          </div>

          {/* Said plainly at the moment of choosing, not discovered later in the results.
              These are the questions buyers ask first and a catalogue answers worst —
              worth capturing honestly rather than leaving off the list. */}
          {unrecorded.length > 0 ? (
            <p className="mt-3 rounded-xl border border-[#EFE3C6] bg-[#FCF7EC] p-3 text-[12.5px] font-semibold leading-5 text-[#7A5E14]">
              {unrecorded.map((p) => p.label).join(" and ")} {unrecorded.length === 1 ? "isn’t" : "aren’t"} published
              by any listing, so we can’t filter on {unrecorded.length === 1 ? "it" : "them"}. We’ll carry
              {unrecorded.length === 1 ? " it" : " them"} into your brief and check with the society directly.
            </p>
          ) : null}
        </div>
      ),
    },
    {
      label: "Anything else",
      question: "Anything we haven't asked?",
      hint: "Optional — but this is the part our team reads first.",
      summary: brief.notes.trim() ? "Added" : "",
      done: true,
      body: (
        <div>
          <textarea
            value={brief.notes}
            maxLength={600}
            onChange={(event) => set({ notes: event.target.value })}
            placeholder="e.g. lift and power backup that actually work, not overlooking the club or the main gate, and a market my mother can walk to in the evening."
            className="h-32 w-full rounded-xl border border-[#E4E4E9] bg-white p-3.5 text-[14.5px] leading-6 text-[#1D1D1F] outline-none focus:border-[#0F7B63]"
          />
          <p className="mt-1 text-right text-[11.5px] font-semibold text-[#86868B]">{brief.notes.length} / 600</p>
        </div>
      ),
    },
  ];

  /**
   * Put the live question at the top of the screen after every answer.
   *
   * Answered rows stay on the page so they can be reopened, which is right — but on a
   * phone six of them fill the viewport and push the question you are meant to be
   * answering off the bottom. Scrolling to it keeps the accordion and the small screen
   * from fighting each other.
   */
  useEffect(() => {
    if (!restored || step === 0 || step >= steps.length) return;

    const node = openStepRef.current;
    if (!node || window.matchMedia("(min-width: 1024px)").matches) return;

    const top = node.getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, restored]);

  const isLast = step === steps.length - 1;
  const showResults = step >= steps.length;
  // Only steps the person has actually been through. Counting every step with a usable
  // default read "5 answered" on a brief nobody had touched yet.
  const answered = steps.filter((entry, index) => index < step && entry.done).length;

  const advance = () => {
    if (!isLast) {
      setStep(step + 1);
      return;
    }

    // A beat before the answer. The work is real — every society in the city is scored —
    // and naming it is the difference between a list and a recommendation.
    setThinking(true);
    setStep(steps.length);
    window.setTimeout(() => setThinking(false), 900);
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <main className="mx-auto max-w-[1120px] px-4 py-8 md:px-8 md:py-12">
          {thinking ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0F7B63]" />
              <p className="!font-sans mt-6 text-xl font-medium tracking-[-0.01em] text-[#1D1D1F]">
                Scoring {inCity.length} societies against your brief
              </p>
              <p className="mt-1 text-sm font-semibold text-[#6E6E73]">Connectivity · upkeep · security · value</p>
            </div>
          ) : (
            <>
              {/* The brief stays a compact, editable strip rather than a column of its own —
                  it is the thing being answered, not the headline. */}
              <div className="rounded-[20px] border border-[#E4E4E9] bg-white p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868B]">
                    Your brief · {brief.purpose || (brief.mode === "rent" ? "Renting" : "Buying")} in {city.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#0F7B63] hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {briefChips.map((chip) => (
                    <span key={chip} className="rounded-lg bg-[#F5F5F7] px-2.5 py-1 text-[12px] font-bold text-[#1D1D1F]">
                      {chip}
                    </span>
                  ))}
                </div>
                {brief.notes.trim() ? (
                  <p className="mt-3 border-l-2 border-[#E4E4E9] pl-3 text-[13px] leading-5 text-[#6E6E73]">
                    {brief.notes.trim()}
                  </p>
                ) : null}
              </div>

              {/* The work, stated as three numbers. A shortlist of four means nothing
                  without the number it was drawn from. */}
              {shortlist ? (
                <div className="mt-3 grid grid-cols-3 gap-2.5 md:gap-3">
                  {[
                    ["Scanned", shortlist.scanned],
                    ["Meet your brief", shortlist.eligible],
                    ["Shortlisted", shortlist.fits.length],
                  ].map(([label, value], index) => (
                    <div
                      key={String(label)}
                      className={`rounded-[20px] border p-3.5 md:p-4 ${
                        index === 2 ? "border-[#0F7B63] bg-[#0F7B63]" : "border-[#E4E4E9] bg-white"
                      }`}
                    >
                      <p className={`text-2xl font-semibold tabular-nums ${index === 2 ? "text-white" : "text-[#1D1D1F]"}`}>
                        {value as number}
                      </p>
                      <p className={`mt-0.5 text-[10.5px] font-bold uppercase tracking-wide ${index === 2 ? "text-white/70" : "text-[#86868B]"}`}>
                        {label as string}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {shortlist?.loosened.length ? (
                <p className="mt-3 rounded-xl border border-[#EFE3C6] bg-[#FCF7EC] p-3.5 text-[13px] font-semibold text-[#7A5E14]">
                  Nothing met every requirement, so we relaxed {shortlist.loosened.map((item) => `“${item}”`).join(" and ")}.
                  Everything below meets the rest.
                </p>
              ) : null}

              <div className="mt-4 space-y-2.5">
                {shortlist?.fits.map((fit, index) => (
                  <article
                    key={fit.society.id}
                    className="rounded-[20px] border border-[#E4E4E9] bg-white p-4 transition hover:border-[#0F7B63] md:p-5"
                  >
                    <div className="flex gap-3.5">
                      {/* Rank, not a trophy score. The order is the recommendation. */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ECF6F2] text-[15px] font-semibold tabular-nums text-[#0F7B63]">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <h2 className="!font-sans text-[17px] font-medium leading-tight tracking-[-0.01em] text-[#1D1D1F]">{fit.society.name}</h2>
                          <p className="text-[14.5px] font-semibold tabular-nums text-[#1D1D1F]">
                            {brief.mode === "rent"
                              ? fit.society.rentRange || "On request"
                              : fit.society.buyRange || "On request"}
                          </p>
                        </div>
                        <p className="mt-0.5 text-[12.5px] font-semibold text-[#6E6E73]">
                          {/* Sector and locality are the same string on rows whose real
                              neighbourhood was never resolved, and "Sector 104 · Sector 104"
                              reads as a bug rather than a location. */}
                          {[...new Set([fit.society.sector, fit.society.locality].filter(Boolean))].join(" · ")}
                        </p>

                        {/* A bar rather than a headline numeral: it reads as a measurement,
                            which is what it is, and it compares at a glance down the list. */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#ECF6F2]">
                            <div className="h-full rounded-full bg-[#0F7B63]" style={{ width: `${fit.percent}%` }} />
                          </div>
                          <p className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[#0F7B63]">{fit.percent}% fit</p>
                        </div>

                        {fit.reasons.length > 0 ? (
                          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                            {fit.reasons.map((reason) => (
                              <li key={reason.label} className="flex items-start gap-1.5 text-[12.5px] leading-5 text-[#43434A]">
                                <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${reason.good ? "text-[#0F7B63]" : "text-[#B0B0B8]"}`} />
                                <span className="min-w-0">{reason.label}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {fit.unknown.length > 0 ? (
                          <p className="mt-2 text-[12px] font-semibold text-[#8A6D1F]">
                            Not verified here yet: {fit.unknown.join(", ").toLowerCase()}.
                          </p>
                        ) : null}

                        <div className="mt-3.5 flex flex-wrap gap-2">
                          <Link
                            to={fit.society.slug ? `/society/${fit.society.slug}` : "/societies"}
                            className="rounded-full bg-[#1D1D1F] px-4 py-2 text-[13px] font-bold text-white"
                          >
                            Full report
                          </Link>
                          <button
                            type="button"
                            onClick={() => setLeadOpen(true)}
                            className="rounded-full border border-[#E4E4E9] px-4 py-2 text-[13px] font-bold text-[#0F7B63] hover:border-[#0F7B63]"
                          >
                            Ask about this
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}

                {shortlist && shortlist.fits.length === 0 ? (
                  <p className="rounded-[20px] border border-dashed border-[#E4E4E9] bg-white p-8 text-center text-sm font-semibold text-[#6E6E73]">
                    Nothing in {city.name} fits this brief yet. Send it to us and we’ll go and find it.
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_320px]">
                {/* The half no catalogue answers, carried to someone who can. */}
                <div className="rounded-[20px] bg-[#1D1D1F] p-5 text-white md:p-6">
                  <h3 className="!font-sans text-[20px] font-medium leading-snug tracking-[-0.01em]">
                    {unrecorded.length > 0
                      ? `We can’t filter on ${unrecorded.map((p) => p.label.toLowerCase()).join(" or ")}. We can ask.`
                      : "Want us to check availability?"}
                  </h3>
                  <p className="mt-2 text-[13.5px] leading-6 text-[#B0B0B8]">
                    Send this brief and we’ll come back with what each society actually offers — availability,
                    real numbers, and the things owners never put in a listing.
                  </p>
                  <Button
                    className="mt-4 rounded-full bg-white px-6 py-5 text-[14px] font-semibold text-[#1D1D1F] hover:bg-[#ECF6F2]"
                    onClick={() => setLeadOpen(true)}
                  >
                    Send my brief
                  </Button>
                </div>

                <div className="space-y-3">
                  {/*
                    Keeping the brief is the useful half when there is little to show today:
                    the alert is the answer to "nothing matches yet", and it is a better
                    reason to sign in than withholding results would have been.
                  */}
                  <div className="rounded-[20px] border border-[#E4E4E9] bg-white p-5">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1D1D1F]">
                      <Bookmark className="h-4 w-4 text-[#0F7B63]" /> Keep this brief
                    </p>

                    {saveState === "saved" ? (
                      <p className="mt-2 text-[12.5px] leading-5 text-[#6E6E73]">
                        Saved to your account{alerts ? ". We’ll message you when something matching comes up." : "."}
                      </p>
                    ) : isSignedIn() ? (
                      <>
                        <label className="mt-2.5 flex cursor-pointer items-start gap-2 text-[12.5px] leading-5 text-[#6E6E73]">
                          <input
                            type="checkbox"
                            checked={alerts}
                            onChange={(event) => setAlerts(event.target.checked)}
                            className="mt-0.5 accent-[#0F7B63]"
                          />
                          Tell me when a matching home is listed
                        </label>
                        <Button
                          disabled={saveState === "saving"}
                          onClick={() => {
                            setSaveState("saving");
                            setSaveError("");
                            void saveBriefToAccount(brief, city.name, alerts)
                              .then(() => setSaveState("saved"))
                              .catch((error) => {
                                setSaveError(error instanceof Error ? error.message : "Could not save.");
                                setSaveState("error");
                              });
                          }}
                          className="mt-3 w-full rounded-full bg-[#0F7B63] py-5 text-[13.5px] font-semibold hover:bg-[#0C6552]"
                        >
                          {saveState === "saving" ? "Saving…" : "Save to my account"}
                        </Button>
                        {saveError ? <p className="mt-2 text-[12px] font-semibold text-[#8A6D1F]">{saveError}</p> : null}
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-[12.5px] leading-5 text-[#6E6E73]">
                          Sign in to keep it and get told when matching homes are listed. Your answers are
                          held here meanwhile — you won’t have to do this again.
                        </p>
                        <Link
                          to="/login"
                          className="mt-3 block rounded-full bg-[#0F7B63] py-3 text-center text-[13.5px] font-semibold text-white"
                        >
                          Sign in to save
                        </Link>
                      </>
                    )}
                  </div>

                <div className="rounded-[20px] border border-[#E4E4E9] bg-white p-5">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1D1D1F]">
                    <ShieldCheck className="h-4 w-4 text-[#0F7B63]" /> How this was scored
                  </p>
                  <ul className="mt-2.5 space-y-1.5 text-[12.5px] leading-5 text-[#6E6E73]">
                    <li>Every published society in {city.name}, not a paid selection</li>
                    <li>Weighted by the priorities you picked, from verified data</li>
                    <li>Your details are never passed to a builder</li>
                    <li>Where we hold no data, we say so</li>
                  </ul>
                </div>
                </div>
              </div>
            </>
          )}
        </main>

        <PublicLeadModal
          open={leadOpen}
          onClose={() => setLeadOpen(false)}
          title="Send your brief"
          subtitle="We'll come back with what actually fits — no builder ever gets your number."
          source="brief_builder"
          ctaLabel="Brief builder"
          leadIntent={brief.mode}
          budget={brief.budget > 0 ? formatMoney(brief.budget) : ""}
          societyName={shortlist?.fits[0]?.society?.name || ""}
          submitLabel="Send my brief"
          successMessage="Got it. We'll come back with what actually fits."
          trackingContext={{ search_query: [city.name, brief.where].filter(Boolean).join(" · "), entity_type: "brief" }}
          // The brief as a person would read it, so whoever picks this up already knows the
          // whole requirement — including the parts we could not filter on.
          defaultRequirement={[
            `${brief.purpose || "Buyer"} · ${brief.mode} · ${city.name}`,
            describeBrief(brief).join(" · "),
            timelineLabel(brief),
            brief.notes.trim() ? `In their words: ${brief.notes.trim()}` : "",
            unrecorded.length > 0 ? `Needs checking with the society: ${unrecorded.map((p) => p.label).join(", ")}` : "",
            shortlist?.fits.length ? `Shortlisted: ${shortlist.fits.map((f) => `${f.society.name} (${f.percent}%)`).join(", ")}` : "",
          ].filter(Boolean).join("\n")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto grid max-w-[1180px] gap-10 px-5 pb-40 pt-10 md:px-8 md:pt-16 lg:grid-cols-[minmax(0,370px)_minmax(0,1fr)] lg:gap-16 lg:pb-16">
        {/*
          The left column is why this is worth a minute of anyone's time. A centred form in
          a wide window reads as paperwork; putting the promise, the scale of the work and
          the brief-so-far beside the questions makes the page feel considered instead.
        */}
        <aside className="order-2 lg:order-1 lg:sticky lg:top-24 lg:self-start">
          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868B] lg:block">
            {brief.mode === "rent" ? "Rental" : "Purchase"} brief · {city.name}
          </p>
          <h1 className="!font-sans mt-3 hidden text-[32px] font-medium leading-[1.12] tracking-[-0.025em] text-[#1D1D1F] lg:block lg:text-[40px]">
            Tell us what matters.
            <br />
            We&rsquo;ll do the reading.
          </h1>
          <p className="hidden max-w-[42ch] text-[15.5px] leading-7 text-[#6E6E73] lg:mt-4 lg:block">
            {inCity.length > 0
              ? `All ${inCity.length} verified societies in ${city.name} get scored against your answers — connectivity, upkeep, security, value.`
              : `Every verified society in ${city.name} gets scored against your answers.`}
          </p>

          {/* The brief taking shape, so the effort already spent stays visible. */}
          {step > 0 && briefChips.length > 0 ? (
            <div className="mt-7 border-t border-[#E4E4E9] pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#86868B]">So far</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {briefChips.map((chip) => (
                  <span key={chip} className="rounded-full bg-[#F5F5F7] px-3 py-1.5 text-[12.5px] font-semibold text-[#1D1D1F]">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <ul className="mt-7 space-y-2.5 border-t border-[#E4E4E9] pt-5 text-[13px] leading-5 text-[#6E6E73]">
            {["No developer pays to appear here",
              "Your number never reaches a builder",
              "The whole shortlist is shown — nothing blurred"].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#0F7B63]" />
                {line}
              </li>
            ))}
          </ul>
        </aside>

        <div className="order-1 min-w-0 lg:order-2">
        {/* On a phone the questions have to start at the top. The full editorial column
            below is a screen and a half of preamble that pushed the first question — and
            its Continue button — under the fold and behind the tab bar. */}
        <div className="lg:hidden">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#86868B]">
            {brief.mode === "rent" ? "Rental" : "Purchase"} brief · {city.name}
          </p>
          <h1 className="!font-sans mt-2 text-[26px] font-medium leading-[1.15] tracking-[-0.02em] text-[#1D1D1F]">
            Tell us what matters.
          </h1>
          <p className="mt-2 text-[14.5px] leading-6 text-[#6E6E73]">
            {inCity.length > 0
              ? `We score all ${inCity.length} verified societies in ${city.name} against your answers.`
              : `We score every verified society in ${city.name} against your answers.`}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 lg:mt-0">
          <p className="text-[12.5px] font-semibold text-[#1D1D1F]">
            {/* A restored draft says so, rather than silently presenting pre-filled
                answers as though the person had just given them. */}
            {step > 0 ? "Picking up where you left off" : `Step ${step + 1} of ${steps.length}`}
          </p>
          <p className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[#86868B]">
            {answered} answered
          </p>
        </div>

        {/* One stack, not one screen per question. Answers stay visible as lines you can
            reopen, so changing the budget after seeing what the area costs is a tap rather
            than a journey back through a wizard. */}
        <div className="mt-4 divide-y divide-[#E4E4E9] overflow-hidden rounded-[22px] border border-[#E4E4E9] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_40px_-24px_rgba(16,24,40,0.18)]">
          {steps.map((entry, index) => {
            const isOpen = index === step;
            const isPast = index < step;

            if (isOpen) {
              return (
                <section key={entry.label} ref={openStepRef} className="scroll-mt-24 p-5 md:p-8">
                  <div className="flex items-baseline gap-3">
                    <span className="text-[11px] font-semibold tabular-nums text-[#0F7B63]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h2 className="!font-sans text-[20px] font-medium leading-snug tracking-[-0.015em] text-[#1D1D1F] md:text-[23px]">{entry.question}</h2>
                      {entry.hint ? <p className="mt-1.5 max-w-[52ch] text-[14px] leading-6 text-[#6E6E73]">{entry.hint}</p> : null}
                    </div>
                  </div>

                  <div className="mt-6 sm:pl-8">{entry.body}</div>

                  <div className="mt-7 flex items-center gap-4 sm:pl-8">
                    <Button
                      disabled={loading && isLast}
                      onClick={advance}
                      className="rounded-full bg-[#0F7B63] px-8 py-6 text-[14.5px] font-semibold hover:bg-[#0C6552]"
                    >
                      {isLast ? "See my shortlist" : "Continue"}
                    </Button>
                    {!entry.done ? (
                      <button
                        type="button"
                        onClick={() => setStep(step + 1)}
                        className="text-[13px] font-bold text-[#86868B] hover:text-[#43434A]"
                      >
                        Skip
                      </button>
                    ) : null}
                  </div>
                </section>
              );
            }

            // Questions still ahead are counted, not listed. Seven greyed rows with
            // padlocks down the page read as a paywall and make a one-minute task look
            // like a form — the opposite of what the locks were meant to convey.
            if (!isPast) return null;

            return (
              <button
                key={entry.label}
                type="button"
                onClick={() => setStep(index)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#F5F5F7] md:px-8"
              >
                <span className="text-[11px] font-semibold tabular-nums text-[#0F7B63]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[14px] font-medium text-[#1D1D1F]">{entry.label}</span>
                <span className="max-w-[50%] truncate text-[13.5px] text-[#6E6E73]">
                  {entry.summary || "Skipped"}
                </span>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-[#B0B0B8]" />
              </button>
            );
          })}
        </div>

        {step < steps.length - 1 ? (
          <p className="mt-4 pl-1 text-[13px] text-[#86868B]">
            {steps.length - step - 1} more {steps.length - step - 1 === 1 ? "question" : "questions"} · about a minute
          </p>
        ) : null}
        </div>

        {/*
          On a phone the answer to a question can be taller than the screen — the priorities
          step pushed Continue nearly 500px below the fold, and four of the nine steps put it
          out of reach entirely. Pinned above the app's tab bar, the next step is always one
          tap away however long the question is.
        */}
        <div className="fixed inset-x-0 bottom-[62px] z-40 border-t border-[#E4E4E9] bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            <Button
              disabled={loading && isLast}
              onClick={advance}
              className="h-12 flex-1 rounded-full bg-[#0F7B63] text-[15px] font-semibold hover:bg-[#0C6552]"
            >
              {isLast ? "See my shortlist" : "Continue"}
            </Button>
            {!steps[step]?.done ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="shrink-0 px-3 text-[13.5px] font-semibold text-[#86868B]"
              >
                Skip
              </button>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

export default BriefPage;
