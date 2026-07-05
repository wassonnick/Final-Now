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
import { fetchPublicSocieties } from "@/lib/publicData";
import type { AdminSociety } from "@/lib/adminSocietyStore";

type InsightMode = "rent" | "buy" | "sell";

type Confidence = "Admin reviewed" | "Guide range" | "Needs verification";

type MarketInfo = {
  confidence?: string;
  notes?: string;
  sources?: { title: string; url: string }[];
  refreshed_at?: string;
};

type MarketRow = {
  locality: string;
  societyCount: number;
  rent: string;
  buy: string;
  confidence: Confidence;
  sourceLabel: string;
  sourcedDate: string;
  sourceUrl: string;
  action: string;
  href: string;
};

function marketRank(market: MarketInfo | undefined) {
  const level = String(market?.confidence || "").toLowerCase();
  if (level === "high") return 3;
  if (level === "medium") return 2;
  if (level === "low") return 1;
  return 0;
}

function confidenceLabel(market: MarketInfo | undefined): Confidence {
  const rank = marketRank(market);
  if (rank === 3) return "Admin reviewed";
  if (rank >= 1) return "Guide range";
  return "Needs verification";
}

function sourceLabelFor(market: MarketInfo | undefined) {
  if (!market) return "Not yet sourced";
  const count = market.sources?.length || 0;
  return `Claude-grounded market research${count ? ` · ${count} sources` : ""}`;
}

function formatSourcedDate(iso: string | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function buildMarketRows(societies: AdminSociety[]): MarketRow[] {
  const groups = new Map<string, AdminSociety[]>();

  for (const society of societies) {
    const label = society.sector || society.locality || "Gurgaon";
    const existing = groups.get(label) || [];
    existing.push(society);
    groups.set(label, existing);
  }

  const rows: MarketRow[] = [];

  for (const [label, group] of groups.entries()) {
    let best: { society: AdminSociety; market: MarketInfo | undefined } | null = null;

    for (const society of group) {
      if (!society.rentRange && !society.buyRange) continue;
      const market = society.fieldSources?.market as MarketInfo | undefined;
      if (!best || marketRank(market) > marketRank(best.market)) {
        best = { society, market };
      }
    }

    rows.push({
      locality: label,
      societyCount: group.length,
      rent: best?.society.rentRange || "On request",
      buy: best?.society.buyRange || "On request",
      confidence: confidenceLabel(best?.market),
      sourceLabel: sourceLabelFor(best?.market),
      sourcedDate: formatSourcedDate(best?.market?.refreshed_at),
      sourceUrl: best?.market?.sources?.[0]?.url || "",
      action: `Search ${label}`,
      href: `/search?tab=societies&q=${encodeURIComponent(label)}&intent=society`,
    });
  }

  return rows.sort((a, b) => b.societyCount - a.societyCount);
}

const sourceStack = [
  {
    title: "Admin-reviewed society data",
    text: "Rent range, buy range and source confidence are pulled live from each published society's reviewed fields — not a static guide.",
    icon: ShieldCheck,
  },
  {
    title: "Live SocietyFlats inventory",
    text: "Available homes and society pages help validate whether a range is actionable today.",
    icon: Home,
  },
  {
    title: "Public source references",
    text: "Each row shows whether its range came from Claude-grounded research, an admin entry, or is still unverified — and when it was last checked.",
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
  return row.buy;
}

function modeSignal(row: MarketRow, mode: InsightMode) {
  const plural = row.societyCount === 1 ? "society" : "societies";
  if (mode === "sell") {
    return `${row.societyCount} admin-reviewed ${plural} here — list yours to compare directly against them.`;
  }
  return `Based on ${row.societyCount} admin-reviewed ${plural} in ${row.locality}.`;
}

function modeHref(mode: InsightMode) {
  if (mode === "rent") return "/search?tab=rent";
  if (mode === "buy") return "/search?tab=buy";
  return "/sell";
}

function confidenceClass(confidence: Confidence) {
  if (confidence === "Admin reviewed") return "bg-emerald-50 text-emerald-700";
  if (confidence === "Guide range") return "bg-blue-50 text-blue-700";
  return "bg-amber-50 text-amber-700";
}

function confidenceText(confidence: Confidence) {
  if (confidence === "Admin reviewed") return "Admin reviewed";
  if (confidence === "Guide range") return "Guide range";
  return "Verify before use";
}

export function InsightsPage() {
  const [mode, setMode] = useState<InsightMode>("rent");
  const [societies, setSocieties] = useState<AdminSociety[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPublicSeo(
      "Gurgaon Real Estate Market Insights — Prices & Rental Trends | SocietyFlats",
      "See how Gurgaon really moves — honest rental price bands, shifting demand and long-term value across the city's key micro-markets, so you can time your move with clarity.",
    );
    window.scrollTo(0, 0);

    fetchPublicSocieties()
      .then(setSocieties)
      .catch(() => setError("We can't load live data right now — try search, or ask us for a callback and we'll help."))
      .finally(() => setLoading(false));
  }, []);

  const activeCopy = modeCopy[mode];
  const marketRows = useMemo(() => buildMarketRows(societies), [societies]);

  const heroMetrics = useMemo(
    () => [
      ["Data status", "Live society data", "Not final pricing"],
      ["Societies covered", String(societies.length || 0), "Admin-reviewed only"],
      ["Signals covered", "Rent / Buy / Sell", "Separate decision lenses"],
      ["Next action", "Search or callback", "Society-specific decision"],
    ],
    [societies.length],
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
                Gurgaon rent and resale trends, labeled by how confident we actually are in each number.
              </h1>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-blue-500">
                Follow honest rental price bands, demand shifts and investment context across Gurgaon's key micro-markets — so you can time your move with a clear head.
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
                  Every range below is pulled live from published society profiles, with the actual source and confidence shown per row — nothing here is a static guess.
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
                Every row is grouped from real published societies by sector. Final pricing must still be checked against society, tower, floor, view, furnishing and live inventory.
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
              <Link to={modeHref(mode)}>
                Take action <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {loading ? (
            <p className="p-6 text-center text-navy-500">Loading live society data...</p>
          ) : error ? (
            <p className="rounded-2xl bg-amber-50 p-6 text-center text-amber-800">{error}</p>
          ) : marketRows.length === 0 ? (
            <p className="rounded-2xl bg-blue-50 p-6 text-center text-navy-600">Nothing to show here just yet — new societies are on the way.</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="rounded-l-2xl bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Sector / locality
                  </th>
                  <th className="bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    {activeCopy.tableColumn}
                  </th>
                  <th className="bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Coverage
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
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {row.societyCount} {row.societyCount === 1 ? "society" : "societies"}
                      </span>
                    </td>
                    <td className="bg-white p-3 text-sm font-semibold leading-6 text-navy-600">{modeSignal(row, mode)}</td>
                    <td className="bg-white p-3">
                      <p className="text-xs font-black text-navy-800">
                        {row.sourceUrl ? (
                          <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                            {row.sourceLabel}
                          </a>
                        ) : (
                          row.sourceLabel
                        )}
                      </p>
                      <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-[11px] font-black ${confidenceClass(row.confidence)}`}>
                        {confidenceText(row.confidence)}
                      </span>
                      {row.sourcedDate ? <p className="mt-1 text-[11px] font-semibold text-navy-400">Sourced {row.sourcedDate}</p> : null}
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
          )}
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
