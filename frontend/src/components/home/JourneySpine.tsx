import { Link } from "react-router-dom";
import { ArrowRight, Building2, Check, Globe2, Home, UsersRound } from "lucide-react";

const ownershipServices = [
  "Rental and resale coordination",
  "Local property checks",
  "Society and tenant context",
  "Human follow-up in Gurgaon",
];

const partnerRoutes = [
  {
    label: "Owners",
    detail: "List a rental or resale home for review",
    href: "/sell",
    icon: Home,
  },
  {
    label: "RWA teams",
    detail: "Claim the society page and publish updates",
    href: "/rwa",
    icon: UsersRound,
  },
  {
    label: "Builders",
    detail: "Present verified projects and floors",
    href: "/builder-portal",
    icon: Building2,
  },
  {
    label: "Brokers & referrals",
    detail: "Route verified supply and introductions",
    href: "/broker-crm",
    icon: Globe2,
  },
];

export function JourneySpine() {
  return (
    <section className="mx-auto max-w-[1360px] px-5 py-10 lg:px-10 lg:py-14">
      <div className="overflow-hidden rounded-[28px] border border-[#D8DFEC] bg-[#F3F6FC]">
        <div className="grid lg:grid-cols-[1.08fr_.92fr]">
          <div className="p-6 lg:p-10">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#3156A3]">For owners living abroad</p>
            <h2 className="mt-3 max-w-[650px] font-display text-[35px] font-medium leading-[1.02] tracking-[-0.025em] text-[#101828] lg:text-[52px]">
              Gurgaon ownership, managed with someone on the ground.
            </h2>
            <p className="mt-4 max-w-[650px] text-[14px] leading-7 text-[#667085] lg:text-[16px]">
              The NRI desk connects society intelligence with practical rent-out, resale and local coordination—so overseas owners have a clear route from question to action.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              {ownershipServices.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 text-[12.5px] font-bold text-[#344054]">
                  <Check className="h-4 w-4 rounded-full bg-white p-0.5 text-[#3156A3]" />
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/nri-services" className="inline-flex items-center gap-2 rounded-full bg-[#233B6E] px-5 py-3 text-[13px] font-black text-white">
                Explore NRI services <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/nri" className="inline-flex items-center gap-2 rounded-full border border-[#C7D0E1] bg-white px-5 py-3 text-[13px] font-black text-[#233B6E]">
                Start an NRI enquiry
              </Link>
            </div>
          </div>

          <div className="border-t border-[#D8DFEC] bg-white/70 p-6 lg:border-l lg:border-t-0 lg:p-10">
            <p className="font-display text-[23px] font-medium text-[#101828]">Property pathways</p>
            <p className="mt-1 text-[12.5px] leading-5 text-[#667085]">Useful routes for the people who maintain Gurgaon’s property ecosystem.</p>
            <div className="mt-5 divide-y divide-[#D8DFEC] border-y border-[#D8DFEC]">
              {partnerRoutes.map((route) => (
                <Link key={route.label} to={route.href} className="group flex items-center gap-4 py-4">
                  <route.icon className="h-5 w-5 shrink-0 text-[#3156A3]" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-black text-[#1D2939]">{route.label}</span>
                    <span className="mt-0.5 block text-[11.5px] text-[#667085]">{route.detail}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#98A2B3] transition group-hover:translate-x-1 group-hover:text-[#3156A3]" />
                </Link>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">
              <span>Admin reviewed</span>
              <span>Private details stay private</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
