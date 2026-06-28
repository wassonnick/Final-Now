import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, Image, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { setPublicSeo } from "@/lib/seo";

type InfoVariant = "trust" | "privacy" | "help";

const content = {
  trust: {
    eyebrow: "Verification at SocietyFlats",
    title: "What admin-reviewed society data actually means.",
    description: "SocietyFlats separates imported research, admin review, public publishing and live-home availability so users can see what is known—and what still needs confirmation.",
  },
  privacy: {
    eyebrow: "Trust and privacy",
    title: "Your number is used for verification and the enquiries you choose.",
    description: "Account, owner and broker information stays inside the relevant workflow. Public pages do not expose private phone numbers or unpublished records.",
  },
  help: {
    eyebrow: "Help and FAQ",
    title: "Clear answers for society-first home search.",
    description: "Understand published society profiles, availability requests, AI recommendations, owner listings and broker verification before taking the next step.",
  },
} satisfies Record<InfoVariant, { eyebrow: string; title: string; description: string }>;

const verificationSteps = [
  ["Research collected", "Source material may be imported or gathered for admin review. It is not public by default.", Eye],
  ["Admin review", "Name, location, project context, images and public-safe fields are checked before publishing.", ShieldCheck],
  ["Images reviewed", "Only approved display images or clearly labelled references appear publicly.", Image],
  ["Availability separated", "A society profile can be published even when no verified home is currently listed.", RefreshCw],
  ["Coverage is still growing", "We'd rather show fewer, real societies than pad listings with unreviewed ones.", CheckCircle2],
];

const faqs = [
  ["Why can a society have no available homes?", "Society intelligence and property inventory are reviewed separately. SocietyFlats does not create sample or fake homes to fill an empty state."],
  ["Does “verified” guarantee every field?", "No. It means the profile passed the SocietyFlats publishing workflow. Confidence, source and update signals show where more confirmation may still be needed."],
  ["How does AI make recommendations?", "The advisor uses the requirement you provide and currently published SocietyFlats data. Recommendations should be opened and reviewed before deciding."],
  ["What happens after I request availability?", "Your requirement becomes a private enquiry for the SocietyFlats team to review and follow up by phone or WhatsApp."],
  ["How are owner and broker listings handled?", "They remain requests or drafts until the relevant details and publishing status are reviewed."],
  ["Why does a builder or area page show no societies?", "We only publish what's been reviewed — empty means not reviewed yet, not unavailable. Tell us what you need and we'll prioritize it."],
];

export function PublicInfoPage({ variant }: { variant: InfoVariant }) {
  const copy = content[variant];

  useEffect(() => {
    setPublicSeo(
      `${copy.eyebrow} | SocietyFlats`,
      copy.description,
      { canonical: `/${variant === "trust" ? "trust" : variant}` },
    );
    window.scrollTo(0, 0);
  }, [copy, variant]);

  return (
    <main className="min-h-screen bg-[#F8F3EA]">
      <section className="border-b border-[#E7DCCB] bg-[radial-gradient(circle_at_82%_12%,rgba(194,114,78,.10),transparent_28%),linear-gradient(180deg,#FFFBF3,#F8F3EA)]">
        <div className="mx-auto max-w-[1180px] px-5 py-14 md:px-10 md:py-20">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2A6147]">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-[38px] font-medium leading-[1.02] text-[#10251F] md:text-[58px]">{copy.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#59635E] md:text-lg">{copy.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/search?tab=societies" className="rounded-[12px] bg-[#123C32] px-6 py-3.5 text-sm font-bold text-white">Browse published societies</Link>
            <Link to="/ai-advisor" className="rounded-[12px] border border-[#E7DCCB] bg-white px-6 py-3.5 text-sm font-bold text-[#123C32]">Ask SocietyFlats AI</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-12 md:px-10 md:py-16">
        {variant === "privacy" ? (
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ["Private by default", "Draft society data, listing requests and account records are not public.", LockKeyhole],
              ["Purpose-limited contact", "Phone numbers support access, verification and user-requested enquiries.", ShieldCheck],
              ["Admin-controlled publishing", "Public visibility is a separate approval decision.", CheckCircle2],
            ].map(([title, body, Icon]) => {
              const ItemIcon = Icon as typeof ShieldCheck;
              return <article key={String(title)} className="rounded-[18px] border border-[#E7DCCB] bg-white p-6"><ItemIcon className="h-6 w-6 text-[#2A6147]" /><h2 className="mt-4 text-xl font-bold">{String(title)}</h2><p className="mt-2 text-sm leading-6 text-[#6E756E]">{String(body)}</p></article>;
            })}
          </div>
        ) : variant === "help" ? (
          <div className="mx-auto max-w-[900px] space-y-3">
            {faqs.map(([question, answer], index) => <details key={question} open={index === 0} className="rounded-[16px] border border-[#E7DCCB] bg-white px-5 py-4"><summary className="cursor-pointer font-bold text-[#10251F]">{question}</summary><p className="mt-3 text-sm leading-6 text-[#6E756E]">{answer}</p></details>)}
          </div>
        ) : (
          <div>
            <div className="mb-8 max-w-2xl"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#C2724E]">Publishing workflow</p><h2 className="mt-2 font-display text-3xl font-medium">From research to a public profile</h2></div>
            <div className="grid gap-5 md:grid-cols-2">
              {verificationSteps.map(([title, body, Icon], index) => {
                const ItemIcon = Icon as typeof ShieldCheck;
                return <article key={String(title)} className="rounded-[18px] border border-[#E7DCCB] bg-white p-6"><div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#E4F0E6]"><ItemIcon className="h-5 w-5 text-[#1F7A5A]" /></span><span className="text-xs font-bold text-[#8A8F89]">0{index + 1}</span></div><h3 className="mt-5 text-xl font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-[#6E756E]">{String(body)}</p></article>;
              })}
            </div>
          </div>
        )}

        <div className="mt-12 rounded-[22px] bg-[#123C32] p-8 text-white md:flex md:items-center md:justify-between">
          <div><h2 className="font-display text-3xl font-medium text-white">Need current availability?</h2><p className="mt-2 text-sm leading-6 text-[#D2E0D7]">Published data is the starting point. SocietyFlats can help verify the next practical step.</p></div>
          <Link to="/search" className="mt-5 inline-flex items-center rounded-[12px] bg-[#C2724E] px-5 py-3 text-sm font-bold text-white md:mt-0">Start society search <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </div>
      </section>
    </main>
  );
}
