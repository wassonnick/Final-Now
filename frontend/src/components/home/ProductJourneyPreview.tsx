import { Link } from "react-router-dom";
import { ArrowRight, Building2, Globe2, MapPinned, MessageCircle, Scale, ShieldCheck, Sparkles } from "lucide-react";

const modules = [
  ["AI Advisor", "/ai-advisor", Sparkles, "bg-[#F6E7DE] text-[#9E5838]"],
  ["Chat", "/chat", MessageCircle, "bg-[#E5F0E9] text-[#15523F]"],
  ["Maps", "/maps", MapPinned, "bg-[#E3EAE7] text-[#10251F]"],
  ["Compare", "/compare", Scale, "bg-[#EEF3EA] text-[#4A624D]"],
  ["Builder Floors", "/builder-floors", Building2, "bg-[#E5F0E9] text-[#15523F]"],
  ["Builder & RWA", "/builder-portal", ShieldCheck, "bg-[#E3EAE7] text-[#10251F]"],
  ["NRI Desk", "/nri-services", Globe2, "bg-[#EEF3EA] text-[#4A624D]"],
  ["Referral Partner", "/referrals", ArrowRight, "bg-[#F6E7DE] text-[#9E5838]"],
] as const;

export function ProductJourneyPreview() {
  return <section className="mx-auto max-w-[1360px] px-5 pt-7 lg:px-10 lg:pt-12"><div className="overflow-hidden rounded-[26px] border border-[#E7DCCB] bg-[#FFFCF6] p-5 md:p-7"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#B86F4B]">Everything in one place</p><h2 className="mt-2 font-sans text-[22px] font-extrabold tracking-[-0.03em] text-[#10251F] md:text-[28px]">Your SocietyFlats app</h2><p className="mt-1 max-w-xl text-sm text-[#6E756E]">AI, maps, specialist desks and partner tools—connected around the same society-first journey.</p></div><Link to="/explore" className="hidden items-center gap-2 text-sm font-extrabold text-[#2A6147] md:inline-flex">Explore all <ArrowRight className="h-4 w-4" /></Link></div><div className="mt-5 grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-3">{modules.map(([label,href,Icon,tone]) => <Link key={label} to={href} className="group flex min-w-0 flex-col items-center rounded-[17px] border border-[#E7DCCB] bg-white px-2 py-3 text-center transition hover:-translate-y-0.5 hover:border-[#BFD0C4]"><span className={`flex h-10 w-10 items-center justify-center rounded-[13px] ${tone}`}><Icon className="h-4 w-4" /></span><span className="mt-2 line-clamp-2 text-[10px] font-extrabold leading-3 text-[#405049] md:text-[11px]">{label}</span></Link>)}</div><Link to="/explore" className="mt-4 flex items-center justify-center gap-2 rounded-[13px] bg-[#123C32] px-4 py-3 text-sm font-extrabold text-white md:hidden">Open all services <ArrowRight className="h-4 w-4" /></Link></div></section>;
}
