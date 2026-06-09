import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Home,
  KeyRound,
  Loader2,
  MapPin,
  MessageCircle,
  Route,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SocietyFlatsHero from "@/components/home/SocietyFlatsHero";
import {
  fetchPublicProperties,
  fetchPublicSocieties,
  propertyImage,
  propertyUrl,
  societyImage,
  formatPublicLocation,
} from "@/lib/publicData";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";

const whySocietyFlats = [
  {
    icon: Scale,
    title: "Compare Societies",
    text: "Compare societies by location, rent range, resale value, amenities, connectivity and lifestyle fit.",
  },
  {
    icon: Users,
    title: "Resident Fit",
    text: "Understand whether a society is better suited for families, professionals, pet owners, NRIs or luxury buyers.",
  },
  {
    icon: Route,
    title: "Commute Intelligence",
    text: "Check access to Cyber Hub, Golf Course Road, metro stations, schools, hospitals and office hubs.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Pricing Trends",
    text: "View indicative rent and resale ranges so you can shortlist with better confidence.",
  },
  {
    icon: CalendarCheck,
    title: "Book Visits",
    text: "Request a callback or visit for homes that match your budget, move-in timeline and society preference.",
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    text: "Use society-level insights to understand maintenance, security, amenities and daily living quality.",
  },
];

const aiPrompts = [
  "Best societies near Cyber Hub under Rs 1.2L rent",
  "Family-friendly 3BHK societies on Golf Course Road",
  "Pet-friendly societies near Sector 65",
  "Best rental yield societies in Gurgaon",
];

const reviewCards = [
  {
    name: "Rohan Mehta",
    society: "DLF The Crest",
    title: "Shortlisting became much clearer",
    text: "The society score and commute view helped us compare Golf Course Road options without jumping between five portals.",
  },
  {
    name: "Neha Arora",
    society: "M3M Golf Estate",
    title: "Better for family decisions",
    text: "We could see amenities, schools and resident fit before booking visits. That saved us a full weekend.",
  },
  {
    name: "Amit Kumar",
    society: "Sobha City",
    title: "Useful owner-side leads",
    text: "The listing flow feels focused because enquiries come with society, budget and move-in context.",
  },
];

const ownerBenefits = [
  {
    icon: KeyRound,
    title: "Verified Leads",
    text: "Enquiries from users searching by society, budget and move-in intent.",
  },
  {
    icon: Home,
    title: "Faster Closures",
    text: "Reduce random calls and focus on serious tenants and buyers.",
  },
  {
    icon: Building2,
    title: "Better Visibility",
    text: "Your property appears inside the right society profile and search results.",
  },
];


type AdvisorMatch = {
  id?: number;
  society_name: string;
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

function scoreOf(society: any, fallback = "8.2") {
  return society?.score || society?.overallScore || fallback;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function HomePage() {
  const [societies, setSocieties] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [floatingAiInput, setFloatingAiInput] = useState("");
  const [floatingAiQuery, setFloatingAiQuery] = useState("Best societies near Cyber City under Rs 1L");
  const [floatingAiReply, setFloatingAiReply] = useState("Top picks: DLF Crest, Ireo Skyon and DLF Park Place. Want a rent or family-fit view?");
  const [floatingAiMatches, setFloatingAiMatches] = useState<AdvisorMatch[]>([]);
  const [isFloatingAiLoading, setIsFloatingAiLoading] = useState(false);
  const [leadContext, setLeadContext] = useState<{
    source: string;
    title: string;
    subtitle: string;
    message: string;
    requirement: string;
  } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPublicSocieties()
      .then((items) => setSocieties(items))
      .catch((error) => console.error("Societies fetch failed:", error));
    fetchPublicProperties()
      .then((items) => setProperties(items))
      .catch((error) => console.error("Properties fetch failed:", error));
  }, []);

  const featuredSocieties = useMemo(() => societies.slice(0, 4), [societies]);
  const mapSocieties = useMemo(() => societies.slice(0, 5), [societies]);
  const featuredProperties = useMemo(
    () => properties.slice(0, 4),
    [properties],
  );
  const averageScore = useMemo(() => {
    const scores = societies
      .map((society) => Number(scoreOf(society, "0")))
      .filter((score) => Number.isFinite(score) && score > 0);
    if (!scores.length) return "8.2";
    return (
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    ).toFixed(1);
  }, [societies]);

  const openLead = (context: typeof leadContext) => {
    if (!context) return;
    setLeadContext(context);
  };

  const submitFloatingAi = async () => {
    const cleanQuery = floatingAiInput.trim();
    if (!cleanQuery || isFloatingAiLoading) return;

    setFloatingAiQuery(cleanQuery);
    setFloatingAiInput("");
    setIsFloatingAiLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/ai/advisor`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: cleanQuery, intent: "rent" }),
      });

      if (!response.ok) throw new Error("Floating AI request failed");

      const payload = await response.json();
      const matches = Array.isArray(payload?.matches) ? payload.matches.slice(0, 3) : [];
      setFloatingAiMatches(matches);
      setFloatingAiReply(
        payload?.reply ||
          (matches.length
            ? "I found the closest society matches from the live SocietyFlats database. Open a result to view society details and available homes."
            : "No exact live match was found yet. Try a society name, sector, budget or request a callback."),
      );
    } catch (error) {
      console.error("Floating AI search failed:", error);
      setFloatingAiMatches([]);
      setFloatingAiReply("I could not fetch live AI matches right now. Please try again or schedule a callback.");
    } finally {
      setIsFloatingAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SocietyFlatsHero />

      <section className="border-y border-navy-100 bg-white/95">
        <div className="container mx-auto grid grid-cols-2 gap-2 px-4 py-2.5 md:grid-cols-5 md:gap-0 md:divide-x md:divide-navy-100 md:px-4 md:py-0">
          {[
            {
              icon: Building2,
              value: "150+",
              label: "Gurgaon societies",
              tone: "bg-blue-50 text-blue-700",
            },
            {
              icon: Home,
              value: `${properties.length || "2,500+"}`,
              label: "Homes reviewed",
              tone: "bg-emerald-50 text-emerald-700",
            },
            {
              icon: MessageCircle,
              value: "24 hrs",
              label: "Callback support",
              tone: "bg-violet-50 text-violet-700",
            },
            {
              icon: Star,
              value: averageScore,
              label: "Avg society score",
              tone: "bg-gold-100 text-gold-700",
            },
            {
              icon: Sparkles,
              value: "AI Advisor",
              label: "Smart shortlists",
              tone: "bg-blue-50 text-blue-700",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            const mobileVisibility =
              stat.label === "Smart shortlists" ? "hidden md:flex" : "flex";
            return (
              <div
                key={stat.label}
                className={`${mobileVisibility} items-center gap-2 rounded-xl border border-navy-100 bg-white p-2 shadow-sm md:col-span-1 md:gap-3 md:rounded-none md:border-0 md:p-0 md:px-4 md:py-4 md:shadow-none`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl md:h-10 md:w-10 ${stat.tone}`}
                >
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                </span>
                <div>
                  <p className="text-[22px] font-black leading-none text-navy-950 md:text-xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[12px] font-semibold leading-4 text-navy-500 md:text-xs">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white px-4 py-8 md:py-10">
        <div className="container mx-auto">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Curated for Gurgaon
              </p>
              <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-navy-950 md:text-4xl">
                Featured societies in Gurgaon
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500 md:text-[15px] md:leading-6">
                <span className="md:hidden">
                  Compare Gurgaon societies by rent, resale and lifestyle fit.
                </span>
                <span className="hidden md:inline">
                  Explore premium Gurgaon societies with rent ranges, resale
                  trends, lifestyle fit, location strengths and available homes.
                </span>
              </p>
            </div>
            <Link to="/search?tab=societies">
              <Button
                variant="outline"
                className="h-10 rounded-full border-blue-100 bg-white px-4 text-sm font-extrabold text-blue-700 hover:bg-blue-50"
              >
                View all societies <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {featuredSocieties.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featuredSocieties.map((society) => (
                <Link
                  key={society.id}
                  to={`/society/${society.slug}`}
                  className="group overflow-hidden rounded-[1.25rem] border border-navy-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-premium"
                >
                  <div className="relative h-32 overflow-hidden bg-blue-50 md:h-36">
                    <img
                      src={societyImage(society)}
                      alt={society.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-950/30 via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-black text-navy-950 shadow-sm">
                      <Star className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />
                      {scoreOf(society)}
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                      Verified
                    </span>
                  </div>
                  <div className="p-3 md:p-3.5">
                    <h3 className="line-clamp-1 text-base font-black text-navy-950 transition group-hover:text-blue-700 md:text-lg">
                      {society.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-navy-500">
                      <MapPin className="h-3.5 w-3.5" />{" "}
                      {formatPublicLocation(society)}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-ivory-100 p-2.5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-navy-300">
                          Rent
                        </p>
                        <p className="mt-1 text-xs font-black text-navy-950">
                          {society.rentRange || "On request"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.08em] text-navy-300">
                          Resale
                        </p>
                        <p className="mt-1 text-xs font-black text-navy-950">
                          {society.buyRange || "On request"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 hidden grid-cols-5 gap-1 sm:grid">
                      {["Loc", "Sec", "Ame", "ROI", "Fit"].map(
                        (label, index) => (
                          <div key={label} className="text-center">
                            <div className="h-1.5 overflow-hidden rounded-full bg-blue-50">
                              <div
                                className="h-full rounded-full bg-blue-700"
                                style={{ width: `${78 + index * 4}%` }}
                              />
                            </div>
                            <p className="mt-1 text-[9px] font-bold text-navy-300">
                              {label}
                            </p>
                          </div>
                        ),
                      )}
                    </div>
                    <span className="mt-3 inline-flex items-center text-sm font-black text-blue-700">
                      View Society{" "}
                      <ArrowRight className="ml-1 h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-navy-200 bg-ivory-100 p-6 text-navy-500">
              Gurgaon society profiles are being added. Use admin to publish
              verified society pages.
            </div>
          )}
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-ivory-100 px-4 py-8 md:py-10">
        <div className="absolute right-[-10rem] top-[-12rem] h-[36rem] w-[36rem] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute left-[-8rem] bottom-[-14rem] h-[32rem] w-[32rem] rounded-full bg-gold-200/25 blur-3xl" />
        <div className="container relative mx-auto grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700 shadow-sm">
              <Sparkles className="h-4 w-4" /> AI Advisor
            </span>

            <h2 className="mt-3 font-display text-2xl font-black leading-tight tracking-tight text-navy-950 md:mt-4 md:text-4xl">
              Find your best-fit society faster.
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-navy-500 md:mt-3 md:text-[15px] md:leading-6">
              Tell us your budget, commute and lifestyle preference. SocietyFlats AI turns it into a ranked Gurgaon shortlist.
            </p>

            <div className="mt-5 grid gap-2">
              {[
                {
                  icon: MessageCircle,
                  title: "Ask in plain English",
                  text: "Example: 3BHK near Cyber City under Rs 1L.",
                  href: "/chat",
                },
                {
                  icon: Sparkles,
                  title: "Get ranked matches",
                  text: "Shortlist by budget, commute, security and family fit.",
                  href: "/recommendations",
                },
                {
                  icon: Building2,
                  title: "Open society pages",
                  text: "View score, rent range, resale signals and available homes.",
                  href: "/ai-advisor",
                },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <Link
                    key={feature.title}
                    to={feature.href}
                    className="flex items-center gap-3 rounded-[1.1rem] border border-blue-100 bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-soft"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-navy-950">
                        {feature.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-5 text-navy-500">
                        {feature.text}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/ai-advisor">
                <Button className="h-10 rounded-full bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800">
                  Ask AI Advisor <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/search?tab=societies">
                <Button
                  variant="outline"
                  className="h-10 rounded-full border-blue-100 bg-white px-5 text-sm font-bold text-blue-700 hover:bg-blue-50"
                >
                  Browse societies
                </Button>
              </Link>
            </div>
          </div>

          <div className="hidden rounded-[1.35rem] border border-blue-100 bg-white/95 p-4 shadow-soft md:block">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-black text-navy-950">Live AI shortlist</p>
                  <p className="text-xs font-semibold text-navy-400">
                    Sample Gurgaon match flow
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                Rent
              </span>
            </div>

            <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-navy-400">
                    Requirement
                  </p>
                  <p className="mt-1 text-xl font-black text-navy-950">
                    3BHK near Cyber City
                  </p>
                </div>
                <p className="text-right text-sm font-black text-blue-700">
                  Rs 85K/mo
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {["Security", "Commute", "Family", "Budget"].map((priority) => (
                  <span
                    key={priority}
                    className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-black text-blue-700"
                  >
                    {priority}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {(featuredSocieties.length
                ? featuredSocieties
                : [
                    { name: "DLF The Crest" },
                    { name: "M3M Golf Estate" },
                    { name: "Sobha City" },
                  ]
              )
                .slice(0, 3)
                .map((society, index) => (
                  <Link
                    key={society.name}
                    to={society.slug ? `/society/${society.slug}` : "/search?tab=societies"}
                    className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white p-2.5 transition hover:bg-blue-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-700 text-xs font-black text-white">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-sm font-black text-navy-950">
                      {society.name}
                    </p>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                      {92 - index * 5}% match
                    </span>
                  </Link>
                ))}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {aiPrompts.slice(0, 2).map((prompt) => (
                <Link
                  key={prompt}
                  to={`/ai-advisor?q=${encodeURIComponent(prompt)}`}
                  className="rounded-xl border border-blue-100 bg-ivory-100 px-3 py-2.5 text-xs font-bold text-navy-600 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  {prompt}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-ivory-100 px-4 py-10 md:hidden">
        <div className="container mx-auto rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-sm">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Maps and lifestyle
          </p>
          <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-navy-950">
            See society location strength.
          </h2>
          <p className="mt-3 text-sm leading-6 text-navy-500">
            Check metro, schools, hospitals and office access before visiting.
          </p>
          <Link to="/maps" className="mt-5 inline-flex">
            <Button className="rounded-full bg-blue-700 px-5 font-black text-white hover:bg-blue-800">
              Explore Map Intelligence <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="hidden bg-ivory-100 px-4 py-14 md:block">
        <div className="container mx-auto grid gap-6 lg:grid-cols-[20rem_1fr]">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
              Maps and lifestyle
            </p>
            <h2 className="font-display text-4xl font-black leading-tight tracking-tight text-navy-950">
              See societies by location strength.
            </h2>
            <p className="mt-3 text-base leading-7 text-navy-500">
              Map intelligence turns nearby metro, schools, hospitals and office
              hubs into a shortlist you can actually act on.
            </p>
            <div className="mt-6 space-y-3">
              {(mapSocieties.length
                ? mapSocieties
                : [
                    { name: "DLF The Crest", sector: "Sector 54" },
                    { name: "M3M Golf Estate", sector: "Sector 65" },
                    { name: "Sobha City", sector: "Sector 108" },
                  ]
              )
                .slice(0, 4)
                .map((society, index) => (
                  <Link
                    key={society.name}
                    to={
                      society.slug
                        ? `/society/${society.slug}`
                        : "/search?tab=societies"
                    }
                    className="flex items-center gap-2 rounded-xl border border-navy-100 bg-white p-2.5 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-700">
                      {scoreOf(society, `${8.8 - index * 0.3}`)}
                    </span>
                    <div>
                      <p className="text-sm font-black text-navy-950">
                        {society.name}
                      </p>
                      <p className="text-xs font-semibold text-navy-400">
                        {society.sector || formatPublicLocation(society)}
                      </p>
                    </div>
                  </Link>
                ))}
            </div>
          </div>

          <div className="relative min-h-[28rem] overflow-hidden rounded-[1.75rem] border border-navy-100 bg-[#dce8f0] shadow-soft">
            <div className="absolute inset-0 opacity-70">
              {[20, 44, 68].map((top) => (
                <span
                  key={`h-${top}`}
                  className="absolute left-0 right-0 h-2 bg-white"
                  style={{ top: `${top}%` }}
                />
              ))}
              {[18, 38, 58, 78].map((left) => (
                <span
                  key={`v-${left}`}
                  className="absolute bottom-0 top-0 w-2 bg-white"
                  style={{ left: `${left}%` }}
                />
              ))}
            </div>
            {[
              {
                left: 30,
                top: 28,
                score: "9.1",
                tone: "bg-emerald-500",
                name: "DLF Crest",
              },
              {
                left: 55,
                top: 42,
                score: "8.7",
                tone: "bg-blue-600",
                name: "M3M Golf",
              },
              {
                left: 72,
                top: 60,
                score: "8.4",
                tone: "bg-blue-600",
                name: "Sobha City",
              },
              {
                left: 42,
                top: 68,
                score: "7.9",
                tone: "bg-gold-500",
                name: "Ireo Skyon",
              },
            ].map((pin) => (
              <div
                key={pin.name}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pin.left}%`, top: `${pin.top}%` }}
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full border-4 border-white text-sm font-black text-white shadow-xl ${pin.tone}`}
                >
                  {pin.score}
                </span>
              </div>
            ))}
            <div className="absolute bottom-5 right-5 rounded-full bg-white/90 px-4 py-2 text-xs font-black text-blue-700 shadow-sm backdrop-blur">
              Map preview · connect live maps API later
            </div>
          </div>
        </div>
      </section>

      <section className="hidden bg-white px-4 py-14 md:block">
        <div className="container mx-auto grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Market insights
            </p>
            <h2 className="font-display text-4xl font-black leading-tight tracking-tight text-navy-950">
              Pricing, demand and society signals in one view.
            </h2>
            <p className="mt-3 text-base leading-7 text-navy-500">
              Intelligence turns society data into better conversations before
              visits, callbacks and final decisions.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {whySocietyFlats.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm"
                  >
                    <Icon className="h-5 w-5 text-blue-700" />
                    <h3 className="mt-3 text-base font-black text-navy-950">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-navy-500">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-navy-100 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-black text-navy-950">
                  Gurgaon rent velocity
                </p>
                <p className="text-sm font-semibold text-navy-400">
                  Indicative trend layer for society decisions
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                +12% QoQ
              </span>
            </div>
            <div className="flex h-44 items-end gap-2">
              {[48, 62, 54, 76, 70, 88, 80, 95, 78, 92, 98, 90].map(
                (height, index) => (
                  <div
                    key={index}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <span
                      className="w-full rounded-t-lg bg-blue-700"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[10px] font-bold text-navy-300">
                      {index + 1}
                    </span>
                  </div>
                ),
              )}
            </div>
            <div className="mt-6 overflow-hidden rounded-2xl border border-navy-100">
              {[
                "Golf Course Road",
                "Golf Course Extension",
                "Dwarka Expressway",
                "Sohna Road",
              ].map((locality, index) => (
                <div
                  key={locality}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-navy-50 px-4 py-3 last:border-b-0"
                >
                  <p className="text-sm font-black text-navy-950">{locality}</p>
                  <p className="text-sm font-black text-navy-700">
                    Rs {90 - index * 8}K avg
                  </p>
                  <p className="text-sm font-black text-emerald-700">
                    +{12 - index}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {featuredProperties.length > 0 ? (
        <section className="bg-white px-4 py-10 md:py-12">
          <div className="container mx-auto">
            <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Live Inventory
                </p>
                <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-navy-950 md:text-5xl">
                  Latest verified homes
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-navy-500 md:text-base md:leading-7">
                  <span className="md:hidden">
                    Fresh verified homes in Gurgaon societies.
                  </span>
                  <span className="hidden md:inline">
                    Fresh rental and resale homes from Gurgaon societies,
                    verified before they reach serious tenants and buyers.
                  </span>
                </p>
              </div>
              <Link to="/search?tab=rent">
                <Button className="rounded-full bg-blue-700 px-6 font-black text-white hover:bg-blue-800">
                  View all homes <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="flex gap-5 overflow-x-auto pb-3 scrollbar-hide">
              {featuredProperties.map((property) => (
                <Link
                  key={property.id}
                  to={propertyUrl(property)}
                  className="group w-[18rem] shrink-0 overflow-hidden rounded-[1.5rem] border border-navy-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-premium md:w-[22rem]"
                >
                  <div className="relative h-44 overflow-hidden bg-blue-50 md:h-56">
                    <img
                      src={propertyImage(property)}
                      alt={property.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-black text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  </div>
                  <div className="p-4 md:p-5">
                    <p className="text-sm font-bold text-blue-700">
                      {property.listingType || "Rent"}
                    </p>
                    <h3 className="mt-2 text-lg font-black text-navy-950 md:text-xl">
                      {property.title}
                    </h3>
                    <p className="mt-1 text-sm text-navy-500">
                      {property.society} · {property.locality}
                    </p>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-navy-300">
                          Price
                        </p>
                        <p className="text-xl font-black text-navy-950">
                          {property.price || "On request"}
                        </p>
                      </div>
                      <p className="text-right text-sm font-semibold text-navy-500">
                        {property.bedrooms || "-"} BHK
                        <br />
                        {property.areaSqft || "-"} sq.ft
                      </p>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2 text-center text-xs font-black">
                      <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">
                        Request Callback
                      </span>
                      <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">
                        Shortlist
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-white px-4 py-10 md:py-12">
          <div className="container mx-auto rounded-[1.5rem] border border-dashed border-navy-200 bg-ivory-100 p-5 shadow-sm md:p-7">
            <h2 className="font-display text-3xl font-black text-navy-950">
              Verified homes are being added.
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-navy-500">
              We are updating live inventory for Gurgaon societies. Request a
              callback and our team will help you find matching homes.
            </p>
            <Button
              onClick={() =>
                openLead({
                  source: "homepage_empty_inventory",
                  title: "Request a SocietyFlats callback",
                  subtitle:
                    "Share your requirement and our team will help you find matching Gurgaon homes.",
                  message: "I want a callback for Gurgaon society rentals.",
                  requirement:
                    "Help me find matching homes from the homepage inventory section.",
                })
              }
              className="mt-5 rounded-full bg-blue-700 px-6 font-black text-white hover:bg-blue-800"
            >
              Request Callback
            </Button>
          </div>
        </section>
      )}

      <section className="hidden bg-ivory-100 px-4 py-14 md:block">
        <div className="container mx-auto">
          <div className="mb-8 max-w-3xl">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Reviews and confidence
            </p>
            <h2 className="font-display text-4xl font-black leading-tight tracking-tight text-navy-950">
              Trust signals stay inside the journey.
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {reviewCards.map((review) => (
              <div
                key={review.name}
                className="rounded-[1.5rem] border border-navy-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700">
                    {initials(review.name)}
                  </span>
                  <div>
                    <p className="font-black text-navy-950">{review.name}</p>
                    <p className="text-xs font-semibold text-navy-400">
                      Verified enquiry · {review.society}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex text-gold-500">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <h3 className="mt-3 text-lg font-black text-navy-950">
                  {review.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-navy-500">
                  {review.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="hidden relative overflow-hidden bg-blue-50 px-4 py-14 md:block">
        <div className="absolute left-[-10rem] top-[-12rem] h-[30rem] w-[30rem] rounded-full bg-white/70 blur-3xl" />
        <div className="container relative mx-auto grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Broker CRM
            </p>
            <h2 className="font-display text-4xl font-black leading-tight tracking-tight text-navy-950 md:text-5xl">
              Leads move from enquiry to visit without chaos.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-navy-500">
              Admin, broker and owner workflows connect to the same
              society-first profile, so every callback has context.
            </p>
            <div className="mt-6 space-y-3">
              {[
                {
                  icon: MessageCircle,
                  title: "Callback queue",
                  text: "Every enquiry lands with society, budget and intent.",
                },
                {
                  icon: BarChart3,
                  title: "Analytics",
                  text: "Track searches, views, leads and high-demand societies.",
                },
                {
                  icon: ShieldCheck,
                  title: "Verification workflow",
                  text: "Images, official URLs and RERA notes remain review-first.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex gap-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-black text-navy-950">{item.title}</p>
                      <p className="text-sm leading-6 text-navy-500">
                        {item.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-blue-100 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-black text-navy-950">Lead pipeline</p>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                Live CRM
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {["New", "Contacted", "Visit"].map((stage, stageIndex) => (
                <div
                  key={stage}
                  className="rounded-2xl border border-blue-100 bg-ivory-100 p-3"
                >
                  <p className="mb-3 text-center text-xs font-black uppercase tracking-[0.12em] text-navy-400">
                    {stage}
                  </p>
                  {[0, 1, 2].map((lead) => (
                    <div
                      key={lead}
                      className="mb-2 rounded-xl border border-blue-100 bg-white p-3 last:mb-0"
                    >
                      <p className="text-sm font-black text-navy-950">
                        {["Rahul", "Neha", "Amit"][lead]}
                      </p>
                      <p className="mt-1 text-xs text-navy-400">
                        {
                          ["DLF Crest", "M3M Golf", "Sobha City"][
                            (lead + stageIndex) % 3
                          ]
                        }
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 md:py-14">
        <div className="container mx-auto grid gap-6 md:gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              For Property Owners
            </p>
            <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-navy-950 md:text-4xl">
              <span className="md:hidden">List your Gurgaon flat.</span>
              <span className="hidden md:inline">
                Own a flat in Gurgaon? List it with SocietyFlats.
              </span>
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-navy-500 md:text-base md:leading-7">
              <span className="md:hidden">
                Get verified tenant and buyer enquiries from society-focused
                users.
              </span>
              <span className="hidden md:inline">
                Reach serious tenants and buyers looking specifically inside
                verified Gurgaon societies. Add your property once and receive
                qualified enquiries through a cleaner, society-first flow.
              </span>
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/sell">
                <Button className="w-full rounded-full bg-blue-700 px-6 font-black text-white hover:bg-blue-800 md:w-auto">
                  List Property
                </Button>
              </Link>
              <Button
                onClick={() =>
                  openLead({
                    source: "homepage_owner_talk",
                    title: "Talk to SocietyFlats",
                    subtitle:
                      "Tell us about your flat or requirement. We will route it to the right lead flow.",
                    message:
                      "I want to talk to SocietyFlats about listing or finding a property.",
                    requirement:
                      "Owner/listing or property requirement from homepage CTA.",
                  })
                }
                variant="outline"
                className="w-full rounded-full border-navy-200 bg-white px-6 font-black text-navy-800 hover:bg-blue-50 md:w-auto"
              >
                Talk to Us
              </Button>
            </div>
          </div>
          <div className="hidden gap-4 sm:grid-cols-3 md:grid">
            {ownerBenefits.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to="/sell"
                  className="rounded-[1.35rem] border border-navy-100 bg-ivory-100 p-5 transition hover:-translate-y-1 hover:bg-white hover:shadow-soft"
                >
                  <Icon className="h-6 w-6 text-blue-700" />
                  <h3 className="mt-5 font-black text-navy-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-navy-500">
                    {item.text}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <PublicLeadModal
        open={Boolean(leadContext)}
        title={leadContext?.title || "Request callback"}
        subtitle={leadContext?.subtitle}
        source={leadContext?.source || "homepage_cta"}
        defaultMessage={leadContext?.message}
        defaultRequirement={leadContext?.requirement}
        submitLabel="Request callback"
        onClose={() => setLeadContext(null)}
      />

      {chatOpen ? (
        <div className="fixed bottom-[5.5rem] right-5 z-40 w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white shadow-premium md:bottom-6 md:right-6 md:w-[22rem]">
          <div className="flex items-center gap-3 border-b border-blue-100 bg-blue-50 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-700 text-sm font-black text-white">
              AI
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-navy-950">SocietyFlats AI</p>
              <p className="text-xs font-semibold text-emerald-700">
                Online · Gurgaon expert
              </p>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy-400 transition hover:text-navy-950"
              aria-label="Collapse SocietyFlats AI chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 p-4">
            <div className="max-w-[88%] rounded-2xl bg-ivory-100 px-4 py-3 text-sm font-semibold leading-6 text-navy-600">
              Hi. I can help you find the right Gurgaon society based on budget,
              commute and lifestyle.
            </div>
            <div className="ml-auto max-w-[82%] rounded-2xl bg-blue-700 px-4 py-3 text-sm font-bold leading-6 text-white">
              {floatingAiQuery}
            </div>
            <div className="max-w-[92%] rounded-2xl bg-ivory-100 px-4 py-3 text-sm font-semibold leading-6 text-navy-600">
              {isFloatingAiLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Finding live matches...
                </span>
              ) : (
                floatingAiReply
              )}
            </div>
            {floatingAiMatches.length > 0 ? (
              <div className="space-y-2">
                {floatingAiMatches.map((match, index) => (
                  <Link
                    key={`${match.id || index}-${match.society_name}`}
                    to={match.slug ? `/society/${match.slug}` : `/search?q=${encodeURIComponent(floatingAiQuery)}&intent=general`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-sm font-black text-navy-900 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="min-w-0 truncate">
                      {index + 1}. {match.society_name}
                      <span className="ml-1 text-xs font-bold text-blue-500">
                        {match.sector || match.locality || "Gurgaon"}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-blue-600" />
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link
                to="/compare"
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
              >
                Compare
              </Link>
              <Link
                to={`/search?q=${encodeURIComponent(floatingAiQuery)}&intent=general`}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
              >
                Open results
              </Link>
              <button
                type="button"
                onClick={() =>
                  openLead({
                    source: "floating_chat_callback",
                    title: "Schedule a SocietyFlats callback",
                    subtitle:
                      "Share your Gurgaon society requirement and we will call you back.",
                    message:
                      "I want to schedule a callback from the floating AI chat.",
                    requirement: "Callback requested from floating AI chat.",
                  })
                }
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-100"
              >
                Schedule callback
              </button>
            </div>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitFloatingAi();
            }}
            className="flex items-center gap-2 border-t border-blue-100 bg-white p-3"
          >
            <input
              value={floatingAiInput}
              onChange={(event) => setFloatingAiInput(event.target.value)}
              aria-label="Ask SocietyFlats AI"
              className="min-w-0 flex-1 rounded-full border border-blue-100 bg-ivory-100 px-4 py-2.5 text-sm font-semibold text-navy-700 outline-none placeholder:text-navy-300"
              placeholder="Ask about any society..."
            />
            <button
              type="submit"
              disabled={!floatingAiInput.trim() || isFloatingAiLoading}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-700 text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Search with SocietyFlats AI"
            >
              {isFloatingAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex h-[58px] w-[58px] items-center justify-center rounded-full bg-blue-700 text-white shadow-premium transition hover:scale-105 hover:bg-blue-800 md:bottom-6 md:right-6 md:h-14 md:w-14"
          aria-label="Open SocietyFlats AI chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
