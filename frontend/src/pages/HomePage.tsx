
// C70C public content rewrite phase 1: Choose the right society before the home. Trust, verification, market insight and expert callback CTAs are now reinforced.\n// C69 SEO copy foundation: SocietyFlats is Gurgaon-first, society-first real estate intelligence for verified societies, available homes, owner listings, broker partners, AI recommendations, market insights, commute context and WhatsApp/callback conversion.
import { trackAiPromptSubmitted, trackEvent, trackResultClicked, trackSearchPerformed } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  Bot,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Home,
  KeyRound,
  Loader2,
  MapPin,
  MapPinned,
  MessageCircle,
  Phone,
  Route,
  Scale,
  Search,
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
import { setPublicSeo } from "@/lib/seo";

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

function isPublicLiveProperty(property: any) {
  const rawStatus = String(
    property?.status ||
      property?.publication_status ||
      property?.publicationStatus ||
      "",
  ).toLowerCase();

  const explicitlyPublished =
    property?.is_published === true ||
    property?.isPublished === true ||
    property?.published === true ||
    Boolean(property?.published_at || property?.publishedAt);

  if (explicitlyPublished) return true;

  return rawStatus === "live" || rawStatus === "published" || rawStatus === "active";
}

function filterPublicLiveProperties(properties: any[]) {
  return Array.isArray(properties) ? properties.filter(isPublicLiveProperty) : [];
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
    setPublicSeo(
      "Verified Gurgaon Societies & Flats | SocietyFlats",
      "Choose the right Gurgaon society before the home. Compare verified societies, legal-ready homes, market insights and request expert callbacks.",
    );
    window.scrollTo(0, 0);
    fetchPublicSocieties()
      .then((items) => setSocieties(items))
      .catch((error) => console.error("Societies fetch failed:", error));
    fetchPublicProperties()
      .then((items) => setProperties(filterPublicLiveProperties(items)))
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
              label: "Verified societies",
              tone: "bg-blue-50 text-blue-700",
            },
            {
              icon: Home,
              value: `${properties.length || "2,500+"}`,
              label: "Verified homes",
              tone: "bg-emerald-50 text-emerald-700",
            },
            {
              icon: MessageCircle,
              value: "24 hrs",
              label: "Expert callbacks",
              tone: "bg-violet-50 text-violet-700",
            },
            {
              icon: Star,
              value: averageScore,
              label: "Society rating",
              tone: "bg-gold-100 text-gold-700",
            },
            {
              icon: Sparkles,
              value: "AI Advisor",
              label: "AI shortlists",
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

      <section className="bg-white px-4 py-6 md:py-7">
        <div className="container mx-auto">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                25-point society intelligence
              </p>
              <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-navy-950 md:text-4xl">
                Choose the right society first
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500 md:text-[15px] md:leading-6">
                <span className="md:hidden">
                  Compare verified Gurgaon societies by security, governance, commute, pricing and lifestyle fit.
                </span>
                <span className="hidden md:inline">
                  Explore verified Gurgaon societies with rent ranges, resale trends, lifestyle fit, commute strength, governance signals and available homes.
                </span>
              </p>
            </div>
            <Link to="/search?tab=societies">
              <Button
                variant="outline"
                className="h-10 rounded-full border-blue-100 bg-white px-4 text-sm font-extrabold text-blue-700 hover:bg-blue-50"
              >
                Explore verified societies <ArrowRight className="ml-2 h-4 w-4" />
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
                      View society intelligence{" "}
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


      <section className="bg-white px-4 py-6 md:py-7">
        <div className="container mx-auto">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Start with trusted Gurgaon searches
              </p>
              <h2 className="mt-2 font-display text-2xl font-black leading-tight text-navy-950 md:text-3xl">
                Search by sector, builder or intent — then compare societies before choosing a home.
              </h2>
            </div>
            <Link
              to="/gurgaon"
              className="inline-flex items-center text-sm font-black text-blue-700 hover:text-blue-800"
            >
              View Gurgaon guide
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: "Prime localities",
                subtitle: "Sector and road-based search",
                icon: MapPinned,
                links: [
                  ["Sector 65", "/gurgaon/sector-65"],
                  ["Golf Course Road", "/gurgaon/golf-course-road"],
                  ["Dwarka Expressway", "/gurgaon/dwarka-expressway"],
                ],
              },
              {
                title: "Top builders",
                subtitle: "Brand-led society discovery",
                icon: Building2,
                links: [
                  ["DLF", "/builder/dlf"],
                  ["M3M", "/builder/m3m"],
                  ["Emaar", "/builder/emaar"],
                ],
              },
              {
                title: "User intent",
                subtitle: "Rent, resale and AI matching",
                icon: Search,
                links: [
                  ["Rentals", "/search?tab=rent"],
                  ["Resale", "/search?tab=buy"],
                  ["AI shortlist", "/ai-advisor"],
                ],
              },
            ].map((group) => {
              const Icon = group.icon;
              return (
                <div
                  key={group.title}
                  className="group relative overflow-hidden rounded-[1.35rem] border border-blue-100 bg-gradient-to-br from-white to-blue-50/65 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-soft"
                >
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-100/60" />
                  <div className="relative">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-md shadow-blue-100">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-black text-navy-950">
                      {group.title}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-navy-400">
                      {group.subtitle}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {group.links.map(([label, href]) => (
                        <Link
                          key={href}
                          to={href}
                          className="rounded-full border border-blue-100 bg-white/90 px-3 py-1.5 text-xs font-black text-blue-700 transition hover:bg-blue-700 hover:text-white"
                        >
                          {label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {featuredProperties.length > 0 ? (
        <section className="bg-white px-4 py-6 md:py-7">
          <div className="container mx-auto">
            <div className="mb-5 flex flex-col gap-4 md:mb-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                  Live Inventory
                </p>
                <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-navy-950 md:text-4xl">
                  Verified homes in trusted societies
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-500 md:text-[15px] md:leading-6">
                  <span className="md:hidden">
                    Fresh homes inside verified Gurgaon societies.
                  </span>
                  <span className="hidden md:inline">
                    Fresh rental and resale homes from Gurgaon societies, reviewed for society context, pricing clarity and serious buyer/tenant enquiries.
                  </span>
                </p>
              </div>
              <Link to="/search?tab=rent">
                <Button className="h-10 rounded-full bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800">
                  View verified homes <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
              {featuredProperties.map((property) => (
                <Link
                  key={property.id}
                  to={propertyUrl(property)}
                  className="group w-[17rem] shrink-0 overflow-hidden rounded-[1.25rem] border border-navy-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-premium md:w-[19rem]"
                >
                  <div className="relative h-32 overflow-hidden bg-blue-50 md:h-36">
                    <img
                      src={propertyImage(property)}
                      alt={property.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-1 text-[11px] font-black text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  </div>
                  <div className="p-3.5 md:p-4">
                    <p className="text-xs font-black uppercase tracking-[0.08em] text-blue-700">
                      {property.listingType || "Rent"}
                    </p>
                    <h3 className="mt-1.5 line-clamp-2 text-base font-black leading-snug text-navy-950 md:text-lg">
                      {property.title}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-navy-500">
                      {property.society} · {property.locality}
                    </p>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-navy-300">
                          Price
                        </p>
                        <p className="text-lg font-black text-navy-950">
                          {property.price || "On request"}
                        </p>
                      </div>
                      <p className="text-right text-xs font-semibold leading-5 text-navy-500">
                        {property.bedrooms || "-"} BHK
                        <br />
                        {property.areaSqft || "-"} sq.ft
                      </p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px] font-black">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1.5 text-blue-700">
                        Request expert callback
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-emerald-700">
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
        <section className="bg-white px-4 py-6 md:py-7">
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


      <section className="bg-white px-4 py-6 md:py-7">
        <div className="container mx-auto">
          <div className="rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                  <Bot className="h-4 w-4" />
                  AI Advisor
                </span>
                <h2 className="mt-3 font-display text-2xl font-black leading-tight text-navy-950 md:text-3xl">
                  Not sure which society fits you?
                </h2>
                <p className="mt-2 text-sm leading-6 text-navy-500">
                  Use SocietyFlats AI to shortlist societies by budget, commute, family needs, lifestyle fit and investment potential.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Link to="/ai-advisor">
                  <Button className="h-11 rounded-full bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800">
                    Ask SocietyFlats AI
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/search?tab=societies&intent=general">
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-blue-100 bg-white px-5 text-sm font-black text-blue-700 hover:bg-blue-50"
                  >
                    Browse verified societies
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {aiPrompts.slice(0, 3).map((prompt) => (
                <Link
                  key={prompt}
                  to={`/ai-advisor?q=${encodeURIComponent(prompt)}`}
                  className="rounded-2xl border border-blue-100 bg-blue-50/45 px-4 py-3 text-sm font-bold leading-6 text-navy-700 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  {prompt}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-blue-50/40 px-4 py-8 md:hidden">
        <div className="container mx-auto rounded-[1.25rem] border border-blue-100 bg-white p-4 shadow-sm">
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
            Location intelligence
          </p>
          <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-navy-950">
            Check commute before you visit.
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-navy-500">
            Compare metro access, schools, hospitals, office hubs and daily convenience before booking a visit.
          </p>
          <Link to="/maps" className="mt-4 inline-flex">
            <Button className="h-10 rounded-full bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800">
              Explore Map Intelligence <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="hidden bg-blue-50/35 px-4 py-10 md:block">
        <div className="container mx-auto grid gap-6 lg:grid-cols-[18rem_1fr]">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
              Maps and lifestyle
            </p>
            <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-navy-950">
              See societies by commute strength.
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-navy-500">
              Map intelligence turns metro access, schools, hospitals and office hubs into a practical shortlist before you visit.
            </p>
            <div className="mt-5 space-y-2">
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
                    className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white p-2.5 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
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

          <div className="relative min-h-[22rem] overflow-hidden rounded-[1.35rem] border border-blue-100 bg-[#eaf3fb] shadow-soft">
            <div className="absolute inset-0 opacity-60">
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
                tone: "bg-blue-500",
                name: "Ireo Skyon",
              },
            ].map((pin) => (
              <div
                key={pin.name}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pin.left}%`, top: `${pin.top}%` }}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white text-xs font-black text-white shadow-xl ${pin.tone}`}
                >
                  {pin.score}
                </span>
              </div>
            ))}
            <div className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-black text-blue-700 shadow-sm backdrop-blur">
              Map preview · connect live maps API later
            </div>
          </div>
        </div>
      </section>

      <section className="hidden bg-white px-4 py-5 md:block">
        <div className="container mx-auto">
          <div className="grid gap-4 rounded-[1.35rem] border border-blue-100 bg-gradient-to-br from-white to-blue-50/45 p-4 shadow-sm lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
                Market insights
              </p>
              <h2 className="mt-2 font-display text-2xl font-black leading-tight text-navy-950">
                Pricing, demand and investment signals.
              </h2>
              <p className="mt-2 text-sm leading-6 text-navy-500">
                A quick market view to compare rent trends, demand signals and society-level investment strength.
              </p>
              <Link
                to="/insights"
                className="mt-3 inline-flex items-center text-sm font-black text-blue-700 hover:text-blue-800"
              >
                Open market insights
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              {[
                ["Golf Course Road", "Rs 90K", "+12%", "High demand"],
                ["Golf Course Ext.", "Rs 82K", "+11%", "Family demand"],
                ["Dwarka Expressway", "Rs 74K", "+10%", "Rising supply"],
                ["Sohna Road", "Rs 66K", "+9%", "Value picks"],
              ].map(([locality, average, trend, signal]) => (
                <div
                  key={locality}
                  className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm"
                >
                  <p className="text-xs font-black text-navy-950">{locality}</p>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="text-xl font-black text-navy-950">{average}</p>
                    <p className="text-sm font-black text-emerald-700">{trend}</p>
                  </div>
                  <p className="mt-2 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                    {signal}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="hidden bg-blue-50/35 px-4 py-10 md:block">
        <div className="container mx-auto">
          <div className="mb-6 max-w-3xl">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-blue-700">
              Trust and verified enquiries
            </p>
            <h2 className="font-display text-3xl font-black leading-tight tracking-tight text-navy-950">
              Society-first decisions need proof, not guesswork.
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {reviewCards.map((review) => (
              <div
                key={review.name}
                className="rounded-[1.2rem] border border-blue-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-700">
                    {initials(review.name)}
                  </span>
                  <div>
                    <p className="text-sm font-black text-navy-950">{review.name}</p>
                    <p className="text-xs font-semibold text-navy-400">
                      Verified enquiry · {review.society}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex text-gold-500">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <h3 className="mt-2 text-base font-black text-navy-950">
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

      <section className="bg-white px-4 py-6 md:py-7">
        <div className="container mx-auto grid gap-5 md:gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              For owners
            </p>
            <h2 className="font-display text-2xl font-black leading-tight tracking-tight text-navy-950 md:text-3xl">
              <span className="md:hidden">List your flat with verified buyers.</span>
              <span className="hidden md:inline">
                Own a Gurgaon flat? Reach verified society-first buyers.
              </span>
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-navy-500 md:text-[15px] md:leading-6">
              <span className="md:hidden">
                Get verified tenant and buyer enquiries from users already comparing societies.
              </span>
              <span className="hidden md:inline">
                Reach serious tenants and buyers looking specifically inside verified Gurgaon societies. Add your property once and receive qualified enquiries with clearer requirement, budget and society context.
              </span>
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/sell">
                <Button className="h-10 w-full rounded-full bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800 md:w-auto">
                  List your flat
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
                className="h-10 w-full rounded-full border-blue-100 bg-white px-5 text-sm font-black text-blue-700 hover:bg-blue-50 md:w-auto"
              >
                Talk to an expert
              </Button>
            </div>
          </div>
          <div className="hidden gap-3 sm:grid-cols-3 md:grid">
            {ownerBenefits.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to="/sell"
                  className="rounded-[1.1rem] border border-blue-100 bg-blue-50/35 p-4 transition hover:-translate-y-1 hover:bg-white hover:shadow-soft"
                >
                  <Icon className="h-5 w-5 text-blue-700" />
                  <h3 className="mt-4 text-sm font-black text-navy-950">
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
