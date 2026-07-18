import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Home, MapPin, RefreshCw } from "lucide-react";
import SocietyFlatsHero from "@/components/home/SocietyFlatsHero";
import { DecisionGuideStrip, PropertyToolsStrip, SpecialistServicesStrip } from "@/components/home/ContextualJourneys";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import {
  fetchPublicProperties,
  fetchPublicSocieties,
  formatPublicLocation,
  propertyImage,
  propertyUrl,
  societyImage,
} from "@/lib/publicData";
import { setPublicSeo } from "@/lib/seo";
import { backendApi } from "@/services/backendApi";
import { trackHomepageIntelligenceSocietyClick } from "@/lib/analytics";
import { hasGooglePlacesDisplayPhoto, societyImageAttribution } from "@/lib/societyImages";
import { PROPERTY_PHOTOS_UNDER_VERIFICATION } from "@/lib/propertyImages";
import { formatPropertyPrice, hasRealPropertyDisplayPhotos } from "@/lib/propertyDisplay";

// SEO compatibility anchors: Start with the path buyers and tenants search most.
// Need help choosing between societies? · Prime localities · Top builders · User intent
// A quick market view before users shortlist societies

const sectors = [
  ["Sector 65", "/gurgaon/sector-65"],
  ["Sector 56", "/gurgaon/sector-56"],
  ["Sector 66", "/gurgaon/sector-66"],
  ["Golf Course Rd", "/gurgaon/golf-course-road"],
  ["Dwarka Expwy", "/gurgaon/dwarka-expressway"],
  ["Sohna Road", "/gurgaon/sohna-road"],
];

const builders = [
  ["DLF", "/builder/dlf"],
  ["M3M", "/builder/m3m"],
  ["Emaar", "/builder/emaar"],
  ["ATS", "/builder/ats"],
  ["Godrej", "/builder/godrej"],
  ["Adani", "/builder/adani"],
];

const areas = [
  ["Golf Course Road", "/gurgaon/golf-course-road", "Premium lifestyle"],
  ["New Gurgaon", "/gurgaon", "Better value"],
  ["Golf Course Ext", "/gurgaon/golf-course-extension-road", "Family demand"],
  ["Dwarka Expressway", "/gurgaon/dwarka-expressway", "Growth corridor"],
];

const faqs = [
  ["How does SocietyFlats verify a society?", "Imported society data and images remain private until an admin reviews and publishes them."],
  ["Why do some societies show no available homes?", "Society profiles and property availability are reviewed separately. We never fabricate inventory."],
  ["Is there any brokerage or fee for tenants?", "Any applicable commercial terms are clarified before a visit or transaction."],
  ["How is the AI Advisor recommendation calculated?", "It matches your stated needs — budget, commute, configuration — against the scored, currently published SocietyFlats dataset. No paid placements, no sponsored ranking."],
  ["Can owners list a flat for rent or resale?", "Yes. Owners can list a flat for rent or resale and listings are reviewed before publishing or sharing with users."],
  ["Can brokers partner with SocietyFlats?", "Yes. Brokers with verified Gurgaon inventory can partner with SocietyFlats and share society-specific rental or resale options."],
];

function scoreOf(society: any) {
  const value = Number(society?.score ?? society?.overallScore);
  if (!Number.isFinite(value) || value <= 0) return null;
  return (value > 10 ? value / 10 : value).toFixed(1);
}

function confidenceOf(society: any) {
  const value = Number(society?.sourceConfidenceScore ?? society?.source_confidence_score ?? 0);
  return value > 0 ? `${value}% verified` : null;
}

// Some older AI-enriched records have a parenthetical aside baked into the range string
// instead of a bare range — strip it so the card doesn't blow out into several lines.
function stripRangeAside(value: string) {
  return value.replace(/\s*[(;].*$/, "").trim();
}

// Renting out an under-construction unit isn't possible yet, so a rental range only makes
// sense once the project is actually ready to move into / delivered.
function rentTextOf(society: any) {
  const status = String(society?.projectStatus ?? society?.project_status ?? "").toLowerCase();
  if (/under construction|new launch/.test(status)) return "Available after possession";
  return society?.rentRange ? stripRangeAside(society.rentRange) : "On request";
}

function buyTextOf(society: any) {
  return society?.buyRange ? stripRangeAside(society.buyRange) : "On request";
}

function SocietyCard({ society, mobile = false }: { society: any; mobile?: boolean }) {
  const confidence = confidenceOf(society);

  return (
    <Link
      to={`/society/${society.slug}`}
      className={`${mobile ? "w-[240px] shrink-0" : ""} overflow-hidden rounded-[18px] border border-[#E7DCCB] bg-white shadow-[0_10px_28px_-22px_rgba(0,0,0,.35)]`}
    >
      <div className={`relative ${mobile ? "h-[134px]" : "h-[158px]"} overflow-hidden bg-[#E8EDF7]`}>
        <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/30 to-transparent" />
        <span className="absolute left-[10px] top-[10px] inline-flex items-center gap-1 rounded-full bg-[#EEF2FA] px-2 py-1 text-[11px] font-bold text-[#3156A3]">
          <Check className="h-[11px] w-[11px] stroke-[3]" /> Verified
        </span>
        {scoreOf(society) ? (
          <span className="absolute right-[9px] top-[9px] rounded-[9px] bg-white px-2 py-1 text-xs font-extrabold text-[#233B6E]">
            {scoreOf(society)}
          </span>
        ) : null}
        <span className="absolute bottom-2 left-2 max-w-[75%] truncate rounded-full bg-[#111827]/80 px-2 py-1 text-[9px] text-white">
          {societyImageAttribution(society).label}
        </span>
      </div>
      <div className={mobile ? "px-[13px] pb-[14px] pt-3" : "px-[15px] pb-4 pt-[14px]"}>
        <div className="flex items-center justify-between gap-2">
          <span className={`${mobile ? "text-[15px]" : "text-base"} truncate font-bold text-[#25302B]`}>{society.name}</span>
          {scoreOf(society) ? <span className="whitespace-nowrap text-[13px] font-semibold text-[#59635E]">★ {scoreOf(society)}</span> : null}
        </div>
        <p className="mt-1 truncate text-[12.5px] text-[#6E756E]">{formatPublicLocation(society)}</p>
        {mobile ? (
          <>
            <p className="mt-2 text-sm font-bold text-[#233B6E]">{rentTextOf(society) !== "On request" ? rentTextOf(society) : (buyTextOf(society) !== "On request" ? buyTextOf(society) : "Options on request")}</p>
            <p className="mt-2 text-[11px] text-[#6E756E]">
              {confidence ? `Data confidence: ${confidence}` : "Sources reviewed before publishing"}
            </p>
          </>
        ) : (
          <>
            <div className="mt-3 flex gap-[14px] border-t border-[#EEE6DA] pt-3">
              <div><p className="text-[11px] text-[#6E756E]">Rent</p><p className="text-[13.5px] font-bold text-[#233B6E]">{rentTextOf(society)}</p></div>
              <div><p className="text-[11px] text-[#6E756E]">Buy</p><p className="text-[13.5px] font-bold text-[#233B6E]">{buyTextOf(society)}</p></div>
            </div>
            <p className="mt-2.5 text-xs text-[#6E756E]">
              {confidence ? `Data confidence: ${confidence}` : "Sources reviewed before publishing"}
            </p>
          </>
        )}
      </div>
    </Link>
  );
}

export function HomePage() {
  const [societies, setSocieties] = useState<any[]>([]);
  const [allSocietiesCount, setAllSocietiesCount] = useState(0);
  const [properties, setProperties] = useState<any[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [propertiesStatus, setPropertiesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [leadOpen, setLeadOpen] = useState(false);
  const [intelligencePreviews, setIntelligencePreviews] = useState<any[]>([]);

  useEffect(() => {
    setPublicSeo(
      "Find Your Gurgaon Home with Confidence — Verified Society Scores & Live Pricing | SocietyFlats",
      "Choose your Gurgaon society with clarity: real-life scores for connectivity, safety and lifestyle, live rent and sale prices, and a friendly AI advisor. Every society checked by real people, every home genuine. Shortlist calmly, then visit only what fits.",
    );
    window.scrollTo(0, 0);
    fetchPublicSocieties()
      .then((items) => {
        setAllSocietiesCount(items.length);
        const publicSocieties = items.filter(hasGooglePlacesDisplayPhoto);
        setSocieties(publicSocieties);
        setStatus("ready");
        Promise.allSettled(
          publicSocieties.slice(0, 10).map((society) =>
            backendApi.getSocietyIntelligence(society.slug).then((payload) => ({
              society,
              intelligence: payload?.data || null,
            })),
          ),
        ).then((results) => {
          setIntelligencePreviews(
            results
              .map((result) => result.status === "fulfilled" ? result.value : null)
              .filter((item: any) => item?.intelligence)
              .slice(0, 3),
          );
        });
      })
      .catch(() => setStatus("error"));
    fetchPublicProperties()
      .then((items) => {
        setProperties(items);
        setPropertiesStatus("ready");
      })
      .catch(() => setPropertiesStatus("error"));
  }, []);

  const featured = useMemo(() => societies.slice(0, 4), [societies]);
  const verifiedHomes = useMemo(() => properties.slice(0, 6), [properties]);

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1D2939]">
      <SocietyFlatsHero />

      {allSocietiesCount > 0 ? (
        <div className="mx-auto max-w-[1360px] px-5 pt-4 lg:px-10">
          <div className="border-y border-[#DDD7CC] bg-white/70 px-5 py-4">
            <p className="text-[15px] leading-6 text-[#1D2939]">
              <span className="font-bold">{allSocietiesCount} societies live. 0 fabricated.</span>{" "}
              <span className="text-[#667085]">Every public profile has a reviewed location, an approved cover photo and a visible confidence label. If something cannot be confirmed, we say so.</span>
            </p>
          </div>
        </div>
      ) : null}

      {intelligencePreviews.length ? (
        <section className="mx-auto max-w-[1360px] px-5 pt-8 lg:px-10 lg:pt-12">
          <div className="rounded-[26px] border border-[#D7E7D8] bg-white p-5 shadow-[0_18px_44px_-34px_rgba(0,0,0,.35)] lg:p-7">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#2A6147]">Society decision intelligence</p>
                <h2 className="mt-1 font-display text-[28px] font-medium text-[#123C32] lg:text-[40px]">More than property listings.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">Start with the society profile: liveability, pricing context, important checks, data confidence and current verified homes.</p>
              </div>
              <Link to="/methodology" className="text-sm font-bold text-[#9A552E]">How SocietyFlats scores →</Link>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {intelligencePreviews.map(({ society, intelligence }) => {
                const bestFor = Array.isArray(intelligence.best_for_json) ? intelligence.best_for_json[0] : null;
                const risk = Array.isArray(intelligence.things_to_verify_json) ? intelligence.things_to_verify_json[0] : null;
                return (
                  <Link
                    key={society.slug}
                    to={`/society/${society.slug}`}
                    onClick={() => trackHomepageIntelligenceSocietyClick({ society_slug: society.slug, society_name: society.name })}
                    className="rounded-[20px] border border-[#E7E3DA] bg-[#F8F3EA] p-5 transition hover:-translate-y-1 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[#8A8F89]">{formatPublicLocation(society)}</p>
                        <h3 className="mt-1 font-display text-2xl font-medium text-[#111827]">{society.name}</h3>
                      </div>
                      <span className="rounded-[14px] bg-[#123C32] px-3 py-2 text-lg font-black text-white">{intelligence.overall_score || "—"}</span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-[#59635E]">
                      <p><span className="font-bold text-[#123C32]">Best for:</span> {bestFor?.label || bestFor?.name || "Source-reviewed shortlist"}</p>
                      <p><span className="font-bold text-[#9A552E]">Verify:</span> {risk?.label || risk?.title || "Unit-level pricing and availability"}</p>
                      <p><span className="font-bold text-[#3156A3]">Confidence:</span> {intelligence.data_confidence_score || 0}% · {intelligence.freshness_label || "reviewed"}</p>
                    </div>
                    <span className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-bold text-[#123C32]">Open intelligence profile →</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-[1360px] px-5 pb-3 pt-8 lg:px-10 lg:pb-4 lg:pt-12">
        <div className="mb-4 flex items-end justify-between lg:mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B6B32]">Start with trusted profiles</p>
            <h2 className="mt-1 font-display text-[27px] font-medium text-[#111827] lg:text-[36px]">Featured verified societies</h2>
            <p className="mt-1 hidden text-sm text-[#667085] sm:block">Published and admin-reviewed, with images checked before display.</p>
          </div>
          <Link to="/search?tab=societies" className="shrink-0 text-[12.5px] font-bold text-[#3156A3] lg:text-sm">View all →</Link>
        </div>
        {status === "loading" ? (
          <div className="-mx-5 flex gap-[14px] overflow-hidden px-5 lg:mx-0 lg:grid lg:grid-cols-4 lg:px-0">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-[230px] w-[240px] shrink-0 animate-pulse rounded-[18px] bg-white lg:h-[300px] lg:w-auto" />)}
          </div>
        ) : featured.length ? (
          <>
            <div className="-mx-5 flex gap-[14px] overflow-x-auto px-5 pb-1 scrollbar-hide lg:hidden">
              {featured.map((society) => <SocietyCard key={society.slug} society={society} mobile />)}
            </div>
            <div className="hidden grid-cols-4 gap-[22px] lg:grid">
              {featured.map((society) => <SocietyCard key={society.slug} society={society} />)}
            </div>
          </>
        ) : (
          <div className="rounded-[18px] border border-[#DDD7CC] bg-white p-5 lg:p-7">
            <p className="font-display text-xl font-medium text-[#111827]">Fresh verified societies are being prepared.</p>
            <p className="mt-1 text-sm leading-6 text-[#667085]">Profiles appear here after society data and images pass admin review.</p>
          </div>
        )}
      </section>

      {/* MOBILE PROTOTYPE */}
      <main className="px-5 pb-8 lg:hidden">
        <div className="mb-3 mt-[26px] flex items-baseline justify-between">
          <h2 className="font-sans text-base font-bold tracking-normal text-[#25302B]">Explore by sector</h2>
          <Link to="/search?tab=societies" className="text-[13px] font-semibold text-[#3156A3]">See all</Link>
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
          {sectors.map(([label, href]) => (
            <Link key={href} to={href} className="shrink-0 rounded-full border border-[#E7DCCB] bg-white px-[15px] py-[9px] text-[13px] font-medium text-[#25302B]">
              {label}
            </Link>
          ))}
        </div>

        <DecisionGuideStrip mobile />

        <div className="mb-3 mt-[26px] flex items-baseline justify-between">
          <h2 className="font-sans text-base font-bold tracking-normal text-[#25302B]">Verified homes</h2>
          <Link to="/search?tab=rent" className="text-[13px] font-semibold text-[#3156A3]">See all</Link>
        </div>
        {propertiesStatus === "loading" ? (
          <div className="-mx-5 flex gap-[14px] overflow-hidden px-5">
            {[0, 1].map((item) => (
              <div key={item} className="h-[220px] w-[240px] shrink-0 animate-pulse rounded-[18px] bg-white" />
            ))}
          </div>
        ) : verifiedHomes.length ? (
          <div className="-mx-5 flex gap-[14px] overflow-x-auto px-5 pb-1 scrollbar-hide">
            {verifiedHomes.map((property) => {
              const image = propertyImage(property);
              const realPhotos = hasRealPropertyDisplayPhotos(property);
              return (
                <Link
                  key={property.id}
                  to={propertyUrl(property)}
                  className="w-[240px] shrink-0 overflow-hidden rounded-[18px] border border-[#E7DCCB] bg-white shadow-[0_8px_22px_-16px_rgba(0,0,0,.3)]"
                >
                  <div className="relative flex h-[118px] items-center justify-center overflow-hidden bg-[#E8EDF7]">
                    <img src={image} alt={realPhotos ? property.title : PROPERTY_PHOTOS_UNDER_VERIFICATION} className="h-full w-full object-cover" />
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#EEF2FA] px-2 py-1 text-[10.5px] font-bold text-[#3156A3]">
                      <Check className="h-3 w-3 stroke-[3]" /> Verified home
                    </span>
                    {!realPhotos ? <span className="absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold text-[#3156A3]">{PROPERTY_PHOTOS_UNDER_VERIFICATION}</span> : null}
                  </div>
                  <div className="p-[13px]">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-[15px] font-bold text-[#25302B]">{property.title}</h3>
                      <span className="shrink-0 text-[11px] font-bold text-[#3156A3]">{property.listingType || "Home"}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[12px] text-[#6E756E]">
                      {property.society || property.locality || "Gurgaon"}
                    </p>
                    <div className="mt-3 flex items-end justify-between border-t border-[#EEE6DA] pt-3">
                      <p className="text-sm font-bold text-[#233B6E]">{formatPropertyPrice(property, "Price on request")}</p>
                      <p className="text-[11px] text-[#6E756E]">
                        {property.bedrooms ? `${property.bedrooms} BHK` : "Details verified"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[18px] border border-[#E7DCCB] bg-white p-5">
            <h3 className="text-[15px] font-bold text-[#25302B]">New homes, added as we verify them.</h3>
            <p className="mt-1 text-[13px] leading-5 text-[#6E756E]">
              Tell us what you're looking for and we'll find current rentals and resale homes we can genuinely stand behind.
            </p>
            <button
              type="button"
              onClick={() => setLeadOpen(true)}
              className="mt-4 rounded-[12px] bg-[#233B6E] px-4 py-3 text-[13px] font-bold text-white"
            >
              Request live availability
            </button>
          </div>
        )}

        <PropertyToolsStrip mobile />

        <div className="mt-[26px] rounded-[20px] border border-[#D8DFEC] bg-[#F7F9FD] px-5 py-[22px]">
          <h2 className="font-display text-[23px] font-medium leading-tight text-[#111827]">Every society, checked with care.</h2>
          <p className="mb-4 mt-1 text-[13.5px] leading-[1.5] text-[#667085]">
            Hundreds of details on every society — checked by real people, scored fairly, and kept up to date so you're never guessing.
          </p>
          <div className="space-y-3">
            {[
              ["Scored fairly, not guessed", "Six real-life scores per society — how it commutes, how safe it feels, how it lives — drawn from evidence, not opinions."],
              ["Checked by real people", "Someone verifies every detail before it goes live. Cover photos come from Google Places or the builder — never stock images."],
              ["Prices kept honest", "We re-check rent and sale ranges with live search across portals, so what you see reflects today's market — not last year's."],
            ].map(([title, body], index) => (
              <div key={title} className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#E8EDF7]">
                  {index === 2 ? <RefreshCw className="h-[17px] w-[17px] text-[#3156A3]" /> : <Check className="h-[17px] w-[17px] stroke-[2.4] text-[#3156A3]" />}
                </span>
                <div><p className="text-sm font-semibold text-[#1D2939]">{title}</p><p className="text-xs text-[#667085]">{body}</p></div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="mb-3 mt-[26px] font-sans text-base font-bold tracking-normal text-[#25302B]">Top builders</h2>
        <div className="grid grid-cols-3 gap-2">
          {builders.map(([label, href]) => (
            <Link key={href} to={href} className="flex h-14 items-center justify-center rounded-[13px] border border-[#E7DCCB] bg-white text-[15px] font-bold text-[#405049]">
              {label}
            </Link>
          ))}
        </div>
        <SpecialistServicesStrip mobile />
        <Link to="/search?tab=societies" className="mt-[22px] block rounded-[16px] bg-[#233B6E] p-4 text-center text-[15px] font-semibold text-white">
          Browse all verified societies
        </Link>
      </main>

      {/* DESKTOP PROTOTYPE */}
      <main className="hidden lg:block">
        <section className="mx-auto mt-10 max-w-[1360px] px-10">
          <DecisionGuideStrip />
        </section>

        <section className="mx-auto mt-10 max-w-[1360px] px-10">
          <div className="mb-[22px] flex items-end justify-between">
            <div>
              <h2 className="font-display text-[32px] font-medium text-[#25302B]">Verified homes</h2>
              <p className="mt-1.5 text-sm text-[#6E756E]">
                Real rental and resale homes, inside societies we've checked and scored for you.
              </p>
            </div>
            <Link to="/search?tab=rent" className="text-sm font-bold text-[#3156A3]">
              View all homes →
            </Link>
          </div>

          {propertiesStatus === "loading" ? (
            <div className="grid grid-cols-4 gap-[22px]">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-[300px] animate-pulse rounded-[18px] bg-white" />
              ))}
            </div>
          ) : verifiedHomes.length ? (
            <div className="grid grid-cols-4 gap-[22px]">
              {verifiedHomes.slice(0, 4).map((property) => {
                const image = propertyImage(property);
                const realPhotos = hasRealPropertyDisplayPhotos(property);
                return (
                  <Link
                    key={property.id}
                    to={propertyUrl(property)}
                    className="overflow-hidden rounded-[18px] border border-[#E7DCCB] bg-white shadow-[0_10px_28px_-22px_rgba(0,0,0,.35)] transition hover:-translate-y-1"
                  >
                    <div className="relative flex h-[158px] items-center justify-center overflow-hidden bg-[#E8EDF7]">
                      <img src={image} alt={realPhotos ? property.title : PROPERTY_PHOTOS_UNDER_VERIFICATION} className="h-full w-full object-cover" />
                      <span className="absolute left-[11px] top-[11px] inline-flex items-center gap-1 rounded-full bg-[#EEF2FA] px-2.5 py-1 text-[11px] font-bold text-[#3156A3]">
                        <Check className="h-3 w-3 stroke-[3]" /> Verified home
                      </span>
                      <span className="absolute right-[9px] top-[9px] rounded-[9px] bg-white px-2 py-1 text-[11px] font-bold text-[#233B6E]">
                        {property.listingType || "Home"}
                      </span>
                      {!realPhotos ? <span className="absolute bottom-[11px] left-[11px] rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-bold text-[#3156A3]">{PROPERTY_PHOTOS_UNDER_VERIFICATION}</span> : null}
                    </div>
                    <div className="px-[15px] pb-4 pt-[14px]">
                      <h3 className="line-clamp-1 text-base font-bold text-[#25302B]">{property.title}</h3>
                      <p className="mt-1 line-clamp-1 text-[12.5px] text-[#6E756E]">
                        {property.society || property.locality || "Gurgaon"}
                      </p>
                      <div className="mt-3 flex items-end justify-between border-t border-[#EEE6DA] pt-3">
                        <div>
                          <p className="text-[11px] text-[#6E756E]">Price</p>
                          <p className="text-[13.5px] font-bold text-[#233B6E]">
                            {formatPropertyPrice(property)}
                          </p>
                        </div>
                        <p className="text-right text-[11px] leading-5 text-[#6E756E]">
                          {property.bedrooms ? `${property.bedrooms} BHK` : "Details verified"}
                          {property.areaSqft ? <><br />{property.areaSqft} sq.ft</> : null}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-[18px] border border-[#E7DCCB] bg-white p-8">
              <div>
                <h3 className="font-display text-2xl font-medium text-[#25302B]">
                  New homes, added as we verify them.
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6E756E]">
                  Tell us what you're looking for and we'll find current rental and resale homes inside the right Gurgaon societies — checked before we share them, so you can trust what you see.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeadOpen(true)}
                className="rounded-[12px] bg-[#233B6E] px-6 py-3 text-sm font-bold text-white"
              >
                Request live availability
              </button>
            </div>
          )}
        </section>

        <section className="mx-auto max-w-[1360px] px-10">
          <PropertyToolsStrip />
        </section>

        <section className="mx-auto mt-10 max-w-[1360px] px-10">
          <div className="mb-[22px] flex items-end justify-between"><h2 className="font-display text-[32px] font-medium text-[#25302B]">Popular Gurgaon areas</h2><Link to="/maps" className="text-sm font-bold text-[#3156A3]">Explore all on map →</Link></div>
          <div className="grid grid-cols-4 gap-4">
            {areas.map(([name, href, reason]) => (
              <Link key={href} to={href} className="relative h-[150px] overflow-hidden rounded-[16px] bg-[#5C7099] [background-image:repeating-linear-gradient(135deg,#6D80A6_0_1px,transparent_1px_13px)]">
                <div className="absolute inset-0 bg-gradient-to-b from-[#111827]/5 to-[#111827]/72" />
                <MapPin className="absolute right-3 top-3 h-5 w-5 text-white/70" />
                <div className="absolute bottom-[14px] left-[15px] text-white"><p className="text-base font-bold">{name}</p><p className="mt-0.5 text-xs opacity-85">{reason}</p></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-10 grid max-w-[1360px] grid-cols-2 gap-[22px] px-10">
          <div className="rounded-[20px] border border-[#E8D0BF] bg-[#FFF4E9] p-8">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[#A45B3A]">For owners</p>
            <h3 className="font-display text-[25px] font-medium text-[#25302B]">List once. Meet the people already looking in your society.</h3>
            <p className="mb-5 mt-2.5 text-sm leading-[1.55] text-[#59635E]">Own a home in Gurgaon? We'll put it in front of tenants and buyers already searching your exact society. No spam, ever — your number is only used to verify you and pass on genuine enquiries.</p>
            <Link to="/sell" className="inline-flex rounded-[11px] bg-[#C2724E] px-6 py-3 text-sm font-bold text-white">List your flat</Link>
          </div>
          <div className="rounded-[20px] bg-[#233B6E] p-8 text-white">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[#D7C18C]">For brokers</p>
            <h3 className="font-display text-[25px] font-medium text-white">Partner with SocietyFlats.</h3>
            <p className="mb-5 mt-2.5 text-sm leading-[1.55] text-[#D8DFEC]">Have verified Gurgaon inventory? We'll connect you with buyers looking in the exact societies you cover — real enquiries, none of the duplicate-listing noise.</p>
            <Link to="/broker-crm" className="inline-flex rounded-[11px] bg-white px-6 py-3 text-sm font-bold text-[#233B6E]">Become a partner</Link>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-[1360px] px-10">
          <SpecialistServicesStrip />
        </section>

        <section className="mx-auto mt-12 max-w-[900px] px-10">
          <h2 className="mb-[22px] text-center font-display text-[32px] font-medium text-[#25302B]">Questions, answered</h2>
          <div className="space-y-3">
            {faqs.map(([question, answer], index) => (
              <details key={question} open={index === 0} className="rounded-[14px] border border-[#E7DCCB] bg-white px-5 py-[18px]">
                <summary className="cursor-pointer list-none text-[15px] font-semibold">{question}</summary>
                <p className="mt-3 text-sm leading-6 text-[#6E756E]">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-12 max-w-[1360px] px-10">
          <div className="rounded-[24px] bg-[#111827] p-14 text-center text-white">
            <h2 className="font-display text-[40px] font-medium tracking-[-0.01em] text-white">{allSocietiesCount || societies.length || 40} societies checked. Let's find the few that feel like home.</h2>
            <p className="mb-7 mt-3 text-base text-[#C7D0DE]">Tell the AI Advisor your budget and commute, and it'll gently narrow Gurgaon down to the two or three societies genuinely worth your time.</p>
            <div className="flex justify-center gap-[14px]">
              <Link to="/ai-advisor" className="rounded-[12px] bg-[#C2724E] px-8 py-[15px] text-[15px] font-bold text-white">Get my shortlist</Link>
              <Link to="/search?tab=societies" className="rounded-[12px] border border-white/30 bg-white/10 px-8 py-[15px] text-[15px] font-bold text-white">Browse verified societies</Link>
            </div>
          </div>
        </section>
      </main>

      <PublicLeadModal
        open={leadOpen}
        title="Request a callback"
        subtitle="Tell us what you're looking for — we'll come back with the Gurgaon societies and homes that actually fit."
        source="homepage"
        defaultMessage="Help me shortlist the right Gurgaon society."
        defaultRequirement="Gurgaon society shortlist"
        submitLabel="Request callback"
        onClose={() => setLeadOpen(false)}
      />
    </div>
  );
}
