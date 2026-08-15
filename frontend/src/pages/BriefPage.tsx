import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPublicSocieties } from "@/lib/publicData";
import { rowIsInCity, useSelectedNcrCity } from "@/lib/ncrCities";
import { setPublicSeo } from "@/lib/seo";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import {
  buildShortlist, describeBrief, EMPTY_BRIEF, formatMoney, prioritiesFor, timelineLabel,
  unrecordedPriorities, type Brief, type BriefMode,
} from "@/lib/briefMatch";

/**
 * A brief, then a shortlist — instead of a search box and a grid.
 *
 * Searching assumes you know what to type. Most people looking for a home know their
 * budget, their commute and what they cannot live without, and nothing else. Asking for
 * that directly is both easier to answer and better to answer with: a shortlist scored
 * against a stated brief is worth reading on a day when barely anything is listed, which
 * a results grid is not.
 *
 * Nothing here is hidden behind a sign-in. The shortlist is the promise; withholding it
 * to collect a phone number would undo the reason anyone trusts a verified catalogue.
 */

const RENT_PURPOSES = ["Family home", "Couple", "Working professional", "Company lease"];
const BUY_PURPOSES = ["First home", "Upgrading", "Investment", "For parents"];

const RENT_TIMELINES = [
  ["now", "Right away"], ["1", "Within a month"], ["3", "In 2–3 months"], ["flexible", "Flexible"],
];
const BUY_TIMELINES = [
  ["now", "Ready to move"], ["1", "Within a year"], ["3", "Within 3 years"], ["5", "Within 5 years"], ["flexible", "Flexible"],
];

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
      className={`rounded-full border px-5 py-2.5 text-sm font-bold transition ${
        active
          ? "border-[#0F7B63] bg-[#0F7B63] text-white"
          : "border-navy-200 bg-white text-navy-700 hover:border-[#0F7B63]"
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

  const shortlist = useMemo(
    () => (inCity.length > 0 ? buildShortlist(inCity, brief) : null),
    [inCity, brief],
  );

  const briefChips = useMemo(() => describeBrief(brief), [brief]);
  const unrecorded = useMemo(() => unrecordedPriorities(brief), [brief]);

  const steps = [
    {
      title: "What are you here for?",
      blurb: "It changes every question after this one.",
      valid: true,
      body: (
        <div className="grid gap-3">
          {([["rent", "I'm looking to rent", "We'll score societies on living there — upkeep, security, commute."],
            ["buy", "I'm looking to buy", "We'll score them on value too — RERA, developer, possession."]] as Array<[BriefMode, string, string]>)
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
                className={`rounded-2xl border p-5 text-left transition ${
                  brief.mode === mode ? "border-[#0F7B63] bg-[#0F7B63]/5" : "border-navy-200 bg-white hover:border-navy-300"
                }`}
              >
                <p className="font-display text-xl font-medium text-navy-950">{label}</p>
                <p className="mt-1 text-sm text-navy-500">{blurb}</p>
              </button>
            ))}
        </div>
      ),
    },
    {
      title: "Who is it for?",
      blurb: "So the shortlist reads for the right person.",
      valid: Boolean(brief.purpose),
      body: (
        <div className="flex flex-wrap gap-2.5">
          {purposes.map((purpose) => (
            <Chip key={purpose} active={brief.purpose === purpose} onClick={() => set({ purpose })}>{purpose}</Chip>
          ))}
        </div>
      ),
    },
    {
      title: "What's your budget?",
      blurb: brief.mode === "rent" ? "Monthly rent you're comfortable with." : "Total you're comfortable exploring.",
      valid: brief.budget > 0,
      body: (
        <div>
          <p className="text-center font-display text-5xl font-medium text-navy-950">
            {brief.budget > 0 ? formatMoney(brief.budget) : "—"}
            {brief.mode === "rent" && brief.budget > 0 ? <span className="text-2xl text-navy-400">/mo</span> : null}
          </p>
          <input
            type="range"
            min={0}
            max={budgetSteps.length - 1}
            value={Math.max(0, budgetSteps.indexOf(brief.budget))}
            onChange={(event) => set({ budget: budgetSteps[Number(event.target.value)] })}
            className="mt-6 w-full accent-[#0F7B63]"
          />
          <div className="mt-2 flex justify-between text-xs font-semibold text-navy-400">
            <span>{formatMoney(budgetSteps[0])}</span>
            <span>{formatMoney(budgetSteps[budgetSteps.length - 1])}+</span>
          </div>
        </div>
      ),
    },
    {
      title: "What size?",
      blurb: "Pick as many as work for you.",
      valid: brief.bhk.length > 0,
      body: (
        <div className="flex flex-wrap gap-2.5">
          {BHK_CHOICES.map(([value, label]) => (
            <Chip key={value} active={brief.bhk.includes(value)} onClick={() => set({ bhk: toggle(brief.bhk, value) })}>
              {label}
            </Chip>
          ))}
        </div>
      ),
    },
    {
      title: "Where are you looking?",
      blurb: "An area, a sector or a landmark. Leave it blank and we'll look across the city.",
      valid: true,
      body: (
        <div>
          <Input
            value={brief.where}
            placeholder="Golf Course Road, Sector 65, near Cyber Hub…"
            onChange={(event) => set({ where: event.target.value })}
            className="h-14 text-base"
          />
          {areas.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-navy-400">
                Most inventory right now
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {areas.map((area) => (
                  <Chip key={area} active={brief.where === area} onClick={() => set({ where: brief.where === area ? "" : area })}>
                    {area}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: brief.mode === "rent" ? "When do you need it?" : "When do you want possession?",
      blurb: "",
      valid: Boolean(brief.timeline),
      body: (
        <div className="flex flex-wrap gap-2.5">
          {timelines.map(([value, label]) => (
            <Chip key={value} active={brief.timeline === value} onClick={() => set({ timeline: value })}>{label}</Chip>
          ))}
        </div>
      ),
    },
    {
      title: "What matters most?",
      blurb: "Pick a few. These decide how every society is scored for you.",
      valid: brief.priorities.length > 0,
      body: (
        <div>
          <div className="flex flex-wrap gap-2.5">
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
            <p className="mt-4 rounded-2xl bg-amber-50 p-3.5 text-[13px] font-semibold leading-5 text-amber-800">
              {unrecorded.map((p) => p.label).join(" and ")} {unrecorded.length === 1 ? "is" : "are"} not
              something any listing publishes, so we can’t filter on it. We’ll carry it into your brief and
              check it with the society directly.
            </p>
          ) : null}
        </div>
      ),
    },
    {
      title: "Anything else?",
      blurb: "Optional. The things the buttons above don't capture.",
      valid: true,
      body: (
        <div>
          <textarea
            value={brief.notes}
            maxLength={600}
            onChange={(event) => set({ notes: event.target.value })}
            placeholder="e.g. a quiet corner flat away from the main road, ideally park facing, with a study for WFH and space for my parents. Avoid ground floor."
            className="h-40 w-full rounded-2xl border border-navy-200 bg-white p-4 text-[15px] leading-6 text-navy-800 outline-none focus:border-[#0F7B63]"
          />
          <p className="mt-1.5 text-right text-xs font-semibold text-navy-400">{brief.notes.length} / 600</p>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const showResults = step >= steps.length;

  const advance = () => {
    if (!isLast) {
      setStep(step + 1);
      return;
    }

    // A beat before the answer. The work is real — every society in the city is scored —
    // and naming it is the difference between a list and a recommendation.
    setThinking(true);
    setStep(steps.length);
    window.setTimeout(() => setThinking(false), 1100);
  };

  if (showResults) {
    return (
      <div className="min-h-screen bg-[#F8F7F4]">
        <main className="mx-auto max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
          {thinking ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <Loader2 className="h-9 w-9 animate-spin text-[#0F7B63]" />
              <h1 className="mt-8 font-display text-3xl font-medium text-navy-950 md:text-4xl">
                Scoring {inCity.length} societies against your brief…
              </h1>
              <p className="mt-2 text-navy-500">Connectivity, upkeep, security, value.</p>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[360px_1fr] lg:gap-12">
              <aside className="lg:sticky lg:top-24 lg:self-start">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#C2724E]">Your brief</p>
                <h1 className="mt-2 font-display text-4xl font-medium leading-tight text-navy-950">
                  {brief.purpose || "Your"} {brief.mode === "rent" ? "rental" : "purchase"} in {city.name}.
                </h1>

                <div className="mt-5 flex flex-wrap gap-1.5">
                  {briefChips.map((chip) => (
                    <span key={chip} className="rounded-full bg-navy-50 px-3 py-1.5 text-[12.5px] font-bold text-navy-700">
                      {chip}
                    </span>
                  ))}
                </div>

                {brief.notes.trim() ? (
                  <p className="mt-4 rounded-2xl bg-ivory-100 p-3.5 text-[13px] italic leading-5 text-navy-600">
                    “{brief.notes.trim()}”
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="mt-4 text-sm font-bold text-[#0F7B63] hover:underline"
                >
                  Edit my brief
                </button>

                <div className="mt-8 rounded-2xl border border-navy-100 bg-white p-5">
                  <p className="flex items-center gap-2 text-sm font-black text-navy-900">
                    <ShieldCheck className="h-4 w-4 text-[#0F7B63]" /> How this was scored
                  </p>
                  <ul className="mt-3 space-y-1.5 text-[13px] leading-5 text-navy-600">
                    <li>• Every published society in {city.name}, not a paid selection</li>
                    <li>• Scored on the things you picked, from verified data</li>
                    <li>• Your details are never passed to a builder</li>
                    <li>• Where we don’t hold data, we say so</li>
                  </ul>
                </div>
              </aside>

              <div>
                {/* The work, stated. A shortlist of four means nothing without the number
                    it was drawn from. */}
                {shortlist ? (
                  <p className="font-mono text-[13px] font-semibold text-navy-500">
                    <span className="text-navy-900">{shortlist.scanned}</span> scanned
                    <span className="mx-2 text-navy-300">→</span>
                    <span className="text-navy-900">{shortlist.eligible}</span> fit your requirements
                    <span className="mx-2 text-navy-300">→</span>
                    <span className="text-[#0F7B63]">{shortlist.fits.length}</span> worth your time
                  </p>
                ) : null}

                {shortlist?.loosened.length ? (
                  <p className="mt-3 rounded-2xl bg-amber-50 p-3.5 text-[13px] font-semibold text-amber-800">
                    Nothing matched everything, so we loosened {shortlist.loosened.map((item) => `“${item}”`).join(" and ")}.
                    Everything below meets the rest.
                  </p>
                ) : null}

                <div className="mt-6 space-y-4">
                  {shortlist?.fits.map((fit, index) => (
                    <article
                      key={fit.society.id}
                      className="rounded-[20px] border border-navy-100 bg-white p-6 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#0F7B63]">
                            {index === 0 ? "Best fit for you" : fit.verdict}
                          </p>
                          <h2 className="mt-1 font-display text-2xl font-medium text-navy-950">
                            {fit.society.name}
                          </h2>
                          <p className="mt-1 text-sm font-semibold text-navy-500">
                            {[fit.society.sector, fit.society.locality].filter(Boolean).join(", ")}
                          </p>
                          <p className="mt-2 font-mono text-[15px] font-bold text-navy-900">
                            {brief.mode === "rent"
                              ? fit.society.rentRange || "Rent on request"
                              : fit.society.buyRange || "Price on request"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-4xl font-medium text-navy-950">{fit.percent}%</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-navy-400">fit to you</p>
                        </div>
                      </div>

                      {/* Why, in the society's own measured terms. A percentage nobody can
                          check is just a number asking to be believed. */}
                      {fit.reasons.length > 0 ? (
                        <ul className="mt-4 space-y-1.5">
                          {fit.reasons.map((reason) => (
                            <li key={reason.label} className="flex items-start gap-2 text-[13.5px] leading-5 text-navy-700">
                              <Check className={`mt-0.5 h-4 w-4 shrink-0 ${reason.good ? "text-[#0F7B63]" : "text-navy-300"}`} />
                              {reason.label}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {fit.unknown.length > 0 ? (
                        <p className="mt-3 text-[12.5px] font-semibold text-amber-700">
                          Not verified here yet: {fit.unknown.join(", ").toLowerCase()}.
                        </p>
                      ) : null}

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Link
                          to={fit.society.slug ? `/society/${fit.society.slug}` : "/societies"}
                          className="rounded-full bg-navy-900 px-5 py-2.5 text-sm font-bold text-white"
                        >
                          See the full report
                        </Link>
                        <Button variant="outline" className="rounded-full" onClick={() => setLeadOpen(true)}>
                          Ask about this
                        </Button>
                      </div>
                    </article>
                  ))}

                  {shortlist && shortlist.fits.length === 0 ? (
                    <p className="rounded-[20px] border border-dashed border-navy-200 bg-white p-8 text-center text-sm font-semibold text-navy-500">
                      Nothing in {city.name} fits this brief yet. Send it to us and we’ll go and find it.
                    </p>
                  ) : null}
                </div>

                {/* The half no catalogue answers, carried to someone who can. */}
                <div className="mt-6 rounded-[20px] bg-[#111827] p-7 text-white">
                  <h3 className="font-display text-2xl font-medium">
                    {unrecorded.length > 0
                      ? `We can’t filter on ${unrecorded.map((p) => p.label.toLowerCase()).join(" or ")} — but we can ask.`
                      : "Want us to check these for you?"}
                  </h3>
                  <p className="mt-2 text-[15px] leading-6 text-[#C7D0DE]">
                    Send this brief and we’ll come back with what each society actually offers — availability,
                    real rents, and the things owners never put in a listing.
                  </p>
                  <Button
                    className="mt-5 rounded-full bg-[#C2724E] px-7 py-6 text-[15px] font-bold hover:bg-[#b0673f]"
                    onClick={() => setLeadOpen(true)}
                  >
                    Send my brief
                  </Button>
                </div>
              </div>
            </div>
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
    <div className="min-h-screen bg-[#F8F7F4]">
      <main className="mx-auto max-w-[820px] px-5 py-10 md:px-8 md:py-16">
        <div className="h-1 w-full overflow-hidden rounded-full bg-navy-100">
          <div
            className="h-full rounded-full bg-[#0F7B63] transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        <p className="mt-8 text-[11px] font-black uppercase tracking-[0.16em] text-[#C2724E]">
          Step {step + 1} of {steps.length}
        </p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight text-navy-950 md:text-5xl">
          {current.title}
        </h1>
        {current.blurb ? <p className="mt-3 text-[17px] text-navy-500">{current.blurb}</p> : null}

        <div className="mt-10">{current.body}</div>

        <div className="mt-12 flex items-center justify-between">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-2 text-sm font-bold text-navy-500 disabled:opacity-0"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-4">
            {!current.valid ? (
              <button type="button" onClick={() => setStep(step + 1)} className="text-sm font-bold text-navy-400 hover:underline">
                Skip
              </button>
            ) : null}
            <Button
              disabled={loading && isLast}
              onClick={advance}
              className="rounded-full bg-[#0F7B63] px-8 py-6 text-[15px] font-bold hover:bg-[#0c6552]"
            >
              {isLast ? "See my shortlist" : "Continue"} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {step === 0 ? (
          <p className="mt-14 text-[13px] leading-6 text-navy-400">
            Around a minute. We never pass your details to a builder, and the full shortlist is
            shown either way — no sign-in, nothing blurred out.
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default BriefPage;
