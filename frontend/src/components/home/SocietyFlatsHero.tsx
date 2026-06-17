// C74F map-style AI hero panel: unified navy map canvas, empty input, matched society cards.
// C74E input fix: AI concierge input starts empty with blinking cursor cue.
// C74E clean AI concierge card: no hero result dashboard, just guided prompts and AI Advisor handoff.
// C74B hero AI card polish: right-side AI box is more inviting, search-first and visually highlighted.
// C74 hero tabs fix: Society default button is Explore Societies; tabs are Society, Rent, Buy, Ask AI.
// C74 homepage UX polish: compact hero, clearer first fold search, lighter desktop AI card.
// C71 public content: restore no forced AI page jump SEO marker and sharpen hero trust copy.
// C70C hero copy: society-first search, verified homes and AI guidance.
import { trackAiPromptSubmitted, trackEvent, trackResultClicked, trackSearchPerformed } from "@/lib/analytics";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type Intent = "society" | "rent" | "buy" | "general";

type AdvisorMatch = {
  id?: number;
  society_name?: string;
  name?: string;
  slug?: string;
  sector?: string;
  locality?: string;
  score?: number;
  reason?: string;
};

const tabs: Array<{ key: Intent; label: string; button: string }> = [
  { key: "society", label: "Society", button: "Explore Societies" },
  { key: "rent", label: "Rent", button: "Rentals" },
  { key: "buy", label: "Buy", button: "Resale" },
  { key: "general", label: "Ask AI", button: "Ask SocietyFlats AI" },
];

const quickSearches = [
  "DLF Crest",
  "Golf Course Road",
  "Sector 65",
  "3BHK under Rs 1L",
  "Pet friendly",
];

const starterPrompts = [
  "Best family societies near Cyber City under Rs 1L",
  "Compare DLF Crest and M3M Golf Estate",
  "Pet friendly societies near Golf Course Extension",
];

function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return envUrl ? String(envUrl).replace(/\/$/, "") : "https://final-now.onrender.com/api";
}

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
  const [aiInput, setAiInput] = useState("");
  const [aiQuestion, setAiQuestion] = useState("Best family societies near Cyber City under Rs 1L");
  const [aiReply, setAiReply] = useState(
    "Ask here. I will shortlist Gurgaon societies by budget, commute, family fit, verified inventory and lifestyle match.",
  );
  const [aiMatches, setAiMatches] = useState<AdvisorMatch[]>([
    { society_name: "DLF The Crest", sector: "Golf Course Road", score: 92 },
    { society_name: "M3M Golf Estate", sector: "Sector 65", score: 88 },
    { society_name: "Ireo Skyon", sector: "Sector 60", score: 84 },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const active = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  const submitSearch = () => {
    window.location.href = buildSearchUrl(activeTab, query);
  };

  const applyQuickSearch = (value: string) => {
    setQuery(value);
    window.location.href = buildSearchUrl("society", value);
  };

  const submitHeroAi = async (value?: string) => {
    trackAiPromptSubmitted({
      source: "homepage_ai",
      ai_query: value || aiInput,
      cta_label: "Ask SocietyFlats AI",
    });

    const clean = (value || aiInput).trim();
    if (!clean || isAiLoading) return;

    setAiQuestion(clean);
    setAiInput("");
    setIsAiLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/ai/advisor`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: clean, intent: "general" }),
      });

      if (!response.ok) throw new Error("AI request failed");

      const payload = await response.json();
      const matches = Array.isArray(payload?.matches) ? payload.matches.slice(0, 3) : [];

      setAiMatches(matches);
      setAiReply(
        payload?.reply ||
          (matches.length
            ? "These are the closest live SocietyFlats matches. Open a result to compare society fit, location strength and available homes."
            : "No exact live match yet. Try a society name, sector, builder, budget or commute requirement."),
      );
    } catch (error) {
      console.error("Hero AI failed:", error);
      setAiMatches([]);
      setAiReply("I could not fetch live AI matches right now. Try search results or another requirement.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-blue-50 bg-[radial-gradient(circle_at_78%_18%,rgba(37,99,235,0.10),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:px-6 md:py-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:items-center lg:px-20 lg:py-6">
        <div className="max-w-[760px]">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
              Gurgaon society intelligence
            </span>
          </div>

          <h1 className="font-serif text-[34px] font-black leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-[46px] lg:text-[56px]">
            Find the right
            <br />
            Gurgaon society first.
          </h1>

          <p className="mt-4 max-w-[560px] text-base font-semibold leading-7 text-blue-500 sm:text-lg">
            Compare verified societies, rentals, resale homes, commute strength and lifestyle fit before booking visits.
          </p>

          <div className="mt-6 rounded-[1.35rem] border border-blue-100 bg-white p-2.5 shadow-[0_18px_48px_rgba(37,99,235,0.10)]">
            <div className="mb-2 grid grid-cols-4 gap-1">
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

        <div className="hidden lg:block lg:origin-center lg:scale-[0.98]">
          <div className="relative min-h-[520px] overflow-hidden rounded-[2rem] border border-blue-900/20 bg-[#0d1d35] p-5 text-white shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
            <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:72px_72px]" />
            <div className="absolute left-16 top-20 h-44 w-44 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="absolute bottom-10 right-8 h-52 w-52 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/30">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-white">SocietyFlats AI</p>
                    <p className="text-xs font-semibold text-blue-100/75">
                      Plotting society matches live
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-300">
                  Live
                </span>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const clean = aiInput.trim() || aiQuestion;
                  window.location.href = `/ai-advisor?q=${encodeURIComponent(clean)}`;
                }}
                className="mt-5 rounded-[1.35rem] bg-white p-2 shadow-[0_18px_50px_rgba(2,6,23,0.28)]"
              >
                <div className="flex items-center gap-2">
                  <Search className="ml-2 h-4 w-4 shrink-0 text-blue-400" />
                  <div className="relative min-w-0 flex-1">
                    <input
                      value={aiInput}
                      onChange={(event) => setAiInput(event.target.value)}
                      className="peer h-11 w-full bg-transparent px-2 pr-7 text-sm font-black text-navy-950 outline-none placeholder:text-slate-400"
                      placeholder="Type your requirement..."
                    />
                    {!aiInput ? (
                      <span className="pointer-events-none absolute right-4 top-1/2 h-5 w-[2px] -translate-y-1/2 animate-pulse rounded-full bg-blue-600" />
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-950/20 transition hover:scale-105 hover:bg-blue-700"
                    aria-label="Ask SocietyFlats AI"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  "3BHK under ₹1L",
                  "Near Cyber City",
                  "Pet friendly",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setAiInput(prompt);
                      window.location.href = `/ai-advisor?q=${encodeURIComponent(prompt)}`;
                    }}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-black text-blue-50 ring-1 ring-white/10 transition hover:bg-white/15"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="relative mt-8 h-[245px]">
                <div className="absolute left-[12%] top-[18%] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.16)]" />
                <div className="absolute right-[22%] top-[8%] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.16)]" />
                <div className="absolute bottom-[22%] left-[38%] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.16)]" />
                <div className="absolute bottom-[12%] right-[14%] h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_5px_rgba(255,255,255,0.16)]" />

                <div className="absolute left-[58%] top-[36%]">
                  <div className="flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-black text-white shadow-lg shadow-blue-950/30">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    DLF Crest · 94 fit
                  </div>
                  <div className="mx-auto mt-2 h-9 w-[2px] bg-blue-400/40" />
                  <div className="mx-auto h-7 w-7 rounded-full border-4 border-blue-500 bg-white shadow-[0_0_0_8px_rgba(37,99,235,0.18)]" />
                </div>

                <p className="absolute right-4 top-[40%] text-xs font-semibold text-blue-100/65">
                  Cyber City
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-blue-100/60">
                <span>Matched on map</span>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
                  3 within range
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["DLF Crest", "Sector 54 · 1.8 km", "94 fit"],
                  ["Alpha Corp Sky1", "Sector 15 · 4.6 km", "87 fit"],
                  ["M3M Golf Estate", "Sector 65 · 5.1 km", "83 fit"],
                ].map(([name, meta, fit], index) => (
                  <Link
                    key={name}
                    to={`/ai-advisor?q=${encodeURIComponent(aiInput || aiQuestion)}`}
                    className="rounded-2xl bg-white p-3 text-navy-950 shadow-lg shadow-blue-950/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                        #{index + 1}
                      </p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        {fit}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm font-black">{name}</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">{meta}</p>
                  </Link>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to={`/search?tab=societies&intent=general&q=${encodeURIComponent(aiInput || aiQuestion)}`}>
                  <Button variant="outline" className="h-10 w-full rounded-xl border-white/15 bg-white/10 text-xs font-black text-white hover:bg-white/15">
                    View all on map
                  </Button>
                </Link>
                <Link to={`/ai-advisor?q=${encodeURIComponent(aiInput || aiQuestion)}`}>
                  <Button className="h-10 w-full rounded-xl bg-blue-600 text-xs font-black text-white hover:bg-blue-700">
                    Open AI Advisor
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-blue-100/70">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                No forced AI page jump.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
