import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Home,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Intent = "society" | "rent" | "buy" | "general";

const tabs: Array<{ key: Intent; label: string; button: string }> = [
  { key: "society", label: "Society", button: "Search societies" },
  { key: "rent", label: "Rent", button: "Find rentals" },
  { key: "buy", label: "Buy", button: "Find resale" },
  { key: "general", label: "AI match", button: "Ask AI" },
];

const quickSearches = [
  "DLF Crest",
  "Golf Course Road",
  "Sector 65",
  "3BHK under Rs 1L",
  "Pet friendly",
];

const aiReasons = [
  { icon: ShieldCheck, label: "Verified societies" },
  { icon: MapPin, label: "Commute fit" },
  { icon: Users, label: "Family lifestyle" },
];

function buildSearchUrl(intent: Intent, query: string) {
  const params = new URLSearchParams();
  const cleanQuery = query.trim();

  if (cleanQuery) params.set("q", cleanQuery);

  if (intent === "rent") {
    params.set("tab", "rent");
  } else if (intent === "buy") {
    params.set("tab", "buy");
  } else {
    params.set("tab", "societies");
    params.set("intent", intent === "general" ? "general" : "society");
  }

  return `/search?${params.toString()}`;
}

export default function SocietyFlatsHero() {
  const [activeTab, setActiveTab] = useState<Intent>("society");
  const [query, setQuery] = useState("");

  const active = tabs.find((tab) => tab.key === activeTab) || tabs[0];
  const aiUrl = useMemo(
    () =>
      `/ai-advisor?q=${encodeURIComponent(
        query.trim() || "Help me shortlist the best Gurgaon societies by budget and location",
      )}`,
    [query],
  );

  const submitSearch = () => {
    window.location.href = buildSearchUrl(activeTab, query);
  };

  const applyQuickSearch = (value: string) => {
    setQuery(value);
    window.location.href = buildSearchUrl("society", value);
  };

  return (
    <section className="relative overflow-hidden border-b border-blue-50 bg-[radial-gradient(circle_at_78%_18%,rgba(37,99,235,0.10),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-7 sm:px-6 md:py-9 lg:grid-cols-[minmax(0,1.12fr)_minmax(340px,0.88fr)] lg:items-center lg:px-20 lg:py-10">
        <div className="max-w-[760px]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              Gurgaon society intelligence
            </span>
          </div>

          <h1 className="font-serif text-[38px] font-black leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-[52px] lg:text-[64px]">
            Find the right
            <br />
            Gurgaon society first.
          </h1>

          <p className="mt-4 max-w-[560px] text-base font-semibold leading-7 text-blue-500 sm:text-lg">
            Compare verified societies, rentals, resale homes and lifestyle fit before booking visits.
          </p>

          <div className="mt-6 rounded-[1.35rem] border border-blue-100 bg-white p-2.5 shadow-[0_18px_48px_rgba(37,99,235,0.10)]">
            <div className="mb-2 grid grid-cols-4 gap-1.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-full px-3 py-2 text-sm font-black transition ${
                      isActive
                        ? "bg-blue-700 text-white shadow-md shadow-blue-100"
                        : "text-blue-500 hover:bg-blue-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitSearch();
              }}
              className="flex flex-col gap-2 rounded-[1.1rem] bg-blue-50/55 p-2 sm:flex-row"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-white px-4 py-3">
                <Search className="h-5 w-5 shrink-0 text-blue-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search society, sector, landmark or budget..."
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-blue-300"
                />
              </div>

              <Button
                type="submit"
                className="h-12 rounded-2xl bg-blue-700 px-6 text-sm font-black text-white shadow-md shadow-blue-100 hover:bg-blue-800"
              >
                {active.button}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm font-black text-blue-600">
              Popular:
            </span>
            {quickSearches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => applyQuickSearch(item)}
                className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="relative rounded-[2rem] border border-blue-100 bg-white/90 p-5 shadow-[0_24px_80px_rgba(37,99,235,0.13)] backdrop-blur">
            <div className="absolute -right-4 -top-4 rounded-full bg-blue-700 px-4 py-2 text-xs font-black text-white shadow-xl">
              AI shortlist
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-100">
                <Sparkles className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xl font-black text-navy-950">
                  Not sure where to live?
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-navy-500">
                  Tell AI your budget, office location and lifestyle. Get a ranked Gurgaon society shortlist.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[1.35rem] border border-blue-100 bg-blue-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500">
                Example requirement
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-black text-navy-950">
                    Family 3BHK
                  </p>
                  <p className="mt-1 text-sm font-bold text-blue-600">
                    Near Cyber City · under Rs 1L
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-emerald-700">
                  3 matches
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                {[
                  ["DLF The Crest", "92%"],
                  ["M3M Golf Estate", "88%"],
                  ["Ireo Skyon", "84%"],
                ].map(([name, score], index) => (
                  <Link
                    key={name}
                    to={`/search?q=${encodeURIComponent(name)}&tab=societies&intent=general`}
                    className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white px-3 py-2.5 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-700 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-black text-navy-950">
                        {name}
                      </span>
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                      {score}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {aiReasons.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-blue-100 bg-white p-3 text-center"
                  >
                    <Icon className="mx-auto h-4 w-4 text-blue-700" />
                    <p className="mt-2 text-[11px] font-black leading-4 text-navy-600">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>

            <Link to={aiUrl}>
              <Button className="mt-5 h-12 w-full rounded-full bg-blue-700 text-sm font-black text-white hover:bg-blue-800">
                Start AI shortlist
                <Zap className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-navy-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              No spam. One guided callback if needed.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
