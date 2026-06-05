import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  Heart,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Search,
  Send,
  Sparkles,
  Star,
} from "lucide-react";

type Intent = "rent" | "buy" | "resale" | "general";

type AdvisorMatch = {
  id: number;
  society_name: string;
  slug?: string;
  sector?: string;
  locality?: string;
  score?: number;
  rent_range?: string;
  buy_range?: string;
  available_homes?: number;
  reason?: string;
  tags?: string[];
};

type AdvisorMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  matches?: AdvisorMatch[];
};

const demoMatches: AdvisorMatch[] = [
  {
    id: 1,
    society_name: "DLF Crest",
    slug: "dlf-crest",
    sector: "DLF Phase V",
    locality: "Golf Course Road",
    score: 9.1,
    rent_range: "₹1.1L – ₹2.5L",
    buy_range: "₹6Cr – ₹12Cr",
    available_homes: 12,
    reason: "Premium society with strong connectivity, security and family-friendly amenities.",
    tags: ["Luxury", "Family Friendly", "Near Metro"],
  },
  {
    id: 2,
    society_name: "DLF Park Place",
    slug: "dlf-park-place",
    sector: "DLF Phase V",
    locality: "Golf Course Road",
    score: 8.7,
    rent_range: "₹95K – ₹1.6L",
    buy_range: "₹4.5Cr – ₹8Cr",
    available_homes: 9,
    reason: "Good premium option with strong Cyber City access and established resident profile.",
    tags: ["Premium", "Near Cyber Hub", "Family Friendly"],
  },
  {
    id: 3,
    society_name: "Ireo Skyon",
    slug: "ireo-skyon",
    sector: "Sector 60",
    locality: "Golf Course Extension Road",
    score: 8.4,
    rent_range: "₹75K – ₹1.5L",
    buy_range: "₹4Cr – ₹7Cr",
    available_homes: 6,
    reason: "Modern society with good layouts and better value around Golf Course Extension.",
    tags: ["Modern", "Value", "Clubhouse"],
  },
];

function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;

  if (envUrl) {
    return String(envUrl).replace(/\/$/, "");
  }

  return "/api";
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function AIAdvisorChatBox() {
  const [input, setInput] = useState("");
  const [intent] = useState<Intent>("rent");
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I’m your SocietyFlats AI advisor for Gurgaon. Tell me your needs and I’ll help you find the right society.",
    },
    {
      id: "demo-user",
      role: "user",
      text: "Best 3BHK near Cyber City under Rs 1L",
    },
    {
      id: "demo-reply",
      role: "assistant",
      text: "Here are the top 3 societies that match your requirements near Cyber City for 3BHK homes.",
      matches: demoMatches,
    },
  ]);

  const submitMessage = async (messageText?: string) => {
    const cleanMessage = (messageText || input).trim();
    if (!cleanMessage || isLoading) return;

    const userMessage: AdvisorMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: cleanMessage,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/ai/advisor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,
          intent,
        }),
      });

      if (!response.ok) {
        throw new Error("AI advisor API failed");
      }

      const data = await response.json();

      const apiMatches: AdvisorMatch[] = Array.isArray(data?.matches)
        ? data.matches
        : [];

      const assistantMessage: AdvisorMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text:
          data?.reply ||
          "Based on your requirement, these societies are a strong fit.",
        matches: apiMatches.length > 0 ? apiMatches.slice(0, 3) : demoMatches,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `fallback-${Date.now()}`,
          role: "assistant",
          text:
            "I could not fetch live recommendations right now. Here are some strong Gurgaon society options based on your requirement.",
          matches: demoMatches,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const latestMatches = useMemo(() => {
    const messageWithMatches = [...messages]
      .reverse()
      .find((message) => message.matches && message.matches.length > 0);

    return messageWithMatches?.matches?.slice(0, 3) || demoMatches;
  }, [messages]);

  return (
    <aside className="hidden lg:block w-full max-w-[445px] shrink-0">
      <div className="rounded-[26px] border border-blue-100/90 bg-white/88 p-2.5 shadow-[0_24px_75px_rgba(37,99,235,0.14)] backdrop-blur-2xl">
        <div className="rounded-[20px] bg-gradient-to-br from-blue-50 via-white to-white p-3">
          <div className="mb-2 flex items-center justify-between rounded-2xl bg-white/75 px-3 py-2.5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-md shadow-blue-200">
                SF
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-extrabold tracking-tight text-slate-950">
                    SocietyFlats AI
                  </p>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-blue-600">
                    Advisor
                  </span>
                </div>
                <p className="text-[11px] font-bold text-emerald-700">
                  Gurgaon expert · Online
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-blue-300">
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="h-1 w-1 rounded-full bg-current" />
              <span className="h-1 w-1 rounded-full bg-current" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="rounded-2xl bg-white px-3.5 py-2.5 text-[12px] font-semibold leading-relaxed text-slate-700 shadow-sm">
              Hi! I’m your SocietyFlats AI advisor for Gurgaon. Tell me your
              needs and I’ll help you find the right society.
            </div>

            <div className="ml-auto max-w-[88%] rounded-2xl bg-blue-600 px-3.5 py-2 text-[12px] font-bold leading-relaxed text-white shadow-md shadow-blue-200">
              Best 3BHK near Cyber City under Rs 1L
            </div>

            <div className="rounded-2xl bg-white px-3.5 py-2.5 text-[12px] font-semibold leading-relaxed text-blue-600 shadow-sm">
              Here are the top 3 societies that match your requirements near
              Cyber City for 3BHK homes.
            </div>

            <div className="rounded-[20px] border border-blue-100 bg-blue-50/70 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
                  Top Matches
                </p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Navigation className="h-3 w-3" />
                  Cyber City
                </div>
              </div>

              <div className="space-y-1.5">
                {latestMatches.map((match, index) => (
                  <div
                    key={`${match.id}-${match.society_name}`}
                    className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-1.5 shadow-sm"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[12px] font-black text-white">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-extrabold leading-tight text-slate-950">
                        {match.society_name}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-blue-400">
                        {match.sector || match.locality || "Gurgaon"}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[13px] font-black text-blue-600">
                        {match.score || "8.5"}
                      </p>
                      <p className="text-[10px] font-bold text-blue-300">
                        {Number(match.score || 0) >= 9
                          ? "Excellent"
                          : "Very Good"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 rounded-full bg-white/90 px-3 py-1.5">
                <div className="relative h-2 rounded-full bg-blue-100">
                  <span className="absolute left-[18%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow" />
                  <span className="absolute left-[52%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow" />
                  <span className="absolute left-[82%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-amber-700 shadow" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {["Family", "Metro", "Pets", "Under Rs 1L"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => submitMessage(chip)}
                className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[11px] font-bold text-blue-500 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                submitMessage();
              }}
              className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-1.5 shadow-sm"
            >
              <Bot className="h-4 w-4 shrink-0 text-blue-500" />

              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about societies, locality, budget..."
                className="min-w-0 flex-1 bg-transparent text-[12.5px] font-semibold text-slate-700 outline-none placeholder:text-blue-300"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default function SocietyFlatsHero() {
  const [activeTab, setActiveTab] = useState<Intent>("rent");
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    params.set("intent", activeTab);

    window.location.href = `/search?${params.toString()}`;
  };

  return (
    <section className="relative overflow-hidden border-b border-blue-50 bg-[radial-gradient(circle_at_72%_18%,rgba(37,99,235,0.10),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-3 px-5 pb-2 pt-3 sm:gap-8 sm:px-6 sm:pb-6 sm:pt-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.75fr)] lg:gap-10 lg:px-24 lg:pb-10 lg:pt-12">
        <div className="max-w-[860px]">
          <div className="mb-3 inline-flex items-center gap-3 rounded-full border border-blue-100 bg-white/80 px-3 py-1.5 shadow-sm sm:mb-4 sm:px-4 sm:py-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700 sm:text-[12px] sm:tracking-[0.26em]">
              Gurgaon Society Intelligence
            </span>
          </div>

          <h1 className="max-w-[740px] font-serif text-[40px] font-black leading-[0.97] tracking-[-0.045em] text-slate-950 sm:text-[63px] sm:leading-[0.93] lg:text-[69px] xl:text-[74px]">
            Find a society
            <br />
            you will actually
            <br />
            <span className="italic text-blue-600">love living in.</span>
          </h1>

          <p className="mt-4 hidden max-w-[700px] text-[19px] font-medium leading-7 text-blue-500 sm:block">
            Verified scores on security, maintenance, amenities and
            connectivity, before you sign a lease or buy a home.
          </p>

          <div className="mt-3 w-full rounded-[26px] border border-blue-100 bg-white/90 p-2.5 shadow-[0_24px_75px_rgba(37,99,235,0.12)] backdrop-blur-xl sm:mt-6 sm:p-3">
            <div className="mb-2.5 grid grid-cols-4 gap-1.5 sm:mb-3 sm:flex sm:flex-wrap sm:gap-2">
              {[
                { key: "rent", label: "Rent" },
                { key: "buy", label: "Buy" },
                { key: "resale", label: "Resale" },
                { key: "general", label: "Ask AI" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as Intent)}
                  className={cn(
                    "whitespace-nowrap rounded-2xl px-2 py-2 text-[13px] font-extrabold transition sm:px-5 sm:py-2.5 sm:text-sm",
                    activeTab === tab.key
                      ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                      : "text-blue-300 hover:bg-blue-50 hover:text-blue-600"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 rounded-[22px] bg-slate-50/70 p-2.5 sm:flex-row sm:items-center sm:gap-3 sm:p-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-white px-3 py-3.5 sm:gap-3 sm:px-4 sm:py-4">
                <Search className="h-5 w-5 shrink-0 text-blue-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  placeholder="Search society, sector or landmark..."
                  className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-slate-700 outline-none placeholder:text-blue-500 sm:text-[16px]"
                />
              </div>

              <button
                type="button"
                onClick={handleSearch}
                className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-[15px] font-black text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 sm:h-[56px] sm:w-auto sm:min-w-[220px] sm:px-8 sm:text-[16px]"
              >
                Search Societies
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-3 grid max-w-[880px] grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
            <span className="col-span-2 text-[13px] font-bold text-blue-500 sm:mr-1 sm:text-[14px]">
              Popular searches:
            </span>

            {[
              { label: "DLF Crest", icon: Star },
              { label: "Golf Course Road", icon: MapPin },
              { label: "DLF Park Place", icon: Building2 },
              { label: "Pet friendly", icon: Heart },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setQuery(item.label)}
                  className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-2 text-[13px] font-extrabold text-blue-500 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 sm:justify-start sm:px-4 sm:text-[14px]"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden items-start justify-center lg:-mt-3 lg:flex lg:justify-end">
          <AIAdvisorChatBox />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 h-12 w-full sm:h-32 bg-gradient-to-t from-blue-50/70 to-transparent" />
    </section>
  );
}
