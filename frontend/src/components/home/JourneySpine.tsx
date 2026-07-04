// R1b Journey spine: the home-buying journey as the organising spine of the
// homepage. Each of the four stages surfaces the exact modules used at that
// moment, so every platform feature is discovered in context rather than as a
// feature grid. Below it, an audience band routes NRI/owner/broker/partner
// visitors to their entry module. All routes are live; nothing is a mockup.
import { Link } from "react-router-dom";
import {
  Search, Sparkles, MapPin, ShieldCheck, Layers, Scale, Calculator, BarChart3,
  CalendarCheck, MessageCircle, Landmark, Gift, Globe2, Briefcase, BadgeIndianRupee,
  ArrowRight,
} from "lucide-react";

type Step = {
  n: string;
  title: string;
  line: string;
  modules: Array<{ label: string; href: string; icon: any }>;
};

const steps: Step[] = [
  {
    n: "01",
    title: "Discover",
    line: "Start where buyers and tenants actually search — by society, sector or a plain question.",
    modules: [
      { label: "Search societies", href: "/search?tab=societies", icon: Search },
      { label: "Ask the AI Advisor", href: "/ai-advisor", icon: Sparkles },
      { label: "Explore the live map", href: "/maps", icon: MapPin },
      { label: "Browse builder floors", href: "/builder-floors", icon: Layers },
    ],
  },
  {
    n: "02",
    title: "Verify",
    line: "Every society is reviewed field by field — scores, sources and a visible confidence label. If we can't confirm it, we say so.",
    modules: [
      { label: "See how we verify", href: "/trust", icon: ShieldCheck },
      { label: "Read market insights", href: "/insights", icon: BarChart3 },
    ],
  },
  {
    n: "03",
    title: "Decide",
    line: "Weigh two or three societies side by side and run the numbers before you ever step out.",
    modules: [
      { label: "Compare societies", href: "/compare", icon: Scale },
      { label: "Investment calculator", href: "/investment-calculator", icon: Calculator },
    ],
  },
  {
    n: "04",
    title: "Move in",
    line: "Request a verified visit, get a human on chat, and stay connected to your society after you move.",
    modules: [
      { label: "Request a site visit", href: "/search?tab=societies", icon: CalendarCheck },
      { label: "Talk on live chat", href: "/chat", icon: MessageCircle },
      { label: "RWA & builder portal", href: "/builder-portal", icon: Landmark },
    ],
  },
];

const audiences = [
  { label: "Buying from abroad", hint: "NRI desk — concierge, no guarantees", href: "/nri-services", icon: Globe2 },
  { label: "Own a flat here", hint: "List it to verified buyers and tenants", href: "/sell", icon: BadgeIndianRupee },
  { label: "Broker with inventory", hint: "Partner CRM for verified stock", href: "/broker-crm", icon: Briefcase },
  { label: "Refer and earn", hint: "Reward on every conversion", href: "/referrals", icon: Gift },
];

export function JourneySpine() {
  return (
    <section className="mx-auto max-w-[1360px] px-5 py-10 lg:px-10 lg:py-16">
      <div className="rounded-[26px] bg-[#0B241D] px-5 py-8 lg:px-12 lg:py-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#D8B56C]">The SocietyFlats way</p>
        <h2 className="mt-2 max-w-[640px] font-display text-[26px] font-medium leading-tight text-[#F4EFE4] lg:text-[34px]">
          One clean path from first search to move-in day.
        </h2>
        <p className="mt-2 max-w-[560px] text-[13.5px] leading-6 text-[#C9C2AF]">
          Everything the platform does shows up exactly when you need it — no feature hunting.
        </p>

        <ol className="mt-8 grid gap-4 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className="rounded-[18px] border border-[#1C3A31] bg-[#12332A] p-4">
              <div className="flex items-center gap-2">
                <span className="font-display text-[22px] font-medium text-[#D8B56C]">{step.n}</span>
                <span className="text-[15px] font-bold text-[#F4EFE4]">{step.title}</span>
              </div>
              <p className="mt-2 text-[12.5px] leading-5 text-[#C9C2AF]">{step.line}</p>
              <div className="mt-3 space-y-1.5">
                {step.modules.map((mod) => (
                  <Link
                    key={mod.href + mod.label}
                    to={mod.href}
                    className="group flex items-center gap-2 rounded-xl bg-[#0B241D] px-2.5 py-2 text-[12.5px] font-semibold text-[#F4EFE4] transition hover:bg-[#0F2C24]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#1C3A31] text-[#D8B56C]"><mod.icon className="h-3.5 w-3.5" /></span>
                    <span className="min-w-0 flex-1 truncate">{mod.label}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#4E6A5F] transition group-hover:text-[#D8B56C]" />
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {audiences.map((aud) => (
          <Link
            key={aud.href}
            to={aud.href}
            className="group flex items-start gap-3 rounded-[18px] border border-[#E7DCCB] bg-white p-4 transition hover:border-[#D8B56C]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-[#0B241D] text-[#D8B56C]"><aud.icon className="h-5 w-5" /></span>
            <span className="min-w-0">
              <span className="block text-[14px] font-bold text-[#25302B]">{aud.label}</span>
              <span className="mt-0.5 block text-[12px] leading-4 text-[#8A8478]">{aud.hint}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
