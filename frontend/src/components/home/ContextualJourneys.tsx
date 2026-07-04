import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  Calculator,
  Globe2,
  MapPinned,
  MessageCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

type LinkItem = readonly [string, string, string, typeof Sparkles];

function TextLink({ item }: { item: LinkItem }) {
  const [label, detail, href, Icon] = item;
  return (
    <Link to={href} className="group flex items-center gap-3 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2FA] text-[#3156A3]"><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold text-[#1D2939]">{label}</span>
        <span className="block truncate text-[11.5px] text-[#7A8290]">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-[#B4975A] transition group-hover:translate-x-1" />
    </Link>
  );
}

export function DecisionGuideStrip({ mobile = false }: { mobile?: boolean }) {
  const links = [
    ["AI Advisor", "Build a grounded shortlist", "/ai-advisor", Sparkles],
    ["Chat", "Ask a follow-up", "/chat", MessageCircle],
    ["Compare", "See differences clearly", "/compare", Scale],
    ["Recommendations", "Match priorities to societies", "/recommendations", Bot],
  ] as const;
  return (
    <section className={`${mobile ? "mt-[26px] px-5 py-6" : "px-9 py-8"} rounded-[22px] border border-[#D8DFEC] bg-[#F7F9FD]`}>
      <div className={mobile ? "" : "grid grid-cols-[.78fr_1.35fr] items-center gap-12"}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8B6B32]">Decision support</p>
          <h2 className={`${mobile ? "mt-2 text-[25px]" : "mt-2 text-[32px]"} font-display font-medium leading-none text-[#111827]`}>A shortlist, not a sales pitch.</h2>
          <p className="mt-3 text-[13px] leading-5 text-[#667085]">Use AI to narrow the field, then compare the details yourself.</p>
        </div>
        <nav className={`${mobile ? "mt-4 divide-y divide-[#D8DFEC]" : "grid grid-cols-2 gap-x-8"}`}>{links.map((item) => <TextLink key={item[0]} item={item} />)}</nav>
      </div>
    </section>
  );
}

export function PropertyToolsStrip({ mobile = false }: { mobile?: boolean }) {
  const links = [
    ["Explore on map", "See location and nearby context", "/maps", MapPinned],
    ["Builder floors", "A dedicated Gurgaon floor journey", "/builder-floors", Building2],
    ["Investment calculator", "Model ownership scenarios", "/investment-calculator", Calculator],
  ] as const;
  return (
    <section className={`${mobile ? "mt-[26px]" : "mt-10"} border-y border-[#DDD7CC] py-4`}>
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#8B6B32]">Useful at this stage</p>
      <div className={`${mobile ? "divide-y divide-[#DDD7CC]" : "grid grid-cols-3 divide-x divide-[#DDD7CC]"}`}>
        {links.map((item, index) => <div key={item[0]} className={mobile ? "" : index === 0 ? "pr-7" : index === 2 ? "pl-7" : "px-7"}><TextLink item={item} /></div>)}
      </div>
    </section>
  );
}

export function SpecialistServicesStrip({ mobile = false }: { mobile?: boolean }) {
  const links = [
    ["NRI desk", "For families and owners abroad", "/nri-services", Globe2],
    ["Builder & RWA", "Manage a verified society presence", "/builder-portal", ShieldCheck],
    ["Referral partner", "Track qualified introductions", "/referrals", UsersRound],
    ["Broker partner", "Work with society-specific demand", "/broker-crm", BriefcaseBusiness],
  ] as const;
  return (
    <section className={`${mobile ? "mt-[26px] p-5" : "p-9"} rounded-[22px] border border-[#DDD7CC] bg-white`}>
      <div className={mobile ? "" : "grid grid-cols-[.7fr_1.4fr] gap-12"}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8B6B32]">Specialist services</p>
          <h2 className={`${mobile ? "mt-2 text-[25px]" : "mt-2 text-[32px]"} font-display font-medium leading-none text-[#111827]`}>The right expert at the right moment.</h2>
          <p className="mt-3 text-[13px] leading-5 text-[#667085]">Dedicated paths when a standard home search is not enough.</p>
        </div>
        <nav className={`${mobile ? "mt-4 divide-y divide-[#DDD7CC]" : "grid grid-cols-2 gap-x-9"}`}>{links.map((item) => <TextLink key={item[0]} item={item} />)}</nav>
      </div>
    </section>
  );
}
