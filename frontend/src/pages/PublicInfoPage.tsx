import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Image,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import { setPublicSeo } from "@/lib/seo";

type InfoVariant = "trust" | "privacy" | "help";

const content = {
  trust: {
    eyebrow: "How verification works",
    title: "Verified does not mean flashy. It means checked, labelled and honest about gaps.",
    description:
      "SocietyFlats separates society intelligence, property inventory, owner/broker submissions, media review and availability requests so users can understand what is known before they enquire.",
    canonical: "/trust",
  },
  privacy: {
    eyebrow: "Trust and privacy",
    title: "Your contact details power enquiries. They do not become public listing content.",
    description:
      "SocietyFlats keeps account data, owner/broker information, leads, OAuth tokens, admin notes and unpublished drafts inside protected workflows. Public pages show only approved, public-safe information.",
    canonical: "/privacy",
  },
  help: {
    eyebrow: "Help and FAQ",
    title: "Clear answers for society-first home search.",
    description:
      "Understand published society profiles, availability requests, AI recommendations, owner listings and broker verification before taking the next step.",
    canonical: "/help",
  },
} satisfies Record<InfoVariant, { eyebrow: string; title: string; description: string; canonical: string }>;

const verificationStages = [
  ["Research intake", "Imported files, admin entries, public references and user corrections arrive as private review material.", Eye],
  ["Field review", "Name, slug, builder, location, coordinates, amenities, source links and visible descriptions are checked before publishing.", ClipboardCheck],
  ["Image safety", "Images are approved only when they are direct, licensed, self-shot or clearly permitted. Place/map links remain references.", Image],
  ["Publication control", "Published, featured and search-boosted are separate admin decisions. Drafts do not leak into public pages.", ShieldCheck],
  ["Correction loop", "Users can flag stale or incorrect information. Corrections are reviewed before public data changes.", RefreshCw],
];

const trustComparisons = [
  ["Verified society profile", "A public society page that passed admin review for core fields, location and public-safe decision content."],
  ["Verified home", "A property listing reviewed separately for source, price, media, publishing status and lead routing."],
  ["Source reviewed", "A listing or profile has enough source context to show publicly, but users should still inspect before payment."],
  ["Photos under verification", "A placeholder means SocietyFlats is not pretending to have real listing photos yet."],
];

const privacyBlocks = [
  ["What can be public", "Society name, sector/locality, approved amenities, reviewed descriptions, public source links, safe images, published listing fields and public CTAs."],
  ["What stays private", "Lead messages, phone numbers, emails, owner/broker assignments, admin notes, account IDs, OAuth tokens, AI drafts and unpublished corrections."],
  ["How enquiries route", "When a user asks about a home or requests availability, the CTA routes through SocietyFlats lead capture rather than exposing private owner or broker contact details."],
  ["How AI uses data", "AI features use public-safe and admin-approved context. Draft SEO/social content remains review-only until approved."],
  ["How corrections work", "Correction submissions are reviewed internally and may be used to update public information, but submitter contact details are not shown publicly."],
  ["How deletion requests work", "Users can request account, lead or correction data review through SocietyFlats support. We keep necessary operational records only where required for legitimate business or compliance reasons."],
];

const faqs = [
  ["Why can a society have no available homes?", "Society intelligence and property inventory are reviewed separately. SocietyFlats does not create sample or fake homes to fill an empty state."],
  ["Does “verified” guarantee every field?", "No. It means the profile passed the SocietyFlats publishing workflow. Confidence, source and update signals show where more confirmation may still be needed."],
  ["How does AI make recommendations?", "The advisor uses the requirement you provide and currently published SocietyFlats data. Recommendations should be opened and reviewed before deciding."],
  ["What happens after I request availability?", "Your requirement becomes a private enquiry for the SocietyFlats team to review and follow up by phone or WhatsApp."],
  ["How are owner and broker listings handled?", "They remain requests or drafts until the relevant details and publishing status are reviewed."],
  ["Why does a builder or area page show no societies?", "We only publish what's been reviewed. Empty means not reviewed yet, not unavailable. Tell us what you need and we'll prioritize it."],
];

const relatedTrustLinks = [
  ["/methodology", "Methodology", "How society intelligence is built."],
  ["/data-sources", "Data sources", "Where public profile data comes from."],
  ["/score-explained", "Score explained", "How the 10-signal score works."],
  ["/corrections", "Corrections", "Report stale or incorrect information."],
  ["/editorial-independence", "Editorial independence", "How we keep guidance separate from sales pressure."],
];

export function PublicInfoPage({ variant }: { variant: InfoVariant }) {
  const copy = content[variant];

  useEffect(() => {
    setPublicSeo(`${copy.eyebrow} | SocietyFlats`, copy.description, { canonical: copy.canonical });
    window.scrollTo(0, 0);
  }, [copy]);

  return (
    <main className="min-h-screen bg-[#F7F2EA] text-[#111827]">
      <section className="border-b border-[#E6DDCF] bg-[radial-gradient(circle_at_80%_10%,rgba(194,114,78,.14),transparent_28%),radial-gradient(circle_at_12%_18%,rgba(35,59,110,.10),transparent_28%),linear-gradient(180deg,#FFFCF7,#F7F2EA)]">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 md:px-10 md:py-20 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#E6DDCF] bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#233B6E]">
              <ShieldCheck className="h-4 w-4" />
              {copy.eyebrow}
            </p>
            <h1 className="mt-5 max-w-5xl font-display text-[38px] font-medium leading-[1.02] tracking-[-0.02em] md:text-[62px]">{copy.title}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#667085] md:text-lg">{copy.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/search?tab=societies" className="rounded-[14px] bg-[#233B6E] px-6 py-3.5 text-sm font-black text-white">
                Browse verified societies
              </Link>
              <Link to="/ai-advisor" className="rounded-[14px] border border-[#E6DDCF] bg-white px-6 py-3.5 text-sm font-black text-[#233B6E]">
                Ask SocietyFlats AI
              </Link>
            </div>
          </div>
          <aside className="rounded-[28px] border border-[#E6DDCF] bg-white p-5 shadow-[0_24px_70px_-50px_rgba(17,24,39,.45)]">
            <div className="rounded-[22px] bg-[#111827] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#E3B36B]">Public promise</p>
              <p className="mt-4 font-display text-3xl font-medium">Fewer claims. Better labels. Clear next steps.</p>
            </div>
            <div className="mt-4 grid gap-3">
              {["No fake inventory", "No public phone exposure", "No unapproved AI publishing"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[16px] border border-[#EFE6DA] bg-[#FAF7F1] px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-[#C2724E]" />
                  <span className="text-sm font-black">{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-12 md:px-10 md:py-16">
        {variant === "privacy" ? <PrivacyContent /> : variant === "help" ? <HelpContent /> : <TrustContent />}

        <section className="mt-12 rounded-[28px] bg-[#233B6E] p-8 text-white md:flex md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-3xl font-medium text-white">Need current availability?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D8E3FF]">Published data is the starting point. SocietyFlats can help verify rental or resale options without showing fake cards.</p>
          </div>
          <Link to="/search" className="mt-5 inline-flex items-center rounded-[14px] bg-[#C2724E] px-5 py-3 text-sm font-black text-white md:mt-0">
            Start society search <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </section>
      </section>
    </main>
  );
}

function TrustContent() {
  return (
    <>
      <section>
        <div className="mb-8 max-w-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#C2724E]">Verification lifecycle</p>
          <h2 className="mt-2 font-display text-4xl font-medium">From rough data to a page users can act on.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {verificationStages.map(([title, body, Icon], index) => {
            const ItemIcon = Icon as typeof ShieldCheck;
            return (
              <article key={String(title)} className="rounded-[22px] border border-[#E6DDCF] bg-white p-5 shadow-[0_14px_34px_-32px_rgba(17,24,39,.42)]">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#E9EEF9] text-[#233B6E]">
                    <ItemIcon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-black text-[#98A2B3]">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-black">{String(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-[#667085]">{String(body)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[28px] border border-[#E6DDCF] bg-white p-6 lg:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">What labels mean</p>
          <h2 className="mt-2 font-display text-4xl font-medium">One word should never hide three workflows.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {trustComparisons.map(([title, body]) => (
              <div key={title} className="rounded-[18px] border border-[#EFE6DA] bg-[#FAF7F1] p-4">
                <p className="font-black">{title}</p>
                <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-[28px] bg-[#111827] p-6 text-white lg:p-8">
          <SearchCheck className="h-8 w-8 text-[#E3B36B]" />
          <h2 className="mt-4 font-display text-3xl font-medium">The point is better shortlisting.</h2>
          <p className="mt-3 text-sm leading-7 text-[#D0D5DD]">
            SocietyFlats helps users decide which societies deserve attention before they spend time on calls and visits. We still recommend confirming the exact flat, title, pricing, furnishing and handover terms before any payment.
          </p>
          <Link to="/methodology" className="mt-6 inline-flex items-center text-sm font-black text-[#E3B36B]">
            Read methodology <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </aside>
      </section>

      <RelatedPages />
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {privacyBlocks.map(([title, body], index) => {
          const Icon = [Eye, LockKeyhole, MessageSquareText, UserRoundCheck, FileText, RefreshCw][index] ?? LockKeyhole;
          const id = title === "How deletion requests work" ? "data-deletion" : undefined;
          return (
            <article id={id} key={title} className="scroll-mt-24 rounded-[24px] border border-[#E6DDCF] bg-white p-6 shadow-[0_14px_34px_-32px_rgba(17,24,39,.42)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E9EEF9] text-[#233B6E]">
                <Icon className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-[#667085]">{body}</p>
            </article>
          );
        })}
      </section>

      <section className="mt-10 rounded-[28px] border border-[#E6DDCF] bg-white p-6 lg:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">Practical privacy examples</p>
        <h2 className="mt-2 font-display text-4xl font-medium">How privacy shows up in the product.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Property enquiry", "A visitor can ask about a home, but public pages do not reveal owner or broker numbers."],
            ["Admin social accounts", "OAuth tokens for Meta, Google or LinkedIn are encrypted and never returned to the frontend."],
            ["AI drafting", "AI-generated SEO or social content remains a draft until an admin reviews and approves it."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-[18px] bg-[#FAF7F1] p-5">
              <p className="font-black">{title}</p>
              <p className="mt-2 text-sm leading-6 text-[#667085]">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function HelpContent() {
  return (
    <section className="mx-auto max-w-[900px] space-y-3">
      {faqs.map(([question, answer], index) => (
        <details key={question} open={index === 0} className="rounded-[18px] border border-[#E6DDCF] bg-white px-5 py-4">
          <summary className="cursor-pointer font-bold text-[#111827]">{question}</summary>
          <p className="mt-3 text-sm leading-6 text-[#667085]">{answer}</p>
        </details>
      ))}
    </section>
  );
}

function RelatedPages() {
  return (
    <section className="mt-10 rounded-[28px] border border-[#E6DDCF] bg-white p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2724E]">Trust library</p>
          <h2 className="mt-2 font-display text-3xl font-medium">The policy pages behind the product.</h2>
        </div>
        <Link to="/corrections" className="inline-flex items-center text-sm font-black text-[#233B6E]">
          Submit correction <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {relatedTrustLinks.map(([href, title, body]) => (
          <Link key={href} to={href} className="rounded-[18px] border border-[#EFE6DA] bg-[#FAF7F1] p-4 transition hover:-translate-y-0.5 hover:bg-white">
            <p className="font-black">{title}</p>
            <p className="mt-1 text-sm leading-6 text-[#667085]">{body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
