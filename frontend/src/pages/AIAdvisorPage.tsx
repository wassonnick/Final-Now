import { trackAiPromptSubmitted, trackEvent, trackResultClicked } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
  Search,
  Send,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { setPublicSeo } from "@/lib/seo";

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

function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  return envUrl ? String(envUrl).replace(/\/$/, "") : "https://final-now.onrender.com/api";
}

const promptChips = [
  "Best societies near Cyber City under Rs 1L",
  "Family friendly 3BHK on Golf Course Road",
  "Pet friendly societies near Sector 65",
  "Compare DLF and M3M societies",
];

export function AIAdvisorPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [input, setInput] = useState(initialQuery);
  const [question, setQuestion] = useState(initialQuery || "Tell us your Gurgaon requirement");
  const [reply, setReply] = useState(
    "This continues the homepage AI flow. Share your budget, office/school commute or lifestyle requirement and get a Gurgaon society shortlist.",
  );
  const [matches, setMatches] = useState<AdvisorMatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPublicSeo(
      "AI Society Advisor for Gurgaon | SocietyFlats",
      "Use SocietyFlats AI to shortlist Gurgaon societies and homes by budget, commute, lifestyle and verified inventory.",
    );
    window.scrollTo(0, 0);
  }, []);

  const searchUrl = `/search?q=${encodeURIComponent(question)}&tab=societies&intent=general`;

  const submitAdvisor = async (value?: string) => {
    trackAiPromptSubmitted({
      source: "ai_advisor_page",
      ai_query: value || question,
      cta_label: "AI Advisor prompt",
    });

    const clean = (value || input).trim();
    if (!clean || loading) return;

    setQuestion(clean);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/ai/advisor`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: clean, intent: "general" }),
      });

      if (!response.ok) throw new Error("AI advisor failed");

      const payload = await response.json();
      const nextMatches = Array.isArray(payload?.matches) ? payload.matches.slice(0, 6) : [];

      setMatches(nextMatches);
      setReply(
        payload?.reply ||
          (nextMatches.length
            ? "These are the closest live SocietyFlats matches. Open a society or continue to search results."
            : "No exact match was found yet. Try a society name, sector, builder, budget or commute requirement."),
      );
    } catch (error) {
      console.error("AI advisor request failed:", error);
      setMatches([]);
      setReply("I could not fetch live AI matches right now. You can still browse matching search results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) submitAdvisor(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  return (
    <div className="min-h-screen bg-white">
      <section className="border-b border-blue-100 bg-gradient-to-b from-blue-50/70 to-white px-4 py-8 md:py-10">
        <div className="container mx-auto">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-navy-400">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <span>/</span>
            <Link to="/search?tab=societies" className="hover:text-blue-700">Search</Link>
            <span>/</span>
            <span className="text-navy-700">AI shortlist</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Continued from homepage
              </span>
              <h1 className="mt-4 font-display text-4xl font-black leading-tight tracking-tight text-navy-950 md:text-5xl">
                Continue your Gurgaon society shortlist.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-navy-500">
                Ask in plain English, then open society pages, full search results or callback options.
              </p>

              <div className="mt-5 grid gap-2">
                {["Budget + location", "Family fit", "Commute strength", "Verified inventory"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-bold text-navy-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-soft md:p-5">
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-black text-navy-950">Ask your requirement</p>
                  <p className="text-xs font-bold text-emerald-700">Live Gurgaon shortlist</p>
                </div>
              </div>

              <div className="rounded-[1.25rem] bg-blue-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-500">
                  Requirement
                </p>
                <p className="mt-1 text-lg font-black text-navy-950">{question}</p>
              </div>

              <div className="mt-3 rounded-[1.25rem] border border-blue-100 bg-white p-4 text-sm font-semibold leading-6 text-navy-600">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                    Finding live SocietyFlats matches...
                  </span>
                ) : (
                  reply
                )}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitAdvisor();
                }}
                className="mt-3 flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/60 p-2"
              >
                <Search className="ml-2 h-4 w-4 text-blue-500" />
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-navy-700 outline-none placeholder:text-blue-300"
                  placeholder="Example: 3BHK near Cyber City under Rs 1L"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {promptChips.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      trackEvent("ai_prompt_chip_clicked", {
                        source: "ai_advisor_page",
                        ai_query: prompt,
                        cta_label: "Prompt chip",
                      });
                      submitAdvisor(prompt);
                    }}
                    className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-8 md:py-10">
        <div className="container mx-auto">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                AI shortlist results
              </p>
              <h2 className="mt-2 font-display text-3xl font-black text-navy-950">
                {matches.length ? "Recommended societies" : "Start with a requirement"}
              </h2>
            </div>

            <Link
              to={searchUrl}
              onClick={() =>
                trackEvent("ai_open_full_search_clicked", {
                  source: "ai_advisor_page",
                  ai_query: question,
                  cta_label: "Open full search",
                })
              }
            >
              <Button variant="outline" className="rounded-full border-blue-100 text-blue-700 hover:bg-blue-50">
                Open full search
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {matches.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {matches.map((match, index) => {
                const name = match.society_name || match.name || "Society match";
                return (
                  <Link
                    key={`${name}-${index}`}
                    to={match.slug ? `/society/${match.slug}` : searchUrl}
                    className="group rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-sm font-black text-white">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="text-lg font-black text-navy-950 group-hover:text-blue-700">
                            {name}
                          </h3>
                          <p className="mt-1 flex items-center gap-1 text-xs font-bold text-navy-400">
                            <MapPin className="h-3.5 w-3.5" />
                            {match.sector || match.locality || "Gurgaon"}
                          </p>
                        </div>
                      </div>

                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {match.score ? `${match.score}%` : "Match"}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-navy-500">
                      {match.reason || "Open the society page to view score, location strengths, live homes and callback options."}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-blue-50 pt-4">
                      <span className="inline-flex items-center gap-2 text-xs font-black text-blue-700">
                        <Building2 className="h-4 w-4" />
                        Society profile
                      </span>
                      <ArrowRight className="h-4 w-4 text-blue-700 transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-blue-200 bg-blue-50/40 p-6 text-navy-600">
              Ask a requirement above. You can search by office location, school, budget, builder, pet needs or family lifestyle.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
