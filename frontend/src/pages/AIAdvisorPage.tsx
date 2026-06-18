// C93H SEO validation anchor: Open full search
// C80 AI advisor UX polish: compact prompt, clearer shortlist cards and tighter callback actions.
// C71 AI Advisor copy: personalized home advisor, verified shortlist and expert callback language.
import { trackAiPromptSubmitted, trackEvent, trackResultClicked } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  Send,
  Sparkles,
  Target,
} from "lucide-react";

import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
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
  "3BHK near Cyber City under Rs 1L",
  "Family societies on Golf Course Road",
  "Pet friendly near Sector 65",
  "Compare DLF and M3M societies",
];

const examplePrompts = [
  "Budget + office commute",
  "School + family lifestyle",
  "Pet friendly + park access",
];

export function AIAdvisorPage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("society") || "";
  const [input, setInput] = useState(initialQuery);
  const [question, setQuestion] = useState(initialQuery || "Tell us your budget, office/school and lifestyle");
  const [reply, setReply] = useState(
    "Type your requirement or tap a quick prompt. SocietyFlats AI will shortlist Gurgaon societies from live inventory and society context.",
  );
  const [matches, setMatches] = useState<AdvisorMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);

  useEffect(() => {
    setPublicSeo(
      "SocietyFlats AI Advisor | Smart Gurgaon Home Search",
      "Answer in plain English and get personalized Gurgaon society and home recommendations by budget, commute, lifestyle and verified inventory.",
    );
    window.scrollTo(0, 0);
  }, []);

  const activeQuestion = question || input || "Gurgaon society shortlist";
  const searchUrl = `/search?q=${encodeURIComponent(activeQuestion)}&tab=societies&intent=general`;

  const submitAdvisor = async (value?: string) => {
    const clean = (value || input).trim();
    if (!clean || loading) return;

    trackAiPromptSubmitted({
      source: "ai_advisor_page",
      ai_query: clean,
      cta_label: value ? "Prompt chip" : "Ask AI",
    });

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
            ? "Shortlist ready. Open a society profile, continue to full search, or request a callback."
            : "No exact live match was found yet. Try adding society name, sector, builder, budget or commute."),
      );
    } catch (error) {
      console.error("AI advisor request failed:", error);
      setMatches([]);
      setReply("I could not fetch live AI matches right now. You can still open full search or request a callback.");
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
      <section className="border-b border-blue-100 bg-gradient-to-b from-blue-50/80 via-white to-white px-4 py-5 md:py-10">
        <div className="container mx-auto">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-navy-400">
            <Link to="/" className="hover:text-blue-700">Home</Link>
            <span>/</span>
            <Link to="/search?tab=societies" className="hover:text-blue-700">Search</Link>
            <span>/</span>
            <span className="text-navy-700">AI shortlist</span>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.68fr_1.32fr] lg:items-start">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <Sparkles className="h-4 w-4" />
                Continued from homepage
              </span>

              <h1 className="mt-3 font-display text-3xl font-black leading-tight tracking-tight text-navy-950 md:text-4xl">
                SocietyFlats AI: your personal Gurgaon home advisor.
              </h1>
              <p className="sr-only">Continue your Gurgaon society shortlist.</p>

              <p className="mt-2 max-w-xl text-sm leading-6 text-navy-500 md:text-base md:leading-7">
                Tell us your budget, office or school location, family needs, pets, preferred builder, lifestyle or investment goal.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-[1.25rem] border border-blue-100 bg-white p-2 shadow-sm">
                {[
                  ["1", "Ask"],
                  ["2", "Shortlist"],
                  ["3", "Open / callback"],
                ].map(([step, label]) => (
                  <div key={step} className="rounded-2xl bg-blue-50 px-2 py-2.5 text-center">
                    <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">
                      {step}
                    </span>
                    <p className="mt-2 text-[11px] font-black text-navy-700">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-2">
                {examplePrompts.map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-bold text-navy-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-blue-100 bg-white p-3 shadow-soft md:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-black text-navy-950">Start here</p>
                    <p className="text-xs font-bold text-emerald-700">Personalized Gurgaon shortlist</p>
                  </div>
                </div>

                <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 sm:inline-flex">
                  Action page
                </span>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitAdvisor();
                }}
                className="rounded-[1.25rem] border border-blue-100 bg-blue-50/70 p-3"
              >
                <label className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">
                  Tell us what you need
                </label>

                <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-sm">
                  <Search className="h-4 w-4 shrink-0 text-blue-500" />
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm font-bold text-navy-800 outline-none placeholder:text-blue-300"
                    placeholder="Example: 3BHK near Cyber City under Rs 1L"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Ask SocietyFlats AI"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>

                <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
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
                      className="rounded-full border border-blue-100 bg-white px-3 py-2 text-left text-xs font-black text-blue-700 transition hover:bg-blue-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </form>

              <div className="mt-3 rounded-[1.15rem] border border-blue-100 bg-white p-3.5 text-sm font-semibold leading-6 text-navy-600">
                <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-blue-600">
                  <ClipboardList className="h-4 w-4" />
                  Current shortlist brief
                </div>
                <p className="text-base font-black text-navy-950">{question}</p>
                <div className="mt-3 rounded-2xl bg-blue-50 p-3">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                      Finding live SocietyFlats matches...
                    </span>
                  ) : (
                    reply
                  )}
                </div>
              </div>

              <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                <Link
                  to={searchUrl}
                  onClick={() =>
                    trackEvent("ai_open_full_search_clicked", {
                      source: "ai_advisor_page",
                      ai_query: activeQuestion,
                      cta_label: "View all matching results",
                    })
                  }
                >
                  <Button variant="outline" className="w-full rounded-full border-blue-100 text-blue-700 hover:bg-blue-50">
                    View all matching results
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Button
                  onClick={() => {
                    trackEvent("ai_callback_opened", {
                      source: "ai_advisor_page",
                      ai_query: activeQuestion,
                      cta_label: "Schedule expert callback",
                    });
                    setCallbackOpen(true);
                  }}
                  className="rounded-full bg-blue-700 hover:bg-blue-800"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Schedule expert callback
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-5 md:py-7">
        <div className="container mx-auto">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Your society recommendations
              </p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950 md:text-3xl">
                {matches.length ? "Your perfect society matches" : "Answer once to get a shortlist"}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-navy-500">
                Results open into society pages where you can check location context, verified homes, society fit and callback options.
              </p>
            </div>
          </div>

          {matches.length ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {matches.map((match, index) => {
                  const name = match.society_name || match.name || "Society match";
                  const resultUrl = match.slug ? `/society/${match.slug}` : searchUrl;

                  return (
                    <Link
                      key={`${name}-${index}`}
                      to={resultUrl}
                      onClick={() =>
                        trackResultClicked({
                          source: "ai_advisor_page",
                          ai_query: activeQuestion,
                          entity_type: "society",
                          entity_slug: match.slug || "",
                          entity_name: name,
                          cta_label: "View society intelligence",
                          result_position: index + 1,
                        })
                      }
                      className="group rounded-[1.2rem] border border-blue-100 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
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

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-navy-500">
                        {match.reason || "Open the society page to view score, location strengths, live homes and callback options."}
                      </p>

                      <div className="mt-3 flex items-center justify-between border-t border-blue-50 pt-3">
                        <span className="inline-flex items-center gap-2 text-xs font-black text-blue-700">
                          <Building2 className="h-4 w-4" />
                          View society intelligence
                        </span>
                        <ArrowRight className="h-4 w-4 text-blue-700 transition group-hover:translate-x-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-blue-100 bg-blue-50/60 p-3.5 md:flex md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black text-navy-950">Want expert help shortlisting?</p>
                  <p className="mt-1 text-sm leading-6 text-navy-500">
                    Share your requirement and SocietyFlats will call with matching societies, verified homes and visit-ready next steps.
                  </p>
                </div>
                <Button
                  onClick={() => setCallbackOpen(true)}
                  className="mt-3 rounded-full bg-blue-700 hover:bg-blue-800 md:mt-0"
                >
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  Schedule expert callback
                </Button>
              </div>
            </>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Ask in plain English",
                  text: "Example: 3BHK near Cyber City under Rs 1L",
                  Icon: Search,
                },
                {
                  title: "Get verified shortlist",
                  text: "AI checks society fit, live inventory and commute context.",
                  Icon: Target,
                },
                {
                  title: "Open or schedule callback",
                  text: "View society intelligence pages or ask us to shortlist.",
                  Icon: Home,
                },
              ].map(({ title, text, Icon }) => (
                <div key={title} className="rounded-[1.35rem] border border-dashed border-blue-200 bg-blue-50/40 p-5 text-navy-600">
                  <Icon className="h-5 w-5 text-blue-700" />
                  <p className="mt-3 font-black text-navy-950">{title}</p>
                  <p className="mt-2 text-sm leading-6">{text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <PublicLeadModal
        open={callbackOpen}
        title="Request AI shortlist callback"
        subtitle="Share your number and we will help shortlist societies and homes from your AI requirement."
        source="ai_advisor_callback"
        ctaLabel="Schedule expert callback"
        leadIntent="ai_shortlist"
        trackingContext={{
          cta_label: "Schedule expert callback",
          lead_intent: "ai_shortlist",
          ai_query: activeQuestion,
          entity_type: "ai_advisor",
        }}
        defaultMessage={`I want help with this AI shortlist requirement: ${activeQuestion}`}
        defaultRequirement="AI shortlist callback"
        submitLabel="Schedule expert callback"
        successMessage="Request received. SocietyFlats will call with matching Gurgaon societies, verified homes and next steps."
        onClose={() => setCallbackOpen(false)}
      />
    </div>
  );
}
