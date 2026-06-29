import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Home, MapPin, RefreshCw } from "lucide-react";
import SocietyFlatsHero from "@/components/home/SocietyFlatsHero";
import { PublicLeadModal } from "@/components/leads/PublicLeadModal";
import {
  fetchPublicProperties,
  fetchPublicSocieties,
  formatPublicLocation,
  propertyUrl,
  societyImage,
} from "@/lib/publicData";
import { setPublicSeo } from "@/lib/seo";
import { hasGooglePlacesDisplayPhoto, societyImageAttribution } from "@/lib/societyImages";

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
  ["How is the AI Advisor recommendation calculated?", "Recommendations use your stated needs and the currently published SocietyFlats dataset."],
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

// Renting out an under-construction unit isn't possible yet, so a rental range only makes
// sense once the project is actually ready to move into / delivered.
function rentTextOf(society: any) {
  const status = String(society?.projectStatus ?? society?.project_status ?? "").toLowerCase();
  if (/under construction|new launch/.test(status)) return "Available after possession";
  return society?.rentRange || "On request";
}

function SocietyCard({ society, mobile = false }: { society: any; mobile?: boolean }) {
  const confidence = confidenceOf(society);

  return (
    <Link
      to={`/society/${society.slug}`}
      className={`${mobile ? "w-[240px] shrink-0" : ""} overflow-hidden rounded-[18px] border border-[#E7DCCB] bg-white shadow-[0_10px_28px_-22px_rgba(0,0,0,.35)]`}
    >
      <div className={`relative ${mobile ? "h-[134px]" : "h-[158px]"} overflow-hidden bg-[#DDE7DC]`}>
        <img src={societyImage(society)} alt={society.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10251F]/30 to-transparent" />
        <span className="absolute left-[10px] top-[10px] inline-flex items-center gap-1 rounded-full bg-[#E4F0E6] px-2 py-1 text-[11px] font-bold text-[#1F7A5A]">
          <Check className="h-[11px] w-[11px] stroke-[3]" /> Verified
        </span>
        {scoreOf(society) ? (
          <span className="absolute right-[9px] top-[9px] rounded-[9px] bg-white px-2 py-1 text-xs font-extrabold text-[#123C32]">
            {scoreOf(society)}
          </span>
        ) : null}
        <span className="absolute bottom-2 left-2 max-w-[75%] truncate rounded-full bg-[#10251F]/80 px-2 py-1 text-[9px] text-white">
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
            <p className="mt-2 text-sm font-bold text-[#123C32]">{rentTextOf(society) !== "On request" ? rentTextOf(society) : (society.buyRange || "Options on request")}</p>
            <p className="mt-2 text-[11px] text-[#6E756E]">
              {confidence ? `Data confidence: ${confidence}` : "Sources reviewed before publishing"}
            </p>
          </>
        ) : (
          <>
            <div className="mt-3 flex gap-[14px] border-t border-[#EEE6DA] pt-3">
              <div><p className="text-[11px] text-[#6E756E]">Rent</p><p className="text-[13.5px] font-bold text-[#123C32]">{rentTextOf(society)}</p></div>
              <div><p className="text-[11px] text-[#6E756E]">Buy</p><p className="text-[13.5px] font-bold text-[#123C32]">{society.buyRange || "On request"}</p></div>
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
  const [properties, setProperties] = useState<any[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [propertiesStatus, setPropertiesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [leadOpen, setLeadOpen] = useState(false);

  useEffect(() => {
    setPublicSeo(
      "Verified Gurgaon Societies — Compare Before You Choose a Home | SocietyFlats",
      "22+ Gurgaon societies reviewed field-by-field before publishing — real coordinates, real Google-sourced photos, no invented listings. Compare security, commute and price before you visit.",
    );
    window.scrollTo(0, 0);
    fetchPublicSocieties()
      .then((items) => {
        setSocieties(items.filter(hasGooglePlacesDisplayPhoto));
        setStatus("ready");
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
    <div className="min-h-screen bg-[#F8F3EA] text-[#25302B]">
      <SocietyFlatsHero />

      {societies.length > 0 ? (
        <div className="mx-auto max-w-[1360px] px-5 pt-5 lg:px-10">
          <div className="rounded-[16px] border border-[#E7DCCB] bg-white px-5 py-4">
            <p className="text-[15px] leading-6 text-[#25302B]">
              <span className="font-bold">{societies.length} societies live. 0 fabricated.</span>{" "}
              <span className="text-[#6E756E]">Every listing below has a Google-verified location, an admin-approved cover photo, and a visible data-confidence label. If something can&apos;t be confirmed yet, we say so instead of guessing.</span>
            </p>
          </div>
        </div>
      ) : null}

      {/* MOBILE PROTOTYPE */}
      <main className="px-5 pb-8 lg:hidden">
        <div className="mb-3 mt-[26px] flex items-baseline justify-between">
          <h2 className="font-sans text-base font-bold tracking-normal text-[#25302B]">Explore by sector</h2>
          <Link to="/search?tab=societies" className="text-[13px] font-semibold text-[#2A6147]">See all</Link>
        </div>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
          {sectors.map(([label, href]) => (
            <Link key={href} to={href} className="shrink-0 rounded-full border border-[#E7DCCB] bg-white px-[15px] py-[9px] text-[13px] font-medium text-[#25302B]">
              {label}
            </Link>
          ))}
        </div>

        <div className="mb-3 mt-[26px] flex items-baseline justify-between">
          <h2 className="font-sans text-base font-bold tracking-normal text-[#25302B]">Featured verified societies</h2>
        </div>
        {status === "loading" ? (
          <div className="-mx-5 flex gap-[14px] overflow-hidden px-5">
            {[0, 1].map((item) => <div key={item} className="h-[230px] w-[240px] shrink-0 animate-pulse rounded-[18px] bg-white" />)}
          </div>
        ) : featured.length ? (
          <div className="-mx-5 flex gap-[14px] overflow-x-auto px-5 pb-1 scrollbar-hide">
            {featured.map((society) => <SocietyCard key={society.slug} society={society} mobile />)}
          </div>
        ) : (
          <div className="rounded-[18px] border border-[#E7DCCB] bg-white p-5">
            <p className="font-bold">Fresh verified societies are being prepared.</p>
            <p className="mt-1 text-sm leading-6 text-[#6E756E]">Public cards appear after society data and images pass admin review.</p>
          </div>
        )}

        <div className="mb-3 mt-[26px] flex items-baseline justify-between">
          <h2 className="font-sans text-base font-bold tracking-normal text-[#25302B]">Verified homes</h2>
          <Link to="/search?tab=rent" className="text-[13px] font-semibold text-[#2A6147]">See all</Link>
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
              const image = Array.isArray(property.images) ? property.images[0] : "";
              return (
                <Link
                  key={property.id}
                  to={propertyUrl(property)}
                  className="w-[240px] shrink-0 overflow-hidden rounded-[18px] border border-[#E7DCCB] bg-white shadow-[0_8px_22px_-16px_rgba(0,0,0,.3)]"
                >
                  <div className="relative flex h-[118px] items-center justify-center overflow-hidden bg-[#DDE7DC]">
                    {image ? (
                      <img src={image} alt={property.title} className="h-full w-full object-cover" />
                    ) : (
                      <Home className="h-8 w-8 text-[#2A6147]" />
                    )}
                    <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-[#E4F0E6] px-2 py-1 text-[10.5px] font-bold text-[#1F7A5A]">
                      <Check className="h-3 w-3 stroke-[3]" /> Verified home
                    </span>
                  </div>
                  <div className="p-[13px]">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 text-[15px] font-bold text-[#25302B]">{property.title}</h3>
                      <span className="shrink-0 text-[11px] font-bold text-[#2A6147]">{property.listingType || "Home"}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[12px] text-[#6E756E]">
                      {property.society || property.locality || "Gurgaon"}
                    </p>
                    <div className="mt-3 flex items-end justify-between border-t border-[#EEE6DA] pt-3">
                      <p className="text-sm font-bold text-[#123C32]">{property.price || "Price on request"}</p>
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
            <h3 className="text-[15px] font-bold text-[#25302B]">Verified homes are being added.</h3>
            <p className="mt-1 text-[13px] leading-5 text-[#6E756E]">
              Request current availability and our team will help with rental or resale options.
            </p>
            <button
              type="button"
              onClick={() => setLeadOpen(true)}
              className="mt-4 rounded-[12px] bg-[#123C32] px-4 py-3 text-[13px] font-bold text-white"
            >
              Request live availability
            </button>
          </div>
        )}

        <div className="mt-[26px] rounded-[20px] bg-[#123C32] px-5 py-[22px] text-white">
          <h2 className="font-display text-[21px] font-medium leading-tight text-white">Every society, verified.</h2>
          <p className="mb-4 mt-1 text-[13.5px] leading-[1.5] text-[#DDE7DC]">
            Data and images are reviewed before a society goes live.
          </p>
          <div className="space-y-3">
            {[
              ["Admin-reviewed data", "A person checks every field before it goes live — not just an algorithm."],
              ["Images reviewed", "Cover photos come from Google Places or the builder, never stock images."],
              ["Refreshed regularly", "Price ranges are re-researched with live web search, not copy-pasted once and forgotten."],
            ].map(([title, body], index) => (
              <div key={title} className="flex items-center gap-3">
                <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[#244E43]">
                  {index === 2 ? <RefreshCw className="h-[17px] w-[17px] text-[#DDE7DC]" /> : <Check className="h-[17px] w-[17px] stroke-[2.4] text-[#DDE7DC]" />}
                </span>
                <div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-[#C4D3CA]">{body}</p></div>
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
        <Link to="/search?tab=societies" className="mt-[22px] block rounded-[16px] bg-[#123C32] p-4 text-center text-[15px] font-semibold text-white">
          Browse all verified societies
        </Link>
      </main>

      {/* DESKTOP PROTOTYPE */}
      <main className="hidden lg:block">
        <section className="mx-auto mt-14 max-w-[1360px] px-10">
          <div className="grid grid-cols-4 gap-[18px]">
            {[
              ["RWA / public records reviewed", "Available public and society records are checked before publishing."],
              ["Admin-reviewed society data", "Imported profiles remain private until an admin reviews them."],
              ["Images reviewed before publishing", "Every public image passes the approval workflow."],
              ["Market ranges refreshed regularly", "Ranges can be updated without inventing unavailable homes."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[16px] border border-[#E7DCCB] bg-white p-[22px]">
                <span className="mb-[13px] flex h-10 w-10 items-center justify-center rounded-[11px] bg-[#E4F0E6]"><Check className="h-[19px] w-[19px] stroke-[2.4] text-[#1F7A5A]" /></span>
                <h3 className="font-sans text-[15px] font-bold tracking-normal text-[#25302B]">{title}</h3>
                <p className="mt-1 text-[13px] leading-[1.5] text-[#6E756E]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-[1360px] px-10">
          <div className="mb-[22px] flex items-end justify-between">
            <div><h2 className="font-display text-[32px] font-medium text-[#25302B]">Featured verified societies</h2><p className="mt-1.5 text-sm text-[#6E756E]">Published & admin-reviewed. Images checked before display.</p></div>
            <Link to="/search?tab=societies" className="text-sm font-bold text-[#2A6147]">View all societies →</Link>
          </div>
          {featured.length ? (
            <div className="grid grid-cols-4 gap-[22px]">{featured.map((society) => <SocietyCard key={society.slug} society={society} />)}</div>
          ) : (
            <div className="rounded-[18px] border border-[#E7DCCB] bg-white p-8">
              <h3 className="font-display text-2xl font-medium">Fresh verified societies are being prepared.</h3>
              <p className="mt-2 text-sm text-[#6E756E]">No published society profiles are available yet. New profiles appear here after admin review.</p>
            </div>
          )}
        </section>

        <section className="mx-auto mt-16 max-w-[1360px] px-10">
          <div className="grid grid-cols-2 items-center gap-10 rounded-[24px] bg-[#123C32] p-11 text-white">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-[#8DC5A7]">SocietyFlats AI</p>
              <h2 className="font-display text-[34px] font-medium leading-[1.1] text-white">Not sure which society fits?</h2>
              <p className="mb-6 mt-3 text-[15.5px] leading-[1.55] text-[#D2E0D7]">Tell us your budget, office location and lifestyle. SocietyFlats AI will suggest societies that fit—with clear reasoning and a data-confidence signal.</p>
              <Link to="/ai-advisor" className="inline-flex rounded-[12px] bg-[#C2724E] px-7 py-3.5 text-[15px] font-bold text-white">Build my shortlist</Link>
            </div>
            <div className="flex flex-col gap-3">
              {["Best societies near Cyber City under ₹80k rent", "Family-friendly societies near good schools", "Compare my shortlisted societies"].map((prompt) => (
                <Link key={prompt} to={`/ai-advisor?q=${encodeURIComponent(prompt)}`} className="flex items-center justify-between rounded-[12px] border border-[#315A4F] bg-[#234A40] px-4 py-3.5 text-sm">
                  {prompt} <span className="text-[#8DC5A7]">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-[1360px] px-10">
          <div className="mb-[22px] flex items-end justify-between">
            <div>
              <h2 className="font-display text-[32px] font-medium text-[#25302B]">Verified homes</h2>
              <p className="mt-1.5 text-sm text-[#6E756E]">
                Published rental and resale inventory inside reviewed Gurgaon societies.
              </p>
            </div>
            <Link to="/search?tab=rent" className="text-sm font-bold text-[#2A6147]">
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
                const image = Array.isArray(property.images) ? property.images[0] : "";
                return (
                  <Link
                    key={property.id}
                    to={propertyUrl(property)}
                    className="overflow-hidden rounded-[18px] border border-[#E7DCCB] bg-white shadow-[0_10px_28px_-22px_rgba(0,0,0,.35)] transition hover:-translate-y-1"
                  >
                    <div className="relative flex h-[158px] items-center justify-center overflow-hidden bg-[#DDE7DC]">
                      {image ? (
                        <img src={image} alt={property.title} className="h-full w-full object-cover" />
                      ) : (
                        <Home className="h-9 w-9 text-[#2A6147]" />
                      )}
                      <span className="absolute left-[11px] top-[11px] inline-flex items-center gap-1 rounded-full bg-[#E4F0E6] px-2.5 py-1 text-[11px] font-bold text-[#1F7A5A]">
                        <Check className="h-3 w-3 stroke-[3]" /> Verified home
                      </span>
                      <span className="absolute right-[9px] top-[9px] rounded-[9px] bg-white px-2 py-1 text-[11px] font-bold text-[#123C32]">
                        {property.listingType || "Home"}
                      </span>
                    </div>
                    <div className="px-[15px] pb-4 pt-[14px]">
                      <h3 className="line-clamp-1 text-base font-bold text-[#25302B]">{property.title}</h3>
                      <p className="mt-1 line-clamp-1 text-[12.5px] text-[#6E756E]">
                        {property.society || property.locality || "Gurgaon"}
                      </p>
                      <div className="mt-3 flex items-end justify-between border-t border-[#EEE6DA] pt-3">
                        <div>
                          <p className="text-[11px] text-[#6E756E]">Price</p>
                          <p className="text-[13.5px] font-bold text-[#123C32]">
                            {property.price || "On request"}
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
                  Verified homes are being added.
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6E756E]">
                  Request current availability and our team will help with rental or resale options inside suitable Gurgaon societies.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLeadOpen(true)}
                className="rounded-[12px] bg-[#123C32] px-6 py-3 text-sm font-bold text-white"
              >
                Request live availability
              </button>
            </div>
          )}
        </section>

        <section className="mx-auto mt-16 max-w-[1360px] px-10">
          <h2 className="mb-[22px] font-display text-[32px] font-medium text-[#25302B]">Popular Gurgaon areas</h2>
          <div className="grid grid-cols-4 gap-4">
            {areas.map(([name, href, reason]) => (
              <Link key={href} to={href} className="relative h-[150px] overflow-hidden rounded-[16px] bg-[#6F8D82] [background-image:repeating-linear-gradient(135deg,#5F7D72_0_1px,transparent_1px_13px)]">
                <div className="absolute inset-0 bg-gradient-to-b from-[#10251F]/10 to-[#10251F]/70" />
                <MapPin className="absolute right-3 top-3 h-5 w-5 text-white/70" />
                <div className="absolute bottom-[14px] left-[15px] text-white"><p className="text-base font-bold">{name}</p><p className="mt-0.5 text-xs opacity-85">{reason}</p></div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 grid max-w-[1360px] grid-cols-2 gap-[22px] px-10">
          <div className="rounded-[20px] border border-[#E8D0BF] bg-[#FFF4E9] p-8">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[#A45B3A]">For owners</p>
            <h3 className="font-display text-[25px] font-medium text-[#25302B]">List your flat once. Reach serious tenants & buyers.</h3>
            <p className="mb-5 mt-2.5 text-sm leading-[1.55] text-[#59635E]">Own a flat in Gurgaon? Reach people already searching inside your society. No spam—your number is used only for verification and enquiries.</p>
            <Link to="/sell" className="inline-flex rounded-[11px] bg-[#C2724E] px-6 py-3 text-sm font-bold text-white">List your flat</Link>
          </div>
          <div className="rounded-[20px] bg-[#123C32] p-8 text-white">
            <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[#8DC5A7]">For brokers</p>
            <h3 className="font-display text-[25px] font-medium text-white">Partner with SocietyFlats.</h3>
            <p className="mb-5 mt-2.5 text-sm leading-[1.55] text-[#D2E0D7]">Have verified Gurgaon inventory? Get society-specific enquiries and avoid duplicate listing spam.</p>
            <Link to="/broker-crm" className="inline-flex rounded-[11px] bg-[#F1F5EF] px-6 py-3 text-sm font-bold text-[#123C32]">Become a partner</Link>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-[900px] px-10">
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

        <section className="mx-auto mt-16 max-w-[1360px] px-10">
          <div className="rounded-[24px] bg-[#123C32] p-14 text-center text-white">
            <h2 className="font-display text-[40px] font-medium tracking-[-0.01em] text-white">{societies.length || 22} societies in. Thousands more Gurgaon homes to compare.</h2>
            <p className="mb-7 mt-3 text-base text-[#D2E0D7]">Tell us your budget and commute — SocietyFlats AI narrows it to 2–3 societies worth visiting.</p>
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
        subtitle="Share your requirement and SocietyFlats will help with relevant Gurgaon options."
        source="homepage"
        defaultMessage="Help me shortlist the right Gurgaon society."
        defaultRequirement="Gurgaon society shortlist"
        submitLabel="Request callback"
        onClose={() => setLeadOpen(false)}
      />
    </div>
  );
}
