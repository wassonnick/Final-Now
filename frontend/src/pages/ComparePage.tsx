import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Home,
  MapPin,
  Minus,
  Plus,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { setPublicSeo } from "@/lib/seo";
import { fetchPublicSocieties, societyImage } from "@/lib/publicData";
import { societyPlaceholderImage } from "@/lib/societyImages";

const comparisonRows = [
  { key: "overall_score", label: "Overall score", group: "Decision" },
  { key: "security_score", label: "Security", group: "Society quality" },
  { key: "maintenance_score", label: "Maintenance", group: "Society quality" },
  { key: "amenities_score", label: "Amenities", group: "Lifestyle" },
  { key: "connectivity_score", label: "Connectivity", group: "Location" },
  { key: "family_friendly_score", label: "Family fit", group: "Lifestyle" },
  { key: "pet_friendly_score", label: "Pet friendly", group: "Lifestyle" },
  { key: "construction_quality_score", label: "Construction", group: "Quality" },
  { key: "rental_demand_score", label: "Rental demand", group: "Market" },
];

const amenityList = [
  ["swimming_pool", "Pool"],
  ["gym", "Gym"],
  ["club_house", "Club"],
  ["jogging_track", "Jogging"],
  ["kids_play_area", "Kids area"],
  ["senior_citizen_area", "Senior zone"],
  ["tennis_court", "Tennis"],
  ["party_hall", "Party hall"],
];

const contextRows = [
  { key: "location", label: "Location", group: "Context" },
  { key: "rent", label: "Rent range", group: "Market" },
  { key: "buy", label: "Buy range", group: "Market" },
  { key: "schools", label: "Nearby schools", group: "Family" },
  { key: "hospitals", label: "Hospitals", group: "Family" },
  { key: "offices", label: "Office hubs", group: "Commute" },
  { key: "best_for", label: "Best for", group: "Decision" },
  { key: "confidence", label: "Data confidence", group: "Trust" },
  { key: "updated", label: "Last updated", group: "Trust" },
];

function fieldValue(society: any, key: string, fallback: any = "—") {
  return society?.[key] ?? society?.[key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())] ?? fallback;
}

function scoreValue(society: any, key = "overall_score") {
  const value = Number(fieldValue(society, key, 0));
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value > 10 ? Math.round(value) : Math.round(value * 10);
}

function scoreDisplay(society: any, key = "overall_score") {
  const score = scoreValue(society, key);
  return score ? `${score}` : "—";
}

function localityName(society: any) {
  if (typeof society?.locality === "string") return society.locality;
  return society?.locality?.name || society?.sector || society?.address || "Gurgaon";
}

function coverImage(society: any) {
  return societyImage(society);
}

function fallbackCompareImage(society: any) {
  return societyPlaceholderImage(society?.name || "Society", localityName(society));
}

// Some older AI-enriched records have a parenthetical aside baked into the range string
// instead of a bare range — strip it so the card doesn't blow out into several lines.
function stripRangeAside(value: string) {
  return value.replace(/\s*[(;].*$/, "").trim();
}

// Renting out an under-construction unit isn't possible yet, so a rental range only makes
// sense once the project is actually ready to move into / delivered.
function rentText(society: any) {
  const status = String(society?.projectStatus ?? society?.project_status ?? "").toLowerCase();
  if (/under construction|new launch/.test(status)) return "Available after possession";
  const raw = society?.rentRange || society?.rent_range || society?.locality?.avg_rent_3bhk;
  return raw ? stripRangeAside(raw) : "On request";
}

function buyText(society: any) {
  const raw = society?.buyRange || society?.buy_range || society?.resaleRange;
  return raw ? stripRangeAside(raw) : "On request";
}

function recommendedFor(society: any) {
  const location = localityName(society);
  const score = scoreValue(society);
  const rental = scoreValue(society, "rental_demand_score");
  const family = scoreValue(society, "family_friendly_score");
  const pet = scoreValue(society, "pet_friendly_score");

  if (rental >= 80) return "Rental demand and corporate tenants";
  if (family >= 80) return "Families comparing lifestyle and schools";
  if (pet >= 75) return "Pet-friendly home seekers";
  if (score >= 85) return "Premium society-first shortlist";
  return `${location} society comparison`;
}

function societyPros(society: any) {
  const pros = [];
  if (scoreValue(society, "connectivity_score") >= 80) pros.push("Strong connectivity");
  if (scoreValue(society, "security_score") >= 80) pros.push("Security strength");
  if (scoreValue(society, "amenities_score") >= 80) pros.push("Amenity depth");
  if (scoreValue(society, "rental_demand_score") >= 80) pros.push("Rental demand");
  if (!pros.length && !["On request", "Available after possession"].includes(rentText(society))) pros.push("Rent range visible");
  if (!pros.length) pros.push("Good society context");
  return pros.slice(0, 3);
}

function societyWatchouts(society: any) {
  const watchouts = [];
  if (rentText(society) === "On request") watchouts.push("Rent needs verification");
  else if (rentText(society) === "Available after possession") watchouts.push("Rent available after possession");
  if (buyText(society) === "On request") watchouts.push("Resale range pending");
  if (scoreValue(society, "maintenance_score") && scoreValue(society, "maintenance_score") < 70) watchouts.push("Check maintenance");
  if (scoreValue(society, "connectivity_score") && scoreValue(society, "connectivity_score") < 70) watchouts.push("Check commute");
  if (!watchouts.length) watchouts.push("Verify tower/floor pricing");
  return watchouts.slice(0, 2);
}

function amenityValue(society: any, key: string) {
  const amenities = society?.amenities;
  if (!amenities) return false;
  if (Array.isArray(amenities)) {
    return amenities.some((item) => String(item).toLowerCase().replace(/\s+/g, "_") === key);
  }
  return Boolean(amenities?.[key]);
}

function contextualValue(society: any, key: string) {
  const values: Record<string, unknown> = {
    location: localityName(society),
    rent: rentText(society),
    buy: buyText(society),
    schools: fieldValue(society, "nearby_schools", "Needs verification"),
    hospitals: fieldValue(society, "nearby_hospitals", "Needs verification"),
    offices: fieldValue(society, "nearby_office_hubs", "Needs verification"),
    best_for: recommendedFor(society),
    confidence: (() => {
      const value = Number(fieldValue(society, "source_confidence_score", 0));
      return value > 0 ? `${value}% verified` : "Review pending";
    })(),
    updated: fieldValue(society, "updated_at", "Admin-reviewed profile"),
  };
  const raw = values[key];
  if (Array.isArray(raw)) return raw.slice(0, 2).join(" · ") || "Needs verification";
  if (raw && typeof raw === "object") return Object.values(raw as Record<string, unknown>).slice(0, 2).join(" · ") || "Needs verification";
  return String(raw || "Needs verification");
}

function compareRankPrompt(items: any[]) {
  const names = items.map((item) => item?.name).filter(Boolean);
  if (!names.length) {
    return "Rank Gurgaon societies by family fit, commute, rent, resale and overall lifestyle.";
  }

  return `Rank only these selected societies in order: ${names.join(" vs ")}. Do not suggest other societies unless clearly marked as broader alternatives. Compare family fit, commute, rent value, resale value, amenities, pros, watch-outs and best overall choice.`;
}

function compareHelpMessage(items: any[]) {
  const names = items.map((item) => item?.name).filter(Boolean);
  const subject = names.length ? names.join(" vs ") : "Gurgaon societies";
  return encodeURIComponent(`Hi SocietyFlats, I need help comparing ${subject}. Please guide me on rent, resale, commute, family fit and available homes.`);
}

function societyHelpMessage(society: any) {
  return encodeURIComponent(`Hi SocietyFlats, I need info and availability for ${society?.name || "this society"} from the compare page.`);
}

function compareSearchPanelLabel(count: number) {
  if (count === 0) return "Search society to compare";
  if (count >= 3) return "Compare list full";
  return "Find another society to compare";
}

function bestForRow(items: any[], key: string) {
  return Math.max(...items.map((society) => scoreValue(society, key)));
}

function bestSocietyFor(items: any[], key: string) {
  if (!items.length) return null;
  return [...items].sort((a, b) => scoreValue(b, key) - scoreValue(a, key))[0];
}

function scoreOrReview(society: any, key: string) {
  const score = scoreValue(society, key);
  return score ? `${score}/100` : "To be reviewed";
}

function CompareCard({
  society,
  index,
  onRemove,
}: {
  society: any;
  index: number;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white shadow-sm">
      <div className="relative h-32 overflow-hidden bg-blue-50">
        <img
          src={coverImage(society)}
          alt={society?.name}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = fallbackCompareImage(society);
          }}
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-600 shadow-sm hover:bg-red-50"
          aria-label="Remove from compare"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
          Society {index + 1}
        </span>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-1 font-display text-xl font-black text-navy-950">{society?.name || "Society"}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-blue-500">
          <MapPin className="h-4 w-4" />
          {localityName(society)}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-blue-50 p-2.5">
            <p className="text-[11px] font-bold text-blue-300">Score</p>
            <p className="text-lg font-black text-navy-950">{scoreDisplay(society)}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-2.5">
            <p className="text-[11px] font-bold text-blue-300">Rent</p>
            <p className="truncate text-sm font-black text-navy-950">{rentText(society)}</p>
          </div>
          <div className="rounded-xl bg-ivory-100 p-2.5">
            <p className="text-[11px] font-bold text-blue-300">Resale</p>
            <p className="truncate text-sm font-black text-navy-950">{buyText(society)}</p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/55 p-3">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">Recommended for</p>
          <p className="mt-1 text-sm font-black leading-5 text-navy-900">{recommendedFor(society)}</p>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">Pros</p>
            <div className="mt-2 space-y-1.5">
              {societyPros(society).map((item) => (
                <p key={item} className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-amber-50 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">Watch-outs</p>
            <div className="mt-2 space-y-1.5">
              {societyWatchouts(society).map((item) => (
                <p key={item} className="text-xs font-bold text-amber-800">• {item}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button asChild className="h-10 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
            <Link to={`/society/${society?.slug || ""}`}>
              View society <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <a
            href={`https://wa.me/919911886222?text=${societyHelpMessage(society)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center rounded-full border border-green-200 bg-green-50 px-3 text-sm font-black text-green-700 hover:bg-green-100"
          >
            <MessageCircle className="mr-1.5 h-4 w-4" />
            Get help
          </a>
        </div>
      </div>
    </div>
  );
}

export function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useAppStore();
  const [publicSocieties, setPublicSocieties] = useState<any[]>([]);
  const [publicSocietiesLoading, setPublicSocietiesLoading] = useState(true);
  const [publicSocietiesError, setPublicSocietiesError] = useState("");
  const [compareSearchOpen, setCompareSearchOpen] = useState(false);
  const publicSocietyIds = useMemo(
    () => new Set(publicSocieties.map((society) => String(society?.id)).filter(Boolean)),
    [publicSocieties],
  );
  const items = useMemo(
    () => (Array.isArray(compareList) ? compareList.filter((item: any) => publicSocietyIds.has(String(item?.id))).slice(0, 3) : []),
    [compareList, publicSocietyIds],
  );
  const previewSocieties = publicSocieties.slice(0, 3);

  const clearAndOpenSearch = () => {
    clearCompare();
    setCompareSearchOpen(true);
  };

  useEffect(() => {
    setPublicSeo(
      "Compare Gurgaon Societies Side-by-Side — Scores, Rent & Resale | SocietyFlats",
      "Put Gurgaon societies side by side — scores, location, amenities, honest rent and resale ranges — and see clearly which one feels like home before you visit.",
    );
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadPublicSocieties() {
      try {
        setPublicSocietiesLoading(true);
        setPublicSocietiesError("");
        const societies = await fetchPublicSocieties();

        if (mounted) {
          setPublicSocieties(societies);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setPublicSocietiesError("Unable to verify live societies right now.");
          setPublicSocieties([]);
        }
      } finally {
        if (mounted) {
          setPublicSocietiesLoading(false);
        }
      }
    }

    void loadPublicSocieties();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (publicSocietiesLoading) return;

    compareList.forEach((item: any) => {
      if (item?.id && !publicSocietyIds.has(String(item.id))) {
        removeFromCompare(item.id);
      }
    });
  }, [compareList, publicSocietiesLoading, publicSocietyIds, removeFromCompare]);

  useEffect(() => {
    if (!items.length) setCompareSearchOpen(true);
  }, [items.length]);

  const winner = useMemo(() => {
    if (!items.length) return null;
    return [...items].sort((a, b) => scoreValue(b) - scoreValue(a))[0];
  }, [items]);
  const familyWinner = bestSocietyFor(items, "family_friendly_score");
  const commuteWinner = bestSocietyFor(items, "connectivity_score");
  const valueWinner = bestSocietyFor(items, "rental_demand_score");

  if (publicSocietiesLoading) {
    return (
      <div className="min-h-screen bg-[#F8F3EA]">
        <section className="container mx-auto px-4 py-12">
          <div className="rounded-[1.75rem] border border-blue-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <h1 className="mt-5 font-display text-3xl font-black text-navy-950">Checking live societies…</h1>
            <p className="mt-2 text-sm font-semibold text-navy-500">
              Compare only uses currently published society profiles.
            </p>
          </div>
        </section>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#F8F3EA]">
        <main className="mx-auto max-w-[1360px] px-4 py-8 md:px-10 md:pb-16">
          <h1 className="font-display text-[34px] font-medium text-[#10251F]">Compare societies</h1>
          <p className="mt-1.5 text-sm text-[#6E756E]">Side by side across the things that actually decide where you live.</p>
          <p className="mt-1.5 text-[13px] font-semibold text-[#2A6147]">Every column below comes from the same admin-reviewed dataset — nothing here is estimated on the spot.</p>

          <div className="mt-7 rounded-[16px] bg-[#123C32] px-[22px] py-[18px] text-[#F1F5EF] md:flex md:items-center md:gap-6">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8BCB9E]">AI summary</span>
            <span className="mt-2 block text-sm md:mt-0"><strong>Add 2–3 societies</strong> to compare family fit, commute and value.</span>
          </div>

          <div className="mt-[22px] flex flex-wrap gap-3">
            <Link to="/search?tab=societies" className="rounded-[11px] bg-[#C8783F] px-[22px] py-3 text-sm font-bold text-white">Add societies</Link>
            <Link to="/ai-advisor" className="rounded-[11px] border border-[#E7E3DA] bg-white px-[22px] py-3 text-sm font-bold text-[#25302B]">Help me choose</Link>
          </div>

          <div className="mt-[18px] overflow-hidden rounded-[18px] border border-[#E7E3DA] bg-white">
            {["Location", "Rent range", "Buy range", "Connectivity", "Security", "Lifestyle", "Nearby schools", "Office hubs", "Best for", "Data confidence", "Last updated"].map((label, index) => (
              <div key={label} className={`grid grid-cols-[145px_1fr] md:grid-cols-[200px_1fr] ${index ? "border-t border-[#EEEAE1]" : ""}`}>
                <div className="bg-[#F6F4EE] px-5 py-4 text-[13px] font-bold text-[#4A534E]">{label}</div>
                <div className="px-5 py-4 text-sm text-[#7A817D]">Add societies from search to compare this field.</div>
              </div>
            ))}
          </div>
          {publicSocietiesError ? <p className="mt-4 text-sm font-semibold text-[#9A5A32]">{publicSocietiesError}</p> : null}
        </main>
      </div>
    );
  }

  const handoffRows = [
    ["Location", (society: any) => localityName(society)],
    ["Rent range", (society: any) => rentText(society)],
    ["Buy range", (society: any) => buyText(society)],
    ["Connectivity", (society: any) => scoreOrReview(society, "connectivity_score")],
    ["Security", (society: any) => scoreOrReview(society, "security_score")],
    ["Maintenance", (society: any) => scoreOrReview(society, "maintenance_score")],
    ["Lifestyle", (society: any) => recommendedFor(society)],
    ["Nearby schools", (society: any) => contextualValue(society, "schools")],
    ["Office hubs", (society: any) => contextualValue(society, "offices")],
    ["Best for", (society: any) => recommendedFor(society)],
    ["Data confidence", (society: any) => contextualValue(society, "confidence")],
    ["Last updated", (society: any) => contextualValue(society, "updated")],
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8F3EA]">
      <main className="mx-auto max-w-[1360px] px-4 py-8 md:px-10 md:pb-16">
        <h1 className="font-display text-[34px] font-medium text-[#10251F]">Compare societies</h1>
        <p className="mt-1.5 text-sm text-[#6E756E]">Side by side across the things that actually decide where you live.</p>

        {items.length < 2 ? (
          <div className="mt-7 rounded-[16px] border border-dashed border-[#C8783F]/40 bg-[#FBF1E8] px-[22px] py-[18px]">
            <p className="text-sm font-bold text-[#25302B]">Pick a second society to compare.</p>
            <Link to="/search?tab=societies" className="mt-2 inline-block rounded-[11px] bg-[#C8783F] px-[18px] py-2.5 text-sm font-bold text-white">Add another society</Link>
          </div>
        ) : (
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[16px] bg-[#123C32] px-[22px] py-[18px] text-[#F1F5EF]">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#8BCB9E]">AI summary</span>
            <span className="text-sm"><strong>Best for families:</strong> {familyWinner?.name || "Needs review"}</span>
            <span className="text-sm"><strong>Best for commute:</strong> {commuteWinner?.name || "Needs review"}</span>
            <span className="text-sm"><strong>Best value:</strong> {valueWinner?.name || "Needs review"}</span>
          </div>
        )}

        <div className="mt-[22px] flex flex-wrap gap-3">
          <Link to={`/ai-advisor?q=${encodeURIComponent(compareRankPrompt(items))}`} className="rounded-[11px] bg-[#C8783F] px-[22px] py-3 text-sm font-bold text-white">Help me choose</Link>
          <a href={`https://wa.me/919911886222?text=${compareHelpMessage(items)}`} target="_blank" rel="noreferrer" className="rounded-[11px] border border-[#E7E3DA] bg-white px-[22px] py-3 text-sm font-bold text-[#25302B]">Get options in these societies</a>
          <a href={`https://wa.me/919911886222?text=${compareHelpMessage(items)}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-[11px] border border-[#E7E3DA] bg-white px-[22px] py-3 text-sm font-bold text-[#25302B]"><MessageCircle className="mr-2 h-4 w-4 text-green-600" />Share on WhatsApp</a>
          <button type="button" onClick={clearAndOpenSearch} className="rounded-[11px] border border-[#E7E3DA] bg-white px-[22px] py-3 text-sm font-bold text-[#6E756E]">Change societies</button>
        </div>

        <div className="mt-[18px] overflow-x-auto rounded-[18px] border border-[#E7E3DA] bg-white">
          <div className="min-w-[760px]">
            <div className="grid border-b border-[#EEEAE1]" style={{ gridTemplateColumns: `200px repeat(${items.length}, minmax(190px, 1fr))` }}>
              <div className="bg-[#F6F4EE] px-5 py-4 text-[13px] font-bold text-[#4A534E]">Society</div>
              {items.map((society) => (
                <div key={`head-${society.id || society.slug}`} className="border-l border-[#EEEAE1] px-5 py-4">
                  <Link to={`/society/${society.slug || ""}`} className="text-sm font-bold text-[#123C32]">{society.name}</Link>
                </div>
              ))}
            </div>
            {handoffRows.map(([label, getter], rowIndex) => {
              const scoreKey = ({ Connectivity: "connectivity_score", Security: "security_score", Maintenance: "maintenance_score" } as Record<string, string>)[label];
              const bestScore = scoreKey && items.length > 1 ? Math.max(...items.map((society) => scoreValue(society, scoreKey))) : 0;
              return (
              <div key={label} className="grid border-b border-[#EEEAE1] last:border-b-0" style={{ gridTemplateColumns: `200px repeat(${items.length}, minmax(190px, 1fr))` }}>
                <div className={rowIndex % 2 === 0 ? "bg-[#F6F4EE] px-5 py-4 text-[13px] font-bold text-[#4A534E]" : "bg-white px-5 py-4 text-[13px] font-bold text-[#4A534E]"}>{label}</div>
                {items.map((society) => {
                  const isWinner = Boolean(scoreKey) && bestScore > 0 && scoreValue(society, scoreKey as string) === bestScore;
                  return (
                  <div key={`${label}-${society.id || society.slug}`} className={`border-l border-[#EEEAE1] px-5 py-4 text-sm font-medium text-[#25302B] ${isWinner ? "bg-[#EEF5F1]" : ""}`}>
                    {getter(society)}
                    {isWinner ? <span className="ml-2 rounded-full bg-[#E8F7E9] px-2 py-0.5 text-[10px] font-bold text-[#2A6147]">Best</span> : null}
                  </div>
                  );
                })}
              </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );

  /*
  return (
    <div className="min-h-screen bg-[#F8F3EA]">
      <section className="border-b border-[#E7DCCB] bg-[linear-gradient(180deg,#FFFBF3_0%,#F8F3EA_100%)] px-4 py-5">
        <div className="container mx-auto">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Compare selected</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-black text-navy-950 md:text-4xl">
                  {items.length} societ{items.length === 1 ? "y" : "ies"} selected
                </h1>
                <span className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-black text-blue-700 shadow-sm">
                  Maximum 3
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-navy-500">
                Compare score, price context, recommended use-case, pros and watch-outs. Add more societies from search if needed.
              </p>
            </div>

            <div className="rounded-[1.35rem] border border-blue-100 bg-white p-3 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Search more societies</p>
              <div className="mt-2 flex gap-2">
                <Link
                  to="/search?tab=societies&intent=society"
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
                >
                  <Search className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {compareSearchOpen || items.length === 0 ? "Search society to compare" : compareSearchPanelLabel(items.length)}
                  </span>
                </Link>

                {items.length < 3 ? (
                  <Button asChild className="h-11 rounded-full bg-blue-700 px-5 font-black text-white hover:bg-blue-800">
                    <Link to="/search?tab=societies&intent=society">
                      <Plus className="mr-2 h-4 w-4" /> Add
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" className="h-11 rounded-full border-blue-100 px-5 font-black text-blue-700" onClick={clearAndOpenSearch}>
                    Clear + search
                  </Button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-navy-500">
                <Link to="/search?tab=societies&q=Golf%20Course%20Road&intent=society" className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Golf Course Road</Link>
                <Link to="/search?tab=societies&q=Sector%2065&intent=society" className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Sector 65</Link>
                <Link to="/search?tab=societies&q=M3M&intent=society" className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">M3M</Link>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" className="rounded-full text-navy-500" onClick={clearAndOpenSearch}>
              <X className="mr-2 h-4 w-4" /> Clear and search again
            </Button>
            <Button asChild variant="outline" className="rounded-full border-blue-100 font-black text-blue-700">
              <Link to={`/ai-advisor?q=${encodeURIComponent(compareRankPrompt(items))}`}>
                Ask AI to rank these <Sparkles className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {compareSearchOpen ? (
        <section className="border-b border-blue-100 bg-white px-4 py-4">
          <div className="container mx-auto rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-[1fr_220px] md:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Search society to compare</p>
                <h2 className="mt-1 font-display text-2xl font-black text-navy-950">Add societies again from search</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-blue-600">
                  Search a society, sector or builder. Tap Compare on up to 3 society cards and return here.
                </p>
              </div>

              <Button asChild className="h-12 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
                <Link to="/search?tab=societies&intent=society">
                  Open society search <Search className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
              <Link to="/search?tab=societies&q=Golf%20Course%20Road&intent=society" className="rounded-full bg-white px-3 py-1.5 text-blue-700">Golf Course Road</Link>
              <Link to="/search?tab=societies&q=Sector%2065&intent=society" className="rounded-full bg-white px-3 py-1.5 text-blue-700">Sector 65</Link>
              <Link to="/search?tab=societies&q=M3M&intent=society" className="rounded-full bg-white px-3 py-1.5 text-blue-700">M3M</Link>
              <Link to="/search?tab=societies&q=DLF&intent=society" className="rounded-full bg-white px-3 py-1.5 text-blue-700">DLF</Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="container mx-auto px-4 py-6">
        {winner ? (
          <div className="mb-5 rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 md:flex md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Top score in this comparison</p>
              <h2 className="mt-1 font-display text-2xl font-black text-navy-950">{winner.name}</h2>
              <p className="mt-1 text-sm font-semibold text-navy-500">
                Highest overall score among your selected societies. Still compare location, budget and lifestyle fit before deciding.
              </p>
            </div>
            <Button asChild className="mt-3 rounded-full bg-blue-700 font-black text-white hover:bg-blue-800 md:mt-0">
              <Link to={`/society/${winner.slug || ""}`}>
                View top society <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : null}

        {items.length ? (
          <div className="mb-4 rounded-[1.35rem] border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">Need help choosing?</p>
                <h2 className="mt-1 font-display text-2xl font-black text-navy-950">Talk to SocietyFlats before final shortlisting.</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-navy-500">
                  Share this comparison and get help on rent, resale, commute, family fit and available homes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="tel:+919911886222" className="inline-flex h-11 items-center justify-center rounded-full bg-blue-700 px-5 text-sm font-black text-white hover:bg-blue-800">
                  <Phone className="mr-2 h-4 w-4" /> Call
                </a>
                <a href={`https://wa.me/919911886222?text=${compareHelpMessage(items)}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-full border border-green-200 bg-green-50 px-5 text-sm font-black text-green-700 hover:bg-green-100">
                  <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {items.map((society, index) => (
            <CompareCard
              key={society.id || society.slug || society.name}
              society={society}
              index={index}
              onRemove={() => removeFromCompare(society.id)}
            />
          ))}
        </div>

        <div className="mt-6 rounded-[1.75rem] border border-blue-100 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Decision grid</p>
              <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950">Score-by-score comparison</h2>
              <p className="mt-1.5 max-w-2xl text-sm font-semibold leading-6 text-navy-500">
                Scores are only one lens. Use the cards above for recommended use-case, pros and watch-outs.
              </p>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {contextRows.map((row) => (
              <div key={`mobile-${row.key}`} className="rounded-[16px] border border-[#E7DCCB] bg-[#FFFBF3] p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#2A6147]">{row.group}</p>
                <h3 className="mt-1 text-base font-bold text-[#10251F]">{row.label}</h3>
                <div className="mt-3 space-y-2">
                  {items.map((society) => (
                    <div key={`${society.id || society.slug}-mobile-${row.key}`} className="rounded-[12px] bg-white p-3">
                      <p className="text-xs font-bold text-[#6E756E]">{society.name}</p>
                      <p className="mt-1 text-sm font-semibold leading-5 text-[#25302B]">{contextualValue(society, row.key)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 rounded-l-2xl bg-[#EEF5F1] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Parameter
                  </th>
                  {items.map((society) => (
                    <th key={society.id || society.slug} className="bg-[#EEF5F1] p-3 text-left text-sm font-black text-navy-950">
                      {society.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contextRows.map((row) => (
                  <tr key={row.key}>
                    <td className="sticky left-0 z-10 rounded-l-2xl bg-white p-3">
                      <p className="text-sm font-black text-navy-950">{row.label}</p>
                      <p className="text-xs font-bold text-blue-400">{row.group}</p>
                    </td>
                    {items.map((society) => (
                      <td key={`${society.id || society.slug}-${row.key}`} className="bg-white p-3 align-top">
                        <p className="max-w-[260px] text-sm font-semibold leading-6 text-navy-700">
                          {contextualValue(society, row.key)}
                        </p>
                      </td>
                    ))}
                  </tr>
                ))}
                {comparisonRows.map((row) => {
                  const best = bestForRow(items, row.key);
                  return (
                    <tr key={row.key}>
                      <td className="sticky left-0 z-10 rounded-l-2xl bg-white p-3">
                        <p className="text-sm font-black text-navy-950">{row.label}</p>
                        <p className="text-xs font-bold text-blue-400">{row.group}</p>
                      </td>
                      {items.map((society) => {
                        const score = scoreValue(society, row.key);
                        const isBest = score && score === best;
                        return (
                          <td key={`${society.id || society.slug}-${row.key}`} className="bg-white p-3">
                            <div className="flex items-center gap-3">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-50">
                                <div
                                  className={isBest ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-blue-400"}
                                  style={{ width: `${Math.min(score || 0, 100)}%` }}
                                />
                              </div>
                              <span className={isBest ? "w-9 text-right text-sm font-black text-emerald-700" : "w-9 text-right text-sm font-black text-navy-700"}>
                                {score || "—"}
                              </span>
                              {isBest ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                <tr>
                  <td className="sticky left-0 z-10 rounded-l-2xl bg-white p-3">
                    <p className="text-sm font-black text-navy-950">Amenities</p>
                    <p className="text-xs font-bold text-blue-400">Quick check</p>
                  </td>
                  {items.map((society) => (
                    <td key={`${society.id || society.slug}-amenities`} className="bg-white p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {amenityList.slice(0, 6).map(([key, label]) => (
                          <span
                            key={key}
                            className={
                              amenityValue(society, key)
                                ? "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700"
                                : "rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500"
                            }
                          >
                            {amenityValue(society, key) ? label : <Minus className="inline h-3 w-3" />}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <h3 className="mt-3 font-black text-navy-950">Use scores carefully</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">
              Highest score is not always the best fit. Budget, commute and family needs can change the answer.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-blue-100 bg-white p-4 shadow-sm">
            <Home className="h-5 w-5 text-blue-700" />
            <h3 className="mt-3 font-black text-navy-950">Check live inventory</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">
              Open each society to see available homes and callback options before planning a visit.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-4 shadow-sm">
            <Sparkles className="h-5 w-5 text-blue-200" />
            <h3 className="mt-3 font-black">Need help deciding?</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">
              Ask AI to rank the comparison by commute, budget, school or lifestyle.
            </p>
            <Button asChild className="mt-4 h-10 w-full rounded-full bg-white font-black text-navy-950 hover:bg-blue-50">
              <Link to={`/ai-advisor?q=${encodeURIComponent(compareRankPrompt(items))}`}>Ask AI Advisor</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
  */
}

export default ComparePage;
