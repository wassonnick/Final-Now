// C74C real hero AI card layout: full right-side AI card replaced with search-first matchmaker layout.
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
  const [aiInput, setAiInput] = useState("Best family societies near Cyber City under Rs 1L");
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
          <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-[0_28px_90px_rgba(37,99,235,0.18)]">
            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-200/50 blur-3xl" />
            <div className="absolute -bottom-20 left-8 h-44 w-44 rounded-full bg-sky-200/45 blur-3xl" />

            <div className="relative border-b border-blue-100 bg-gradient-to-br from-blue-700 via-blue-800 to-navy-950 p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-lg ring-1 ring-white/20">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-100">
                      AI Society Matchmaker
                    </p>
                    <h2 className="mt-1 text-2xl font-black leading-tight">
                      Ask SocietyFlats AI
                    </h2>
                    <p className="mt-1 max-w-[20rem] text-xs font-semibold leading-5 text-blue-100">
                      Tell us budget, office, school or lifestyle. Get society matches instantly.
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white ring-1 ring-white/20">
                  Live
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { icon: ShieldCheck, label: "Verified" },
                  { icon: MapPin, label: "Commute" },
                  { icon: Users, label: "Family fit" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl bg-white/12 p-2 text-center ring-1 ring-white/15">
                      <Icon className="mx-auto h-4 w-4 text-white" />
                      <p className="mt-1 text-[10px] font-black text-blue-50">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative bg-gradient-to-b from-blue-50/80 via-white to-white p-4">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitHeroAi();
                }}
                className="rounded-[1.35rem] border border-blue-200 bg-white p-2.5 shadow-[0_16px_45px_rgba(37,99,235,0.16)] ring-4 ring-blue-100/70"
              >
                <p className="px-2 pb-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">
                  Ask in plain English
                </p>
                <div className="flex items-center gap-2">
                  <input
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    className="h-12 min-w-0 flex-1 rounded-2xl bg-blue-50/70 px-4 text-sm font-black text-navy-900 outline-none placeholder:text-blue-400"
                    placeholder="Try: 3BHK near Cyber City under ₹1L"
                  />
                  <button
                    type="submit"
                    disabled={isAiLoading || !aiInput.trim()}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-lg shadow-blue-200 transition hover:scale-105 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Ask SocietyFlats AI"
                  >
                    {isAiLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </button>
                </div>
              </form>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => submitHeroAi(prompt)}
                    className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[10px] font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-[1.25rem] border border-blue-100 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                    AI shortlist preview
                  </p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">
                    {aiMatches.length ? `${aiMatches.length} matches` : "Ready"}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-sm font-black leading-5 text-navy-950">
                  {aiQuestion}
                </p>

                <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs font-bold leading-5 text-navy-600">
                  {isAiLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                      Finding live society matches...
                    </span>
                  ) : (
                    aiReply
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {aiMatches.length ? (
                  aiMatches.map((match, index) => {
                    const name = match.society_name || match.name || "Society match";
                    const href = match.slug
                      ? `/society/${match.slug}`
                      : buildSearchUrl("general", name);

                    return (
                      <Link
                        key={`${name}-${index}`}
                        to={href}
                        className="group flex items-center justify-between rounded-2xl border border-blue-100 bg-white px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-xs font-black text-white">
                            {index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-navy-950 group-hover:text-blue-700">
                              {name}
                            </span>
                            <span className="block truncate text-xs font-bold text-blue-400">
                              {match.sector || match.locality || "Gurgaon"}
                            </span>
                          </span>
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                          {match.score ? `${match.score}%` : "Match"}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-blue-100 bg-white p-3 text-sm font-semibold text-navy-500">
                    No exact live match yet. Try another requirement.
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to={buildSearchUrl("general", aiQuestion)}>
                  <Button variant="outline" className="h-10 w-full rounded-full border-blue-100 bg-white text-xs font-black text-blue-700 hover:bg-blue-50">
                    View matches
                  </Button>
                </Link>
                <Link to={`/ai-advisor?q=${encodeURIComponent(aiQuestion)}`}>
                  <Button className="h-10 w-full rounded-full bg-blue-700 text-xs font-black text-white hover:bg-blue-800">
                    Expert AI help
                  </Button>
                </Link>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-navy-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                No forced AI page jump. Search normally anytime.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
