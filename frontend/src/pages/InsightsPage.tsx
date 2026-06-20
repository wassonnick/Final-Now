import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  Building2,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { setPublicSeo } from "@/lib/seo";

type InsightMode = "rent" | "buy" | "sell";

const marketRows = [
  {
    locality: "Golf Course Road",
    rent3: "₹90K – ₹2.4L",
    buy: "₹5.5Cr – ₹12Cr",
    sell: "Premium resale depth",
    demand: "Very high",
    signal: "Luxury + corporate demand",
    yield: "2.4% – 3.1%",
    momentum: "+12%",
  },
  {
    locality: "Golf Course Extension",
    rent3: "₹75K – ₹1.8L",
    buy: "₹3.2Cr – ₹8Cr",
    sell: "Strong family demand",
    demand: "High",
    signal: "Family + upgrade market",
    yield: "2.6% – 3.4%",
    momentum: "+11%",
  },
  {
    locality: "Sector 65",
    rent3: "₹70K – ₹1.6L",
    buy: "₹2.8Cr – ₹7.5Cr",
    sell: "Builder-led demand",
    demand: "High",
    signal: "M3M / premium cluster",
    yield: "2.7% – 3.5%",
    momentum: "+10%",
  },
  {
    locality: "Dwarka Expressway",
    rent3: "₹45K – ₹1.1L",
    buy: "₹1.8Cr – ₹5Cr",
    sell: "Rising supply",
    demand: "Rising",
    signal: "Infrastructure-led upside",
    yield: "2.5% – 3.3%",
    momentum: "+13%",
  },
  {
    locality: "Sohna Road",
    rent3: "₹40K – ₹90K",
    buy: "₹1.4Cr – ₹3.8Cr",
    sell: "Value-sensitive market",
    demand: "Medium",
    signal: "Affordable family demand",
    yield: "2.8% – 3.7%",
    momentum: "+8%",
  },
];

const societySignals = [
  {
    title: "Rental strength",
    text: "Societies with corporate commute, security and maintenance depth usually rent faster.",
    icon: Home,
  },
  {
    title: "Resale confidence",
    text: "Builder reputation, location and upkeep matter more than just flat size.",
    icon: Building2,
  },
  {
    title: "Owner timing",
    text: "Selling works better when live inventory is limited and society demand is visible.",
    icon: BadgeIndianRupee,
  },
];

const modeCopy: Record<InsightMode, { title: string; description: string; cta: string }> = {
  rent: {
    title: "Rent signals by Gurgaon micro-market",
    description: "Use rent ranges, demand and occupancy-style signals to shortlist tenant-friendly societies.",
    cta: "Search rentals",
  },
  buy: {
    title: "Buy / resale signals before shortlisting",
    description: "Compare resale depth, society quality and location confidence before choosing a home.",
    cta: "Search resale",
  },
  sell: {
    title: "Owner-side signals for listing timing",
    description: "Understand where demand is stronger and what buyers/tenants are likely to compare.",
    cta: "List your flat",
  },
};

function modeValue(row: (typeof marketRows)[number], mode: InsightMode) {
  if (mode === "rent") return row.rent3;
  if (mode === "buy") return row.buy;
  return row.sell;
}

function modeHref(mode: InsightMode) {
  if (mode === "rent") return "/search?tab=rent";
  if (mode === "buy") return "/search?tab=buy";
  return "/sell";
}

export function InsightsPage() {
  const [mode, setMode] = useState<InsightMode>("rent");

  useEffect(() => {
    setPublicSeo(
      "Gurgaon Market Insights | Rent Buy Sell Signals | SocietyFlats",
      "Compare Gurgaon rent, buy, resale and owner listing signals by locality and society-first market context.",
    );
    window.scrollTo(0, 0);
  }, []);

  const activeCopy = modeCopy[mode];

  const heroMetrics = useMemo(
    () => [
      ["Prime rent band", "₹75K – ₹2.4L", "Golf Course / Extension"],
      ["Resale depth", "₹2Cr – ₹12Cr", "Society and builder-led"],
      ["Demand signal", "High", "Corporate + family demand"],
      ["Owner action", "List with context", "Society-first enquiry"],
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="border-b border-blue-100 bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,0.13),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 py-8 md:py-10">
        <div className="container mx-auto">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <TrendingUp className="h-4 w-4" />
                Gurgaon market intelligence
              </span>
              <h1 className="mt-4 max-w-4xl font-display text-[36px] font-black leading-[0.98] tracking-[-0.045em] text-navy-950 md:text-[56px]">
                Rent, buy and sell signals for Gurgaon societies.
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-blue-500">
                Market insight should help users choose the right society, not just a price number. Compare micro-markets, demand and owner-side timing.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {(["rent", "buy", "sell"] as InsightMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={
                      mode === item
                        ? "rounded-full bg-blue-700 px-4 py-2 text-sm font-black capitalize text-white shadow-sm"
                        : "rounded-full border border-blue-100 bg-white px-4 py-2 text-sm font-black capitalize text-blue-700 hover:bg-blue-50"
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <aside className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Current lens</p>
              <h2 className="mt-2 font-display text-2xl font-black text-navy-950">{activeCopy.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">{activeCopy.description}</p>
              <Button asChild className="mt-5 h-11 w-full rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
                <Link to={modeHref(mode)}>
                  {activeCopy.cta} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </aside>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-6">
        <div className="grid gap-3 md:grid-cols-4">
          {heroMetrics.map(([label, value, note]) => (
            <div key={label} className="rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-blue-400">{label}</p>
              <p className="mt-1 text-2xl font-black text-navy-950">{value}</p>
              <p className="mt-1 text-xs font-semibold text-navy-500">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-blue-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Market table</p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950 md:text-[30px]">
                {activeCopy.title}
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-navy-500">
                These are practical SocietyFlats guide ranges and demand signals for shortlist decisions. Verify before negotiation.
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
              <Link to={modeHref(mode)}>
                Take action <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="rounded-l-2xl bg-[#F8FAFC] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Locality
                  </th>
                  <th className="bg-[#F8FAFC] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    {mode === "rent" ? "Rent range" : mode === "buy" ? "Resale range" : "Owner signal"}
                  </th>
                  <th className="bg-[#F8FAFC] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Demand
                  </th>
                  <th className="bg-[#F8FAFC] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Market signal
                  </th>
                  <th className="rounded-r-2xl bg-[#F8FAFC] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Momentum
                  </th>
                </tr>
              </thead>
              <tbody>
                {marketRows.map((row) => (
                  <tr key={row.locality}>
                    <td className="rounded-l-2xl bg-white p-3">
                      <p className="flex items-center gap-2 font-black text-navy-950">
                        <MapPin className="h-4 w-4 text-blue-700" />
                        {row.locality}
                      </p>
                    </td>
                    <td className="bg-white p-3 font-black text-navy-950">{modeValue(row, mode)}</td>
                    <td className="bg-white p-3">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{row.demand}</span>
                    </td>
                    <td className="bg-white p-3 text-sm font-semibold text-navy-600">{mode === "rent" ? row.signal : mode === "buy" ? row.yield : row.signal}</td>
                    <td className="rounded-r-2xl bg-white p-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {row.momentum}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[1.75rem] border border-blue-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Society-first interpretation</p>
            <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950 md:text-[30px]">
              What these signals mean for users
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {societySignals.map(({ title, text, icon: Icon }) => (
                <div key={title} className="rounded-[1.35rem] border border-blue-100 bg-[#F8FAFC] p-4">
                  <Icon className="h-5 w-5 text-blue-700" />
                  <h3 className="mt-3 font-black text-navy-950">{title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-[1.75rem] border border-blue-100 bg-navy-950 p-5 text-white shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">Need society-specific guidance?</p>
            <h2 className="mt-2 font-display text-2xl font-black">Ask AI or compare societies before deciding.</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-blue-100">
              Market ranges are only useful when linked to the actual society, commute, inventory and owner expectation.
            </p>

            <div className="mt-5 grid gap-2">
              <Button asChild className="h-11 rounded-full bg-white font-black text-navy-950 hover:bg-blue-50">
                <Link to="/ai-advisor">
                  Ask AI Advisor <Sparkles className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 rounded-full border-white/20 bg-white/10 font-black text-white hover:bg-white/15">
                <Link to="/compare">
                  Compare societies <BarChart3 className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </aside>
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-blue-100 bg-blue-50 p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_320px] md:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Disclaimer</p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950">Use insights as guidance, not final pricing.</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-navy-600">
                Gurgaon prices change by tower, floor, view, furnishing, inventory and owner urgency. SocietyFlats uses these pages to guide shortlisting and callback conversations.
              </p>
            </div>
            <Button asChild className="h-12 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
              <Link to="/search?tab=societies">
                Search societies <Search className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <span className="sr-only">
          Gurgaon market insights for rent, buy, resale, sell, owner listing, society comparison and SocietyFlats AI advisor.
        </span>
        <span className="sr-only">
          <ShieldCheck />
        </span>
      </section>
    </div>
  );
}

export default InsightsPage;
