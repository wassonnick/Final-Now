import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeIndianRupee,
  BarChart3,
  Briefcase,
  Calculator,
  CalendarCheck,
  Gift,
  Globe2,
  Landmark,
  Layers,
  MapPin,
  MessageCircle,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Step = {
  n: string;
  title: string;
  line: string;
  modules: Array<{ label: string; href: string; icon: typeof Search }>;
};

const steps: Step[] = [
  {
    n: "01",
    title: "Discover",
    line: "Search by society, sector, builder or simply describe the home you need.",
    modules: [
      { label: "Search societies", href: "/search?tab=societies", icon: Search },
      { label: "Ask AI Advisor", href: "/ai-advisor", icon: Sparkles },
      { label: "Explore the map", href: "/maps", icon: MapPin },
      { label: "Builder floors", href: "/builder-floors", icon: Layers },
    ],
  },
  {
    n: "02",
    title: "Verify",
    line: "Read the evidence behind each profile before a property enters the picture.",
    modules: [
      { label: "How verification works", href: "/trust", icon: ShieldCheck },
      { label: "Market insights", href: "/insights", icon: BarChart3 },
    ],
  },
  {
    n: "03",
    title: "Decide",
    line: "Compare the strongest options and understand the numbers without the sales noise.",
    modules: [
      { label: "Compare societies", href: "/compare", icon: Scale },
      { label: "Investment calculator", href: "/investment-calculator", icon: Calculator },
    ],
  },
  {
    n: "04",
    title: "Act",
    line: "Request current availability, plan a visit or speak with the right specialist.",
    modules: [
      { label: "Plan a site visit", href: "/search?tab=societies", icon: CalendarCheck },
      { label: "Live chat", href: "/chat", icon: MessageCircle },
      { label: "Builder & RWA", href: "/builder-portal", icon: Landmark },
    ],
  },
];

const audiences = [
  { label: "NRI management & sales", hint: "Buy, sell or rent out from abroad", href: "/nri-services", icon: Globe2 },
  { label: "List your flat", hint: "Reach verified demand", href: "/sell", icon: BadgeIndianRupee },
  { label: "Broker partnership", hint: "Society-specific enquiries", href: "/broker-crm", icon: Briefcase },
  { label: "Referral partner", hint: "Track qualified introductions", href: "/referrals", icon: Gift },
];

export function JourneySpine() {
  return (
    <section className="mx-auto max-w-[1360px] px-5 py-9 lg:px-10 lg:py-12">
      <div className="grid gap-5 border-b border-[#DDD7CC] pb-7 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8B6B32]">A clearer property journey</p>
          <h2 className="mt-3 max-w-[560px] font-display text-[34px] font-medium leading-[1.03] text-[#111827] lg:text-[48px]">
            Everything you need, in the order you need it.
          </h2>
        </div>
        <p className="max-w-[650px] text-[15px] leading-7 text-[#667085] lg:justify-self-end lg:text-[17px]">
          SocietyFlats is organised around the decision—not around a list of products. Start with discovery, verify the facts, compare confidently and then speak to a human.
        </p>
      </div>

      <ol className="divide-y divide-[#DDD7CC] lg:grid lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {steps.map((step, index) => (
          <li key={step.n} className={`py-6 lg:min-h-[270px] lg:px-7 lg:py-7 ${index === 0 ? "lg:pl-0" : ""} ${index === steps.length - 1 ? "lg:pr-0" : ""}`}>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-[18px] text-[#B4975A]">{step.n}</span>
              <h3 className="font-display text-[27px] font-medium text-[#111827]">{step.title}</h3>
            </div>
            <p className="mt-3 min-h-[60px] text-[13.5px] leading-6 text-[#667085]">{step.line}</p>
            <div className="mt-5 space-y-1">
              {step.modules.map((mod) => (
                <Link key={mod.href + mod.label} to={mod.href} className="group flex items-center gap-2.5 py-2 text-[13px] font-semibold text-[#344054] transition hover:text-[#3156A3]">
                  <mod.icon className="h-4 w-4 text-[#8B6B32]" />
                  <span>{mod.label}</span>
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-2 border-y border-[#DDD7CC] bg-white/65 px-0 py-4 lg:flex lg:items-center lg:gap-8 lg:px-5">
        <p className="mb-2 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B6B32] lg:mb-0">Specialist paths</p>
        <div className="grid flex-1 gap-1 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((aud) => (
            <Link key={aud.href} to={aud.href} className="group flex items-center gap-3 px-0 py-2.5 lg:px-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF2FA] text-[#3156A3]"><aud.icon className="h-4 w-4" /></span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-bold text-[#1D2939]">{aud.label}</span>
                <span className="block text-[11.5px] text-[#7A8290]">{aud.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
