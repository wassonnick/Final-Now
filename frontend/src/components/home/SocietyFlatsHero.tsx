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

        <div className="hidden lg:block lg:origin-center lg:scale-[0.96]">
          <div className="relative overflow-hidden rounded-[1.75rem] border border-blue-100 bg-white/95 p-5 shadow-[0_24px_80px_rgba(37,99,235,0.13)] backdrop-blur">
            <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-blue-100/80 blur-3xl" />
            <div className="absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-sky-100/70 blur-3xl" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                  <Sparkles className="h-4 w-4" />
                  AI Concierge
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                  Live
                </span>
              </div>

              <h2 className="mt-5 max-w-sm font-serif text-4xl font-black leading-[0.95] tracking-[-0.04em] text-navy-950">
                Not sure where to live?
              </h2>

              <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-navy-500">
                Tell AI your budget, office, school or lifestyle. It will open a focused shortlist instead of making you browse blindly.
              </p>

              <div className="mt-5 grid gap-2">
                {[
                  "Family near Cyber City",
                  "Pet friendly on Golf Course Extension",
                  "Compare DLF vs M3M",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setAiInput(prompt);
                      window.location.href = `/ai-advisor?q=${encodeURIComponent(prompt)}`;
                    }}
                    className="flex items-center justify-between rounded-2xl border border-blue-100 bg-white px-4 py-3 text-left text-sm font-black text-navy-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="h-4 w-4 text-blue-700" />
                  </button>
                ))}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const clean = aiInput.trim() || aiQuestion;
                  window.location.href = `/ai-advisor?q=${encodeURIComponent(clean)}`;
                }}
                className="mt-5 rounded-[1.25rem] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-2.5 shadow-[0_14px_40px_rgba(37,99,235,0.12)]"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={aiInput}
                    onChange={(event) => setAiInput(event.target.value)}
                    className="h-11 min-w-0 flex-1 rounded-2xl bg-white px-4 text-sm font-black text-navy-900 outline-none placeholder:text-blue-400"
                    placeholder="Type your requirement..."
                  />
                  <button
                    type="submit"
                    className="flex h-11 shrink-0 items-center justify-center rounded-2xl bg-blue-700 px-4 text-xs font-black text-white shadow-lg shadow-blue-200 transition hover:scale-105 hover:bg-blue-800"
                    aria-label="Ask SocietyFlats AI"
                  >
                    Ask AI
                  </button>
                </div>
              </form>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { icon: ShieldCheck, label: "Verified" },
                  { icon: MapPin, label: "Commute" },
                  { icon: Users, label: "Family fit" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl bg-blue-50/70 p-3 text-center">
                      <Icon className="mx-auto h-4 w-4 text-blue-700" />
                      <p className="mt-1 text-[10px] font-black text-navy-500">
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-navy-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                No forced AI page jump from normal search.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
