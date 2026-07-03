import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  Calculator,
  CheckCircle2,
  Compass,
  Globe2,
  Home,
  KeyRound,
  MapPinned,
  MessageCircle,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { setPublicSeo } from "@/lib/seo";

type Module = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: "pine" | "clay" | "sage" | "ink";
  label?: string;
};

const journeys = [
  { id: "discover", label: "Find a home", icon: Search, title: "Start with the right society", body: "Search verified societies first, then request current rental or resale availability.", href: "/search?tab=societies" },
  { id: "decide", label: "Make a decision", icon: Scale, title: "Compare before you visit", body: "Put societies side by side for scores, commute, amenities and practical market context.", href: "/compare" },
  { id: "assist", label: "Ask for help", icon: Sparkles, title: "Build a grounded shortlist", body: "Tell the AI Advisor your budget, commute and lifestyle. Recommendations stay tied to published data.", href: "/ai-advisor" },
  { id: "partner", label: "Work with us", icon: UsersRound, title: "Owners, brokers and partners", body: "List a home, manage verified inventory or join the SocietyFlats referral network.", href: "/sell" },
];

const intelligence: Module[] = [
  { title: "AI Advisor", description: "A guided shortlist grounded in published SocietyFlats data.", href: "/ai-advisor", icon: Sparkles, tone: "clay", label: "Signature" },
  { title: "AI Chat", description: "Ask follow-up questions and keep your home search moving.", href: "/chat", icon: MessageCircle, tone: "pine" },
  { title: "Recommendations", description: "Turn your priorities into a focused set of societies.", href: "/recommendations", icon: Bot, tone: "sage" },
  { title: "Map Intelligence", description: "Explore published societies by location and nearby context.", href: "/maps", icon: MapPinned, tone: "ink" },
  { title: "Compare Societies", description: "See differences clearly before choosing where to visit.", href: "/compare", icon: Scale, tone: "pine" },
  { title: "Market Insights", description: "Read decision-focused Gurgaon property intelligence.", href: "/insights", icon: BarChart3, tone: "sage" },
];

const homes: Module[] = [
  { title: "Verified Societies", description: "Browse reviewed society profiles across Gurgaon.", href: "/societies", icon: Building2, tone: "pine" },
  { title: "Homes for Rent", description: "Request current rental availability without fake cards.", href: "/search?tab=rent", icon: KeyRound, tone: "sage" },
  { title: "Homes to Buy", description: "Explore society-first resale and purchase requirements.", href: "/search?tab=buy", icon: Home, tone: "clay" },
  { title: "List Your Flat", description: "Send a rental or resale requirement for verification.", href: "/sell", icon: BadgeIndianRupee, tone: "clay", label: "For owners" },
  { title: "Builder Floors", description: "Explore Gurgaon builder-floor opportunities and guidance.", href: "/builder-floors", icon: Building2, tone: "ink" },
  { title: "Investment Calculator", description: "Model practical return and ownership scenarios.", href: "/investment-calculator", icon: Calculator, tone: "sage" },
];

const specialist: Module[] = [
  { title: "NRI Services", description: "A guided Gurgaon property desk for owners and families abroad.", href: "/nri-services", icon: Globe2, tone: "ink", label: "Specialist desk" },
  { title: "Builder & RWA", description: "Claim a society presence and manage verified public updates.", href: "/builder-portal", icon: ShieldCheck, tone: "pine" },
  { title: "Referral Partner", description: "Track qualified referrals through a protected partner account.", href: "/referrals", icon: UsersRound, tone: "clay" },
  { title: "Broker Partner", description: "Work with society-specific enquiries and verified inventory.", href: "/broker-crm", icon: BriefcaseBusiness, tone: "sage" },
];

const toneClasses = {
  pine: "bg-[#E5F0E9] text-[#15523F]",
  clay: "bg-[#F6E7DE] text-[#9E5838]",
  sage: "bg-[#EEF3EA] text-[#4A624D]",
  ink: "bg-[#E3EAE7] text-[#10251F]",
};

function ModuleCard({ module, compact = false }: { module: Module; compact?: boolean }) {
  const Icon = module.icon;
  return (
    <Link
      to={module.href}
      className={`group flex h-full flex-col border border-[#E7DCCB] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#BFD0C4] hover:shadow-[0_22px_60px_-35px_rgba(16,37,31,.5)] ${compact ? "rounded-[20px] p-4" : "rounded-[26px] p-5 md:p-6"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`flex items-center justify-center rounded-[16px] ${toneClasses[module.tone]} ${compact ? "h-11 w-11" : "h-12 w-12"}`}>
          <Icon className="h-5 w-5" />
        </span>
        {module.label ? <span className="rounded-full bg-[#F8F3EA] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#6E756E]">{module.label}</span> : null}
      </div>
      <h3 className={`${compact ? "mt-4 text-[16px]" : "mt-5 text-[19px]"} font-sans font-extrabold tracking-[-0.02em] text-[#10251F]`}>{module.title}</h3>
      <p className={`${compact ? "mt-1 text-[12px] leading-[1.5]" : "mt-2 text-sm leading-6"} flex-1 text-[#6E756E]`}>{module.description}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#2A6147]">Open <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" /></span>
    </Link>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return <div className="mb-5 md:mb-7"><p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#B86F4B]">{eyebrow}</p><h2 className="mt-2 font-display text-[30px] font-medium leading-none text-[#10251F] md:text-[40px]">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6E756E] md:text-[15px]">{body}</p></div>;
}

export function AppHubPage() {
  const [activeJourney, setActiveJourney] = useState("discover");
  const selected = useMemo(() => journeys.find((journey) => journey.id === activeJourney) || journeys[0], [activeJourney]);

  useEffect(() => {
    setPublicSeo(
      "Explore SocietyFlats — AI, Maps, NRI, Builder & Home Services",
      "Access every SocietyFlats module in one place: verified society search, AI Advisor, chat, maps, compare, builder floors, NRI services, RWA tools and partner programs.",
      { canonical: "/explore", jsonLd: { "@context": "https://schema.org", "@type": "CollectionPage", name: "Explore SocietyFlats", url: "https://www.societyflats.com/explore" } },
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F3EA] pb-10 md:pb-20">
      <section className="relative overflow-hidden bg-[#10251F] text-white">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[#C2724E]/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-[#64A07F]/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-[1360px] gap-8 px-5 py-10 md:px-10 md:py-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C4D8CC]"><Compass className="h-3.5 w-3.5" /> SocietyFlats experience</div>
            <h1 className="mt-5 max-w-3xl font-display text-[42px] font-medium leading-[.96] tracking-[-0.04em] !text-white md:text-[64px]">One app for every Gurgaon home decision.</h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[#C4D3CA] md:text-[17px]">Search verified societies, ask AI, compare options, explore maps or reach a specialist desk—without losing the context behind your decision.</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link to="/search?tab=societies" className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#C2724E] px-6 py-3.5 text-sm font-extrabold text-white">Find my society <ArrowRight className="h-4 w-4" /></Link><Link to="/ai-advisor" className="inline-flex items-center justify-center gap-2 rounded-[14px] border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-extrabold text-white"><Sparkles className="h-4 w-4" /> Ask SocietyFlats AI</Link></div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#B8C9C0]">{["Verified data first", "No fabricated inventory", "Human help when needed"].map((item) => <span key={item} className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#8DC5A7]" />{item}</span>)}</div>
          </div>

          <div className="rounded-[28px] border border-white/15 bg-white/[.07] p-3 shadow-[0_40px_90px_-45px_rgba(0,0,0,.8)] backdrop-blur md:p-4">
            <div className="rounded-[22px] bg-[#FFF9EF] p-5 text-[#25302B] md:p-6">
              <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#123C32] text-white"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-extrabold">SocietyFlats Assistant</p><p className="text-[11px] text-[#6E756E]">Grounded in published society data</p></div></div><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /></div>
              <div className="mt-6 rounded-[16px] bg-white p-4 text-sm leading-6 shadow-sm">“I need a family-friendly society under ₹80k, within a practical commute of Cyber City.”</div>
              <div className="ml-6 mt-3 rounded-[16px] bg-[#E5F0E9] p-4 text-sm leading-6 text-[#21493C]">I’ll compare published societies by location, lifestyle and rent context—and clearly mark anything that still needs confirmation.</div>
              <div className="mt-5 grid grid-cols-3 gap-2">{[["AI", "Shortlist"], ["Maps", "Explore"], ["Compare", "Decide"]].map(([title, label]) => <div key={title} className="rounded-[13px] border border-[#E7DCCB] bg-[#FFFCF6] p-3"><p className="text-xs font-extrabold text-[#123C32]">{title}</p><p className="mt-1 text-[10px] text-[#6E756E]">{label}</p></div>)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-9 md:px-10 md:py-14">
        <div className="rounded-[28px] border border-[#E7DCCB] bg-[#FFFCF6] p-4 md:p-6">
          <p className="px-1 text-[11px] font-black uppercase tracking-[0.18em] text-[#B86F4B]">Start where you are</p>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:grid md:grid-cols-4">{journeys.map((journey) => { const Icon=journey.icon; const active=journey.id===activeJourney; return <button key={journey.id} type="button" onClick={() => setActiveJourney(journey.id)} className={`flex min-w-[145px] items-center gap-2 rounded-[14px] px-3 py-3 text-left text-xs font-extrabold transition md:min-w-0 ${active ? "bg-[#123C32] text-white" : "bg-white text-[#405049] hover:bg-[#EEF5F1]"}`}><Icon className="h-4 w-4" />{journey.label}</button>; })}</div>
          <div className="mt-4 grid gap-4 rounded-[20px] bg-white p-5 md:grid-cols-[1fr_auto] md:items-center md:p-7"><div><h2 className="font-sans text-xl font-extrabold tracking-[-0.02em] text-[#10251F] md:text-2xl">{selected.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#6E756E]">{selected.body}</p></div><Link to={selected.href} className="inline-flex items-center justify-center gap-2 rounded-[13px] bg-[#C2724E] px-5 py-3 text-sm font-extrabold text-white">Continue <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <section className="mx-auto max-w-[1360px] px-5 py-7 md:px-10 md:py-10"><SectionHeading eyebrow="Intelligence layer" title="Your decision tools, together." body="Move from a broad question to a confident shortlist without rebuilding your context on every screen." /><div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">{intelligence.map((module) => <ModuleCard key={module.title} module={module} compact />)}</div></section>

      <section className="mx-auto max-w-[1360px] px-5 py-10 md:px-10 md:py-14"><div className="rounded-[32px] bg-[#EFE8DC] p-5 md:p-10"><SectionHeading eyebrow="Homes & ownership" title="Rent, buy, sell or evaluate." body="Society-first discovery for users, plus clear entry points for owners and Gurgaon-specific home formats." /><div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">{homes.map((module) => <ModuleCard key={module.title} module={module} compact />)}</div></div></section>

      <section className="mx-auto max-w-[1360px] px-5 py-7 md:px-10 md:py-12"><SectionHeading eyebrow="Specialist journeys" title="The right desk when the journey gets complex." body="Dedicated flows for NRI owners, builders and RWAs, referral partners and professional brokers." /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{specialist.map((module) => <ModuleCard key={module.title} module={module} />)}</div></section>

      <section className="mx-auto max-w-[1360px] px-5 py-10 md:px-10"><div className="grid gap-6 overflow-hidden rounded-[30px] bg-[#123C32] p-6 text-white md:grid-cols-[1fr_auto] md:items-center md:p-10"><div><p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#8DC5A7]">Your next move</p><h2 className="mt-2 font-display text-[32px] font-medium leading-none !text-white md:text-[42px]">Not sure which module to open?</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-[#C4D3CA]">Start with the AI Advisor. It can move you toward search, maps, comparison or human assistance based on what you need.</p></div><Link to="/ai-advisor" className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#C2724E] px-6 py-4 text-sm font-extrabold text-white"><Sparkles className="h-4 w-4" /> Start with AI</Link></div></section>
    </div>
  );
}
