import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSearch,
  Gauge,
  LockKeyhole,
  MessageSquareWarning,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backendApi } from "@/services/backendApi";
import { setPublicSeo } from "@/lib/seo";
import { trackCorrectionFormSubmit } from "@/lib/analytics";

type Variant = "methodology" | "data-sources" | "score-explained" | "corrections" | "editorial-independence";

type PageConfig = {
  eyebrow: string;
  title: string;
  description: string;
  canonical: string;
  heroMetric: string;
  heroMetricLabel: string;
  principles: Array<[string, string]>;
  deepDive: Array<[string, string]>;
  donts: string[];
};

const pageConfigs: Record<Variant, PageConfig> = {
  methodology: {
    eyebrow: "Decision methodology",
    title: "How SocietyFlats turns Gurgaon society data into practical home-search intelligence.",
    description:
      "Our methodology is society-first: we verify location, liveability, amenities, maintenance, connectivity, builder context, market signals and correction history before turning a profile into public guidance.",
    canonical: "/methodology",
    heroMetric: "10",
    heroMetricLabel: "decision signals",
    principles: [
      ["Society before flat", "A good unit can still be a poor fit if the society commute, upkeep or resident rhythm is wrong."],
      ["Evidence before adjectives", "We avoid unsupported words like best or luxury unless the claim is clearly sourced and reviewed."],
      ["Coverage-aware scoring", "Thin data reduces confidence. Missing evidence is not quietly converted into a negative score."],
      ["Review before publication", "AI drafts, imports and corrections remain private until an admin explicitly publishes them."],
    ],
    deepDive: [
      ["What we collect", "Society name, location, builder, public project links, amenities, verified map context, nearby schools/hospitals/transit notes, market ranges, images, corrections and admin review status."],
      ["How it becomes useful", "Each signal is translated into a decision question: Is the commute workable? Is maintenance visible? Are amenities practical? Is public information consistent?"],
      ["How users should use it", "Shortlist societies first, compare trade-offs, then confirm flat-level details like tower, floor, price, furnishing and visit timing before committing."],
    ],
    donts: [
      "We do not invent availability when no home is published.",
      "We do not treat paid visibility as a scoring signal.",
      "We do not expose internal notes, leads or private owner/broker contact details.",
    ],
  },
  "data-sources": {
    eyebrow: "Data sources",
    title: "Where SocietyFlats information comes from, and what stays out of public pages.",
    description:
      "Published profiles are built from reviewed public material, admin-entered field checks, maps references, owner/broker workflows and user corrections. Private records remain private.",
    canonical: "/data-sources",
    heroMetric: "Public",
    heroMetricLabel: "sources only",
    principles: [
      ["Official references", "Developer pages, project links, public RERA/search references and publicly available documentation can support core profile fields."],
      ["Map context", "Google Maps links, coordinates and nearby-intelligence notes help place a society, but raw promotional place text is not used as final copy."],
      ["Admin review", "Importer results, AI suggestions and bulk updates stay review-only until an admin checks and publishes them."],
      ["User corrections", "Visitors can flag stale or incorrect information; those submissions are evidence for review, not instant edits."],
    ],
    deepDive: [
      ["Source confidence", "We separate verified fields, needs-review fields and unavailable fields so a user can see the difference between known facts and areas that still need confirmation."],
      ["Inventory separation", "A society profile can be public even when no verified home is available. Property listings have their own source, media and publishing review."],
      ["Sensitive data boundary", "Lead messages, phone numbers, account IDs, admin notes, OAuth tokens and draft social/SEO content are never part of public profile data."],
    ],
    donts: [
      "We do not copy raw Google or third-party promotional descriptions into public decision copy.",
      "We do not show private lead requirements or owner/broker numbers on public pages.",
      "We do not use unsupported ratings, exact distances or price claims as final facts without review.",
    ],
  },
  "score-explained": {
    eyebrow: "Score explained",
    title: "A SocietyFlats score is a decision aid, not a blanket guarantee.",
    description:
      "The score summarizes verified society-level signals. It is designed to help compare trade-offs, not replace a visit, legal due diligence, price negotiation or flat-level inspection.",
    canonical: "/score-explained",
    heroMetric: "60%+",
    heroMetricLabel: "coverage gate",
    principles: [
      ["Weighted, not vague", "The public score uses ten transparent signal groups with fixed weights adding up to 100%."],
      ["Missing data handled fairly", "If a signal is unavailable, coverage falls. We do not pretend unknown data is good or bad."],
      ["Watch-outs matter", "A high score can still have notes: price value, commute, image status or missing source details may require review."],
      ["Flat details are separate", "A society score does not certify a specific unit, seller, broker, furnishing, price or title status."],
    ],
    deepDive: [
      ["How to read 8+", "Usually a strong society profile with broad reviewed evidence. Still inspect the exact unit and current availability."],
      ["How to read 6–8", "Often a workable shortlist candidate with trade-offs. Check the weaker signals before deciding."],
      ["How to read thin coverage", "If coverage is limited, use the page as a starting brief and request verification rather than treating the score as final."],
    ],
    donts: [
      "We do not rank societies as number one or guaranteed best.",
      "We do not turn investment-return claims into score points.",
      "We do not publish a score without enough evidence coverage.",
    ],
  },
  corrections: {
    eyebrow: "Corrections",
    title: "Help us fix incomplete, stale or incorrect society information.",
    description:
      "If a society page looks wrong, submit the correction with context. SocietyFlats reviews the submission before updating public data so one anonymous report cannot rewrite a profile.",
    canonical: "/corrections",
    heroMetric: "Review",
    heroMetricLabel: "before edit",
    principles: [
      ["Useful corrections", "Wrong sector, stale builder name, missing amenities, incorrect public links or outdated location notes are all worth reporting."],
      ["Helpful evidence", "A project page, public document, map link or clear explanation helps an admin verify the change faster."],
      ["Privacy-first", "Do not send private phone numbers, lead messages or owner details unless they are necessary for your own callback."],
      ["No instant overwrite", "Corrections create an admin review item first. Public data changes only after review."],
    ],
    deepDive: [
      ["What happens after submission", "The correction is stored for admin review, checked against public-safe evidence and either applied, parked for follow-up or rejected if unsupported."],
      ["When we may not change a page", "If evidence conflicts, is promotional, is private, or would create an unsupported claim, we keep the page conservative."],
      ["How to write a good correction", "Name the field, say what is wrong, suggest the replacement, and add a source URL if you have one."],
    ],
    donts: [
      "We do not publish anonymous corrections automatically.",
      "We do not add price, ranking or possession claims without review.",
      "We do not expose correction submitter contact details publicly.",
    ],
  },
  "editorial-independence": {
    eyebrow: "Editorial independence",
    title: "SocietyFlats guidance should stay useful even when commercial pressure exists.",
    description:
      "We separate editorial checks, score logic, lead handling, partner relationships and publishing controls so users can trust what is shown on public society pages.",
    canonical: "/editorial-independence",
    heroMetric: "No",
    heroMetricLabel: "paid score boost",
    principles: [
      ["No paid score changes", "A partner, broker, builder or advertiser cannot buy a higher society score."],
      ["No fake urgency", "We avoid unsupported scarcity and sales copy such as limited offer, guaranteed return or book now."],
      ["Clear commercial routing", "Enquiry CTAs may route to SocietyFlats, but public pages should still describe what is verified and what is not."],
      ["Reviewable AI", "AI can draft summaries, social posts or SEO tasks, but publication remains an admin decision."],
    ],
    deepDive: [
      ["Sales vs editorial", "The team may help users find availability, but society profile quality, score and watch-outs should not be overwritten to close a deal."],
      ["Partner visibility", "Partner modules, referrals and broker workflows can exist without changing the factual state of a society profile."],
      ["Correction accountability", "If a public page is challenged, the correction workflow creates a record instead of silently replacing information."],
    ],
    donts: [
      "We do not hide missing evidence behind polished copy.",
      "We do not publish unapproved AI-generated claims.",
      "We do not expose private account, lead or token data in public pages.",
    ],
  },
};

const workflowSteps = [
  ["Collect", "Gather society facts, public references, map context, market ranges, images and correction history."],
  ["Normalize", "Clean duplicates, remove unsafe claims, group evidence and convert messy data into stable fields."],
  ["Score", "Apply weighted society signals only when enough evidence coverage exists."],
  ["Review", "Keep importer results, AI drafts and corrections private until an admin checks them."],
  ["Publish", "Show public-safe facts, decision copy, CTAs and correction paths."],
];

// Distinct, substantive content per trust page — so each reads as its own page, not a
// re-skin of the same boilerplate.
const variantDetail: Record<Variant, { heading: string; intro: string; items: Array<[string, string]> }> = {
  methodology: {
    heading: "What we measure, and what we refuse to",
    intro: "Every public society score is assembled the same way, from the same signal set — no per-society hand-tuning, no paid weighting.",
    items: [
      ["Ten weighted signals", "Liveability, connectivity, maintenance, builder, price value, rental demand, resale liquidity, safety, legal/RERA and environment — fixed weights summing to 100%."],
      ["Coverage gate", "A society only earns an overall score once verified signals cover at least 60% of the weight. Below that, we say 'insufficient data' instead of guessing."],
      ["Missing is not bad", "Absent signals are excluded and the remaining weights renormalise — thin data can never inflate a score, only lower its coverage."],
      ["Human sign-off", "AI publishes nothing to the public. An admin reviews and publishes; every override carries a recorded reason."],
    ],
  },
  "data-sources": {
    heading: "Where each insight comes from",
    intro: "We prefer whoever is actually authoritative for a field, and we label it. Anything unsourced is shown as unverified, not asserted.",
    items: [
      ["Published society data", "Admin-reviewed fields — configuration, amenities, sector, builder — checked before a profile goes public."],
      ["Public records & RERA", "Registration numbers and legal-status signals from public registries, linked to the official source where available."],
      ["Google Maps & Places", "Coordinates, locality context and society imagery, with attribution shown on the photo."],
      ["Market range context", "Rent and resale ranges grounded in portal consensus, refreshed on a schedule — shown only when a realistic range exists."],
      ["Resident corrections", "Verified user reports, reviewed by an admin before anything public changes."],
    ],
  },
  "score-explained": {
    heading: "Reading a society score correctly",
    intro: "The number is a shortlist aid, not a verdict. Here's exactly what it does and doesn't tell you.",
    items: [
      ["It reflects the society, not the unit", "Tower, floor, view and finish vary within a society — confirm the specific unit before deciding."],
      ["Verified vs estimated is marked", "Green signals are verified against sources; amber are estimated from society data and flagged as such on every profile."],
      ["Coverage is shown alongside", "A high score on thin coverage is weaker than a slightly lower score on full coverage — both numbers are visible."],
      ["Overrides are accountable", "An admin can override a computed score, but only with a recorded reason that stays on file."],
    ],
  },
  corrections: {
    heading: "How a correction is handled",
    intro: "Nothing public changes automatically from a submission. Every correction is reviewed like a source.",
    items: [
      ["You flag it", "Tell us what looks wrong and share any supporting link — a listing, a RERA page, an official notice."],
      ["We review it", "An admin checks the claim against the society's record and the source before touching anything public."],
      ["We update or explain", "If it's confirmed, the profile is corrected and re-published. If not, it stays as-is — we don't change verified data on an unverifiable claim."],
    ],
  },
  "editorial-independence": {
    heading: "What we will never do",
    intro: "Guidance you can trust means guidance that isn't for sale. These are hard lines, not preferences.",
    items: [
      ["No invented facts", "We never fabricate prices, possession dates, RERA data, rankings, travel times or investment returns."],
      ["No paid ranking", "Scores and ordering are not for sale. A builder cannot buy a higher score or a better position."],
      ["No guaranteed outcomes", "We don't promise rent, resale value, appreciation or a timeline — and we say when something needs professional sign-off."],
      ["No hidden advertising", "Sponsored placements, if ever shown, would be labelled. Decision copy stays separate from any commercial pressure."],
    ],
  },
};

const signalWeights: Array<[string, number, string]> = [
  ["Everyday liveability", 20, "Lifestyle, amenities and how the society actually functions day to day."],
  ["Connectivity & commute", 15, "Metro, roads, office access and practical movement around Gurgaon."],
  ["Upkeep & maintenance", 10, "Maintenance quality, visible upkeep and management signals."],
  ["Builder track record", 10, "Developer history and public project context."],
  ["Price for what you get", 10, "Value signal from reviewed market ranges, not a guarantee."],
  ["Rental demand", 10, "Demand indicators where verified rental context exists."],
  ["Resale liquidity", 10, "Resale context where enough evidence is available."],
  ["Safety & security", 5, "Gated access, CCTV, power backup and safety amenities."],
  ["Legal & RERA confidence", 5, "Public legal/RERA confidence signals where available."],
  ["Environment & resilience", 5, "Green cover, drainage, access and resilience context."],
];

const relatedLinks: Array<[string, string, string]> = [
  ["/trust", "How verification works", "Understand what a published SocietyFlats profile means."],
  ["/methodology", "Methodology", "See how society intelligence is built."],
  ["/data-sources", "Data sources", "Review the public-safe evidence model."],
  ["/score-explained", "Score explained", "Read the signal weights and coverage rules."],
  ["/corrections", "Corrections", "Flag stale or incorrect information."],
  ["/editorial-independence", "Editorial independence", "See how we separate guidance from sales pressure."],
];

export function DecisionTrustPage({ variant }: { variant: Variant }) {
  const page = pageConfigs[variant];
  const [form, setForm] = useState({
    society_name: "",
    information_challenged: "",
    suggested_correction: "",
    supporting_url: "",
    name: "",
    email: "",
    phone: "",
    consent: false,
  });
  const [message, setMessage] = useState("");

  const pageLinks = useMemo(() => relatedLinks.filter(([href]) => href !== page.canonical), [page.canonical]);

  useEffect(() => {
    setPublicSeo(`${page.eyebrow} | SocietyFlats`, page.description, { canonical: page.canonical });
    window.scrollTo(0, 0);
  }, [page]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    try {
      await backendApi.submitIntelligenceCorrection({ ...form, information_key: "public_correction" });
      trackCorrectionFormSubmit({ source: "trust_corrections_page", society_name: form.society_name });
      setMessage("Correction submitted for admin review.");
      setForm({
        society_name: "",
        information_challenged: "",
        suggested_correction: "",
        supporting_url: "",
        name: "",
        email: "",
        phone: "",
        consent: false,
      });
    } catch (error: any) {
      setMessage(error?.message || "Unable to submit correction.");
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F2EA] text-[#1D2939]">
      <section className="relative border-b border-[#E6DDCF] bg-[radial-gradient(circle_at_84%_12%,rgba(194,114,78,.14),transparent_28%),radial-gradient(circle_at_10%_18%,rgba(35,59,110,.10),transparent_25%),linear-gradient(180deg,#FFFCF7,#F7F2EA)]">
        <div className="mx-auto grid max-w-[1360px] gap-10 px-5 py-14 md:px-10 md:py-20 lg:grid-cols-[1fr_430px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E6DDCF] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#233B6E]">
              <CheckCircle2 className="h-4 w-4" />
              {page.eyebrow}
            </p>
            <h1 className="mt-5 max-w-5xl font-display text-[40px] font-medium leading-[1.02] tracking-[-0.025em] text-[#111827] md:text-[68px]">
              {page.title}
            </h1>
            <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#667085] md:text-lg">{page.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="rounded-[14px] bg-[#233B6E] px-6 py-6 text-white hover:bg-[#1d315b]">
                <Link to="/search?tab=societies">Browse societies</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-[14px] border-[#E6DDCF] bg-white px-6 py-6 text-[#9A552E]">
                <Link to="/corrections">
                  Report a correction <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#E6DDCF] bg-white p-5 shadow-[0_30px_80px_-52px_rgba(17,24,39,.5)]">
            <div className="rounded-[24px] bg-[#233B6E] p-6 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D8E3FF]">Public trust rule</p>
              <div className="mt-7 flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-5xl font-medium">{page.heroMetric}</p>
                  <p className="mt-1 text-sm text-[#D8E3FF]">{page.heroMetricLabel}</p>
                </div>
                <Sparkles className="h-10 w-10 text-[#E3B36B]" />
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {page.principles.slice(0, 3).map(([title, body]) => (
                <div key={title} className="rounded-[18px] border border-[#EFE6DA] bg-[#FAF7F1] p-4">
                  <p className="font-black text-[#111827]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#667085]">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-12 md:px-10">
        <VariantDetailSection variant={variant} />
        {variant === "corrections" ? (
          <CorrectionsSection page={page} form={form} setForm={setForm} message={message} submit={submit} />
        ) : (
          <>
            <PrinciplesGrid page={page} />
            <WorkflowSection />
            <DeepDiveSection page={page} />
            {(variant === "score-explained" || variant === "methodology") && <ScorecardSection />}
            <DoNotDoSection page={page} />
          </>
        )}

        <section className="mt-10 rounded-[30px] border border-[#E6DDCF] bg-white p-6 shadow-[0_18px_44px_-36px_rgba(17,24,39,.38)] lg:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">Related trust pages</p>
              <h2 className="mt-2 font-display text-3xl font-medium text-[#111827]">Read the full public standard.</h2>
            </div>
            <Link to="/trust" className="inline-flex items-center text-sm font-black text-[#233B6E]">
              Verification overview <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {pageLinks.map(([href, title, body]) => (
              <Link key={href} to={href} className="rounded-[18px] border border-[#EFE6DA] bg-[#FAF7F1] p-4 transition hover:-translate-y-0.5 hover:bg-white">
                <p className="font-black text-[#111827]">{title}</p>
                <p className="mt-1 text-sm leading-6 text-[#667085]">{body}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function PrinciplesGrid({ page }: { page: PageConfig }) {
  const icons = [ShieldCheck, FileSearch, Gauge, ClipboardCheck];
  return (
    <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
      {page.principles.map(([title, body], index) => {
        const Icon = icons[index] ?? ShieldCheck;
        return (
          <article key={title} className="rounded-[24px] border border-[#E6DDCF] bg-white p-6 shadow-[0_14px_36px_-32px_rgba(17,24,39,.4)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E9EEF9] text-[#233B6E]">
              <Icon className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-xl font-black text-[#111827]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
          </article>
        );
      })}
    </section>
  );
}

function VariantDetailSection({ variant }: { variant: Variant }) {
  const detail = variantDetail[variant];
  if (!detail) return null;
  return (
    <section className="mt-10 rounded-[30px] border border-[#E6DDCF] bg-white p-6 shadow-[0_18px_44px_-36px_rgba(17,24,39,.38)] lg:p-8">
      <div className="max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">In detail</p>
        <h2 className="mt-2 font-display text-4xl font-medium text-[#111827]">{detail.heading}</h2>
        <p className="mt-3 text-[15px] leading-7 text-[#667085]">{detail.intro}</p>
      </div>
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        {detail.items.map(([title, body]) => (
          <div key={title} className="rounded-[20px] border border-[#EFE6DA] bg-[#FAF7F1] p-5">
            <h3 className="text-[15.5px] font-black text-[#111827]">{title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-6 text-[#667085]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="mt-10 rounded-[30px] border border-[#E6DDCF] bg-white p-6 shadow-[0_18px_44px_-36px_rgba(17,24,39,.38)] lg:p-8">
      <div className="max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">Publication workflow</p>
        <h2 className="mt-2 font-display text-4xl font-medium text-[#111827]">A controlled path from evidence to public guidance.</h2>
      </div>
      <div className="mt-7 grid gap-4 lg:grid-cols-5">
        {workflowSteps.map(([title, body], index) => (
          <div key={title} className="relative rounded-[22px] border border-[#EFE6DA] bg-[#FAF7F1] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#233B6E] text-sm font-black text-white">0{index + 1}</span>
            <h3 className="mt-5 text-lg font-black text-[#111827]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DeepDiveSection({ page }: { page: PageConfig }) {
  return (
    <section className="mt-10 grid gap-5 lg:grid-cols-3">
      {page.deepDive.map(([title, body]) => (
        <article key={title} className="rounded-[26px] border border-[#E6DDCF] bg-white p-6">
          <Database className="h-6 w-6 text-[#C2724E]" />
          <h2 className="mt-4 font-display text-2xl font-medium text-[#111827]">{title}</h2>
          <p className="mt-3 text-sm leading-7 text-[#667085]">{body}</p>
        </article>
      ))}
    </section>
  );
}

function ScorecardSection() {
  return (
    <section className="mt-10 rounded-[30px] border border-[#E6DDCF] bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">The exact scorecard</p>
          <h2 className="mt-2 font-display text-4xl font-medium text-[#111827]">Ten weighted signals — visible to users.</h2>
        </div>
        <p className="text-sm font-bold text-[#8A8F89]">Weights total 100%</p>
      </div>
      <div className="mt-6 overflow-hidden rounded-[18px] border border-[#EFE6DA]">
        {signalWeights.map(([label, weight, detail], index) => (
          <div key={label} className={`grid gap-3 px-4 py-4 md:grid-cols-[70px_130px_1fr] md:items-center md:px-6 ${index % 2 ? "bg-[#FAF7F1]" : "bg-white"}`}>
            <div className="font-display text-2xl font-medium text-[#233B6E]">{weight}%</div>
            <div className="h-2 overflow-hidden rounded-full bg-[#E7E3DA]">
              <div className="h-full rounded-full bg-[#C2724E]" style={{ width: `${weight * 5}%` }} />
            </div>
            <div>
              <p className="font-bold text-[#111827]">{label}</p>
              <p className="text-[13px] leading-5 text-[#667085]">{detail}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-6 text-[#667085]">
        A society only gets an overall score once verified signals cover at least 60% of the weight. Missing signals are excluded and the remaining weights renormalise, so thin data cannot quietly inflate a result.
      </p>
    </section>
  );
}

function DoNotDoSection({ page }: { page: PageConfig }) {
  return (
    <section className="mt-10 rounded-[30px] bg-[#111827] p-6 text-white lg:flex lg:items-start lg:justify-between lg:p-8">
      <div className="max-w-xl">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E3B36B]">What we deliberately avoid</p>
        <h2 className="mt-2 font-display text-4xl font-medium">Trust is mostly restraint.</h2>
        <p className="mt-3 text-sm leading-7 text-[#D0D5DD]">
          The useful part of SocietyFlats is not just what we publish. It is also what we refuse to publish until it is properly checked.
        </p>
      </div>
      <div className="mt-6 grid gap-3 lg:mt-0 lg:w-[520px]">
        {page.donts.map((item) => (
          <div key={item} className="flex gap-3 rounded-[18px] bg-white/8 p-4">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#E3B36B]" />
            <p className="text-sm leading-6 text-[#F2F4F7]">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CorrectionsSection({
  page,
  form,
  setForm,
  message,
  submit,
}: {
  page: PageConfig;
  form: {
    society_name: string;
    information_challenged: string;
    suggested_correction: string;
    supporting_url: string;
    name: string;
    email: string;
    phone: string;
    consent: boolean;
  };
  setForm: (form: {
    society_name: string;
    information_challenged: string;
    suggested_correction: string;
    supporting_url: string;
    name: string;
    email: string;
    phone: string;
    consent: boolean;
  }) => void;
  message: string;
  submit: (event: FormEvent) => void;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <aside className="rounded-[30px] bg-[#111827] p-6 text-white lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#E3B36B]">Correction standard</p>
        <h2 className="mt-3 font-display text-4xl font-medium">Tell us what changed. We will keep the public page conservative until checked.</h2>
        <p className="mt-4 text-sm leading-7 text-[#D0D5DD]">{page.description}</p>
        <div className="mt-6 space-y-3">
          {page.principles.map(([title, body], index) => (
            <div key={title} className="rounded-[18px] bg-white/8 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-black text-[#233B6E]">{index + 1}</span>
                <p className="font-black">{title}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#D0D5DD]">{body}</p>
            </div>
          ))}
        </div>
      </aside>

      <form onSubmit={submit} className="rounded-[30px] border border-[#E6DDCF] bg-white p-6 shadow-[0_18px_44px_-34px_rgba(17,24,39,.35)] lg:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#FBE9DF] text-[#C2724E]">
            <MessageSquareWarning className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-3xl font-medium text-[#111827]">Submit a correction</h2>
            <p className="mt-1 text-sm leading-6 text-[#667085]">Best reports name the field, explain the issue and include a public source if available.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          <Input className="h-12 rounded-[14px]" placeholder="Society name" value={form.society_name} onChange={(e) => setForm({ ...form, society_name: e.target.value })} />
          <textarea
            required
            className="min-h-28 rounded-[18px] border border-[#E6DDCF] bg-[#FFFCF7] p-4 outline-none focus:border-[#3156A3]"
            placeholder="What information looks incorrect, incomplete or stale?"
            value={form.information_challenged}
            onChange={(e) => setForm({ ...form, information_challenged: e.target.value })}
          />
          <textarea
            required
            className="min-h-28 rounded-[18px] border border-[#E6DDCF] bg-[#FFFCF7] p-4 outline-none focus:border-[#3156A3]"
            placeholder="What should it say instead?"
            value={form.suggested_correction}
            onChange={(e) => setForm({ ...form, suggested_correction: e.target.value })}
          />
          <Input className="h-12 rounded-[14px]" placeholder="Supporting public URL (optional)" value={form.supporting_url} onChange={(e) => setForm({ ...form, supporting_url: e.target.value })} />
          <div className="grid gap-3 md:grid-cols-3">
            <Input required className="h-12 rounded-[14px]" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input required className="h-12 rounded-[14px]" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input className="h-12 rounded-[14px]" placeholder="Phone optional" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <label className="flex gap-3 rounded-[18px] bg-[#FAF7F1] p-4 text-sm text-[#667085]">
            <input required type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} />
            I consent to SocietyFlats using this submission for admin review.
          </label>
          <Button className="h-12 rounded-[14px] bg-[#233B6E] text-white hover:bg-[#1d315b]">Submit correction</Button>
          {message ? <p className="rounded-[14px] bg-[#E9EEF9] p-3 text-sm font-semibold text-[#233B6E]">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
