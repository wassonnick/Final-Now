import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Bot, BriefcaseBusiness, Building2, Calculator, Globe2, MapPinned, MessageCircle, Scale, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

function TextLink({ href, label, detail, icon: Icon, inverse = false }: { href: string; label: string; detail?: string; icon: LucideIcon; inverse?: boolean }) {
  return <Link to={href} className={`group flex min-w-0 items-center gap-3 py-3 ${inverse ? "text-white" : "text-[#25302B]"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${inverse ? "bg-white/10 text-[#A9CFB8]" : "bg-[#E5F0E9] text-[#15523F]"}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold">{label}</span>{detail ? <span className={`mt-0.5 block text-[11px] leading-4 ${inverse ? "text-[#B8C9C0]" : "text-[#6E756E]"}`}>{detail}</span> : null}</span><ArrowRight className={`h-4 w-4 shrink-0 transition group-hover:translate-x-1 ${inverse ? "text-[#8DC5A7]" : "text-[#2A6147]"}`} /></Link>;
}

export function DecisionGuideStrip({ mobile = false }: { mobile?: boolean }) {
  const links = [
    ["AI Advisor", "Build a grounded shortlist", "/ai-advisor", Sparkles],
    ["Chat", "Ask a follow-up", "/chat", MessageCircle],
    ["Compare", "See differences clearly", "/compare", Scale],
    ["Recommendations", "Match priorities to societies", "/recommendations", Bot],
  ] as const;
  return <section className={`${mobile ? "mt-[26px] rounded-[20px] px-5 py-5" : "rounded-[24px] px-8 py-7"} bg-[#123C32] text-white`}><div className={`${mobile ? "" : "grid grid-cols-[.85fr_1.6fr] items-center gap-10"}`}><div><p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#8DC5A7]">Decision support</p><h2 className={`${mobile ? "mt-2 text-[23px]" : "mt-2 text-[30px]"} font-display font-medium leading-none !text-white`}>Need help narrowing it down?</h2><p className="mt-2 text-[13px] leading-5 text-[#C4D3CA]">Move from a question to a shortlist, then compare before you plan a visit.</p></div><nav className={`${mobile ? "mt-4 divide-y divide-white/10" : "grid grid-cols-2 gap-x-7 divide-y-0"}`}>{links.map(([label,detail,href,Icon]) => <TextLink key={label} href={href} label={label} detail={detail} icon={Icon} inverse />)}</nav></div></section>;
}

export function PropertyToolsStrip({ mobile = false }: { mobile?: boolean }) {
  const links = [
    ["Explore on map", "Understand society location and nearby context.", "/maps", MapPinned],
    ["Builder floors", "A dedicated Gurgaon builder-floor journey.", "/builder-floors", Building2],
    ["Investment calculator", "Model return and ownership scenarios.", "/investment-calculator", Calculator],
  ] as const;
  return <section className={`${mobile ? "mt-[26px]" : "mt-10"} border-y border-[#E7DCCB] py-4`}><p className="mb-1 text-[10px] font-black uppercase tracking-[0.17em] text-[#B86F4B]">Useful at this stage</p><div className={`${mobile ? "divide-y divide-[#E7DCCB]" : "grid grid-cols-3 divide-x divide-[#E7DCCB]"}`}>{links.map(([label,detail,href,Icon],index) => <div key={label} className={mobile ? "" : index===0?"pr-6":index===2?"pl-6":"px-6"}><TextLink href={href} label={label} detail={detail} icon={Icon} /></div>)}</div></section>;
}

export function SpecialistServicesStrip({ mobile = false }: { mobile?: boolean }) {
  const links = [
    ["NRI desk", "For families and owners abroad", "/nri-services", Globe2],
    ["Builder & RWA", "Verified society presence", "/builder-portal", ShieldCheck],
    ["Referral partner", "Track qualified referrals", "/referrals", UsersRound],
    ["Broker partner", "Society-specific enquiries", "/broker-crm", BriefcaseBusiness],
  ] as const;
  return <section className={`${mobile ? "mt-[26px] rounded-[20px] p-5" : "rounded-[24px] p-8"} border border-[#E7DCCB] bg-[#FFF9EF]`}><div className={`${mobile ? "" : "grid grid-cols-[.72fr_1.55fr] gap-10"}`}><div><p className="text-[10px] font-black uppercase tracking-[0.17em] text-[#B86F4B]">Specialist services</p><h2 className={`${mobile ? "mt-2 text-[23px]" : "mt-2 text-[30px]"} font-display font-medium leading-none text-[#10251F]`}>The right desk for the next step.</h2><p className="mt-2 text-[13px] leading-5 text-[#6E756E]">Dedicated journeys when a standard home search is not enough.</p></div><nav className={`${mobile ? "mt-4 divide-y divide-[#E7DCCB]" : "grid grid-cols-2 gap-x-8"}`}>{links.map(([label,detail,href,Icon]) => <TextLink key={label} href={href} label={label} detail={detail} icon={Icon} />)}</nav></div></section>;
}
