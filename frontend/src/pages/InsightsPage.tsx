import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  Building2,
  CheckCircle2,
  FileSearch,
  Home,
  Info,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { setPublicSeo } from "@/lib/seo";

type InsightMode = "rent" | "buy" | "sell";

type MarketRow = {
  locality: string;
  rent: string;
  buy: string;
  sell: string;
  rentSignal: string;
  buySignal: string;
  sellSignal: string;
  demand: string;
  sourceLabel: string;
  confidence: "Admin reviewed" | "Guide range" | "Needs verification";
  action: string;
  href: string;
};

const marketRows: MarketRow[] = [
  {
    locality: "Golf Course Road",
    rent: "₹90K – ₹2.4L",
    buy: "₹5.5Cr – ₹12Cr",
    sell: "Premium resale depth",
    rentSignal: "Corporate tenants, premium maintenance and luxury society demand.",
    buySignal: "High-ticket resale market where society brand and tower quality drive pricing.",
    sellSignal: "Works best with verified tower, floor, view and recent society-level buyer demand.",
    demand: "Very high",
    sourceLabel: "Admin guide + live society inventory signals",
    confidence: "Guide range",
    action: "Search Golf Course Road",
    href: "/search?tab=societies&q=Golf%20Course%20Road&intent=society",
  },
  {
    locality: "Golf Course Extension",
    rent: "₹75K – ₹1.8L",
    buy: "₹3.2Cr – ₹8Cr",
    sell: "Strong family upgrade market",
    rentSignal: "Family tenants compare commute, school access, amenities and maintenance.",
    buySignal: "Resale strength depends heavily on builder, age, layout and society upkeep.",
    sellSignal: "Good owner-listing zone when inventory is limited and pricing is realistic.",
    demand: "High",
    sourceLabel: "Admin guide + public society parameters",
    confidence: "Guide range",
    action: "Search Extension Road",
    href: "/search?tab=societies&q=Golf%20Course%20Extension%20Road&intent=society",
  },
  {
    locality: "Sector 65",
    rent: "₹70K – ₹1.6L",
    buy: "₹2.8Cr – ₹7.5Cr",
    sell: "Builder-led premium cluster",
    rentSignal: "Tenant demand often follows M3M / premium society recall and office commute.",
    buySignal: "Buyer interest depends on exact project, tower, density and possession status.",
    sellSignal: "Owner listings need strong photos, verified society context and price benchmarking.",
    demand: "High",
    sourceLabel: "Admin guide + builder/locality context",
    confidence: "Guide range",
    action: "Search Sector 65",
    href: "/search?tab=societies&q=Sector%2065&intent=society",
  },
  {
    locality: "Dwarka Expressway",
    rent: "₹45K – ₹1.1L",
    buy: "₹1.8Cr – ₹5Cr",
    sell: "Infrastructure-led demand",
    rentSignal: "Rental demand varies widely by connectivity, handover quality and live occupancy.",
    buySignal: "Upside depends on micro-location, access, society delivery and future infrastructure.",
    sellSignal: "Owner should position listing with society readiness and commute clarity.",
    demand: "Rising",
    sourceLabel: "Infrastructure-led guide range",
    confidence: "Needs verification",
    action: "Search Dwarka Expressway",
    href: "/search?tab=societies&q=Dwarka%20Expressway&intent=society",
  },
  {
    locality: "Sohna Road",
    rent: "₹40K – ₹90K",
    buy: "₹1.4Cr – ₹3.8Cr",
    sell: "Value-sensitive family market",
    rentSignal: "Renters compare budget, daily commute and society maintenance more closely.",
    buySignal: "Resale works when pricing is value-led and society quality is easy to verify.",
    sellSignal: "Owner listings need realistic pricing and clear comparison with nearby societies.",
    demand: "Medium",
    sourceLabel: "Admin guide + value-market context",
    confidence: "Guide range",
    action: "Search Sohna Road",
    href: "/search?tab=societies&q=Sohna%20Road&intent=society",
  },
];

const sourceStack = [
  {
    title: "Admin-reviewed society data",
    text: "Rent range, buy range, price-per-sqft, rental yield and source confidence can later be pulled from enriched admin society fields.",
    icon: ShieldCheck,
  },
  {
    title: "Live SocietyFlats inventory",
    text: "Available homes and society pages help validate whether a range is actionable today.",
    icon: Home,
  },
  {
    title: "Public source references",
    text: "Future version should show source URLs, official/RERA references and last-reviewed date per locality or society.",
    icon: FileSearch,
  },
];

const modeCopy: Record<InsightMode, { title: string; description: string; cta: string; tableColumn: string }> = {
  rent: {
    title: "Rent signals by Gurgaon micro-market",
    description: "Use rent guide ranges, demand and society quality signals to shortlist tenant-friendly societies.",
    cta: "Search rentals",
    tableColumn: "Rent guide range",
  },
  buy: {
    title: "Buy / resale signals before shortlisting",
    description: "Compare resale bands, builder context and society quality before choosing where to buy.",
    cta: "Search resale",
    tableColumn: "Resale guide range",
  },
  sell: {
    title: "Owner-side signals for listing timing",
    description: "Understand where demand is stronger and how an owner listing should be positioned.",
    cta: "List your flat",
    tableColumn: "Owner listing signal",
  },
};

function modeValue(row: MarketRow, mode: InsightMode) {
  if (mode === "rent") return row.rent;
  if (mode === "buy") return row.buy;
  return row.sell;
}

function modeSignal(row: MarketRow, mode: InsightMode) {
  if (mode === "rent") return row.rentSignal;
  if (mode === "buy") return row.buySignal;
  return row.sellSignal;
}

function modeHref(mode: InsightMode) {
  if (mode === "rent") return "/search?tab=rent";
  if (mode === "buy") return "/search?tab=buy";
  return "/sell";
}

function confidenceClass(confidence: MarketRow["confidence"]) {
  if (confidence === "Admin reviewed") return "bg-emerald-50 text-emerald-700";
  if (confidence === "Guide range") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function confidenceText(confidence: MarketRow["confidence"]) {
  if (confidence === "Admin reviewed") return "Admin reviewed";
  if (confidence === "Guide range") return "Guide range";
  return "Verify before use";
}

export function InsightsPage() {
  const [mode, setMode] = useState<InsightMode>("rent");

  useEffect(() => {
    setPublicSeo(
      "Gurgaon Real Estate Market Insights | Property Values & Rental Trends",
      "Track verified rental price bands, property demand shifts and long-term investment viability scores across Gurgaon’s key micro-markets.",
    );
    window.scrollTo(0, 0);
  }, []);

  const activeCopy = modeCopy[mode];

  const heroMetrics = useMemo(
    () => [
      ["Data status", "Guide ranges", "Not final pricing"],
      ["Signals covered", "Rent / Buy / Sell", "Separate decision lenses"],
      ["Verification", "Admin + source path", "Future source URLs"],
      ["Next action", "Search or callback", "Society-specific decision"],
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-[#F8F3EA]">
      <section className="border-b border-[#E7DCCB] bg-[radial-gradient(circle_at_80%_10%,rgba(194,114,78,0.10),transparent_30%),linear-gradient(180deg,#FFFBF3_0%,#F8F3EA_100%)] px-4 py-8 md:py-10">
        <div className="container mx-auto">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <TrendingUp className="h-4 w-4" />
                Source-labelled Gurgaon intelligence
              </span>

              <h1 className="mt-4 max-w-4xl font-display text-[36px] font-black leading-[0.98] tracking-[-0.045em] text-navy-950 md:text-[56px]">
                Gurgaon real estate market insights with clear verification labels.
              </h1>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-blue-500">
                Track verified rental price bands, demand shifts and investment context across Gurgaon’s key micro-markets before users shortlist, compare and request verification.
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
                    {item === "buy" ? "Buy / resale" : item}
                  </button>
                ))}
              </div>
            </div>

            <aside className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">Current lens</p>
              <h2 className="mt-2 font-display text-2xl font-black text-navy-950">{activeCopy.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">{activeCopy.description}</p>

              <div className="mt-4 rounded-2xl bg-blue-50 p-3">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-blue-700">
                  <Info className="h-4 w-4" />
                  Source label
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-navy-600">
                  Current version uses SocietyFlats guide ranges. Future admin enrichment should attach source URLs, confidence score and last-reviewed date.
                </p>
              </div>

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
              <p className="mt-1 text-xl font-black text-navy-950 md:text-2xl">{value}</p>
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
              <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-navy-500">
                Every row is labelled as a guide range or verification-needed signal. Final pricing must be checked against society, tower, floor, view, furnishing and live inventory.
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
              <Link to={modeHref(mode)}>
                Take action <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="rounded-l-2xl bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Locality
                  </th>
                  <th className="bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    {activeCopy.tableColumn}
                  </th>
                  <th className="bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Demand
                  </th>
                  <th className="bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Mode-specific signal
                  </th>
                  <th className="bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Source / confidence
                  </th>
                  <th className="rounded-r-2xl bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Action
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
                    <td className="bg-white p-3 text-sm font-semibold leading-6 text-navy-600">{modeSignal(row, mode)}</td>
                    <td className="bg-white p-3">
                      <p className="text-xs font-black text-navy-800">{row.sourceLabel}</p>
                      <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${confidenceClass(row.confidence)}`}>
                        {confidenceText(row.confidence)}
                      </span>
                    </td>
                    <td className="rounded-r-2xl bg-white p-3">
                      <Link to={row.href} className="inline-flex items-center rounded-full border border-blue-100 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-50">
                        {row.action}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[1.75rem] border border-blue-100 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Source stack</p>
            <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950 md:text-[30px]">
              How these insights should become stronger over time
            </h2>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {sourceStack.map(({ title, text, icon: Icon }) => (
                <div key={title} className="rounded-[1.35rem] border border-blue-100 bg-[#FFFBF3] p-4">
                  <Icon className="h-5 w-5 text-blue-700" />
                  <h3 className="mt-3 font-black text-navy-950">{title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <aside className="rounded-[1.75rem] border border-blue-100 bg-navy-950 p-5 text-white shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-200">Need society-specific guidance?</p>
            <h2 className="mt-2 font-display text-2xl font-black text-white">Ask AI or compare societies before deciding.</h2>
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
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Verification note</p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950">Use insights as guidance, not final pricing.</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-navy-600">
                Gurgaon prices change by tower, floor, view, furnishing, inventory and owner urgency. Future admin enrichment should attach source URL, official/RERA URL, confidence score and last-reviewed date to every market signal.
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
          Gurgaon market insights for rent, buy, resale, sell, owner listing, society comparison, source confidence, public references and SocietyFlats AI advisor.
        </span>
        <span className="sr-only">
          <CheckCircle2 />
          <BadgeIndianRupee />
        </span>
      </section>
    </div>
  );
}

export default InsightsPage;
