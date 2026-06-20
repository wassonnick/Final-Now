import { useEffect, useMemo } from "react";
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
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { setPublicSeo } from "@/lib/seo";
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

const previewSocieties = [
  {
    name: "DLF Crest",
    locality: "Golf Course Road",
    score: "9.2",
    rent: "₹1.1L – ₹2.4L",
    resale: "₹6Cr – ₹12Cr",
  },
  {
    name: "M3M Golf Estate",
    locality: "Sector 65",
    score: "8.9",
    rent: "₹85K – ₹1.8L",
    resale: "₹4Cr – ₹9Cr",
  },
  {
    name: "Tulip Crimson",
    locality: "Sector 70A",
    score: "9.0",
    rent: "On request",
    resale: "On request",
  },
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
  return (
    society?.cover_image ||
    society?.coverImage ||
    society?.imageUrl ||
    society?.main_image_url ||
    societyPlaceholderImage(society?.name || "Society", localityName(society))
  );
}

function rentText(society: any) {
  return society?.rentRange || society?.rent_range || society?.locality?.avg_rent_3bhk || "On request";
}

function buyText(society: any) {
  return society?.buyRange || society?.buy_range || society?.resaleRange || "On request";
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
  if (!pros.length && rentText(society) !== "On request") pros.push("Rent range visible");
  if (!pros.length) pros.push("Good society context");
  return pros.slice(0, 3);
}

function societyWatchouts(society: any) {
  const watchouts = [];
  if (rentText(society) === "On request") watchouts.push("Rent needs verification");
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

function bestForRow(items: any[], key: string) {
  return Math.max(...items.map((society) => scoreValue(society, key)));
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
        <img src={coverImage(society)} alt={society?.name} className="h-full w-full object-cover" />
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

        <Button asChild className="mt-3 h-10 w-full rounded-full bg-blue-700 font-black text-white hover:bg-blue-800">
          <Link to={`/society/${society?.slug || ""}`}>
            View society <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ComparePage() {
  const { compareList, removeFromCompare, clearCompare } = useAppStore();
  const items = Array.isArray(compareList) ? compareList.slice(0, 3) : [];

  useEffect(() => {
    setPublicSeo(
      "Compare Gurgaon Societies | SocietyFlats",
      "Compare Gurgaon societies by score, location, amenities, rent range, resale range and next actions before choosing a home.",
    );
    window.scrollTo(0, 0);
  }, []);

  const winner = useMemo(() => {
    if (!items.length) return null;
    return [...items].sort((a, b) => scoreValue(b) - scoreValue(a))[0];
  }, [items]);

  if (!items.length) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <section className="border-b border-blue-100 bg-[radial-gradient(circle_at_80%_10%,rgba(37,99,235,0.12),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 py-8 md:py-10">
          <div className="container mx-auto">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                  <BarChart3 className="h-4 w-4" />
                  Society comparison
                </span>
                <h1 className="mt-4 max-w-4xl font-display text-[36px] font-black leading-[0.98] tracking-[-0.045em] text-navy-950 md:text-[56px]">
                  Compare Gurgaon societies before choosing the flat.
                </h1>
                <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-blue-500">
                  Go to society search, tap Compare on up to 3 society cards, then return here to compare score, location, recommended-for, pros, watch-outs and rent/resale context.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-12 rounded-full bg-blue-700 px-6 font-black text-white hover:bg-blue-800">
                    <Link to="/search?tab=societies">
                      Search societies <Search className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-12 rounded-full border-blue-100 bg-white px-6 font-black text-blue-700 hover:bg-blue-50">
                    <Link to="/ai-advisor">
                      Ask AI Advisor <Sparkles className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <aside className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-700">How compare works</p>
                <div className="mt-4 space-y-3">
                  {[
                    ["1", "Open society search"],
                    ["2", "Add up to 3 societies"],
                    ["3", "Compare score, price and fit"],
                  ].map(([step, label]) => (
                    <div key={step} className="flex items-center gap-3 rounded-2xl bg-blue-50 p-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">{step}</span>
                      <p className="text-sm font-black text-navy-800">{label}</p>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-8">
          <div className="rounded-[1.75rem] border border-blue-100 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Preview</p>
                <h2 className="mt-1.5 font-display text-2xl font-black text-navy-950 md:text-[30px]">
                  What your comparison will look like
                </h2>
              </div>
              <Button asChild variant="outline" className="rounded-full border-blue-100 font-black text-blue-700 hover:bg-blue-50">
                <Link to="/search?tab=societies">
                  Search and add to compare <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-700">
              How to add societies: open society search, tap the Compare button on any society card, add up to 3 societies, then come back here.
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {previewSocieties.map((society) => (
                <div key={society.name} className="rounded-[1.35rem] border border-blue-100 bg-[#F8FAFC] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{society.locality}</p>
                  <h3 className="mt-2 font-display text-xl font-black text-navy-950">{society.name}</h3>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white p-2">
                      <p className="text-[11px] font-bold text-blue-300">Score</p>
                      <p className="font-black text-navy-950">{society.score}</p>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <p className="text-[11px] font-bold text-blue-300">Rent</p>
                      <p className="truncate text-sm font-black text-navy-950">{society.rent}</p>
                    </div>
                    <div className="rounded-xl bg-white p-2">
                      <p className="text-[11px] font-bold text-blue-300">Resale</p>
                      <p className="truncate text-sm font-black text-navy-950">{society.resale}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <section className="border-b border-blue-100 bg-white px-4 py-6">
        <div className="container mx-auto flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Compare journey</p>
            <h1 className="mt-1.5 font-display text-3xl font-black text-navy-950 md:text-4xl">
              Compare selected societies
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-navy-500">
              Side-by-side society intelligence, price context and next actions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {items.length < 3 ? (
              <Button asChild variant="outline" className="rounded-full border-blue-100 font-black text-blue-700">
                <Link to="/search?tab=societies">
                  <Plus className="mr-2 h-4 w-4" /> Add society
                </Link>
              </Button>
            ) : null}
            <Button variant="ghost" className="rounded-full text-navy-500" onClick={clearCompare}>
              <X className="mr-2 h-4 w-4" /> Clear all
            </Button>
          </div>
        </div>
      </section>

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

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 rounded-l-2xl bg-[#F8FAFC] p-3 text-left text-xs font-black uppercase tracking-[0.14em] text-navy-500">
                    Parameter
                  </th>
                  {items.map((society) => (
                    <th key={society.id || society.slug} className="bg-[#F8FAFC] p-3 text-left text-sm font-black text-navy-950">
                      {society.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
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
                                  style={{ width: `${Math.min(score || 8, 100)}%` }}
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
          <div className="rounded-[1.5rem] border border-blue-100 bg-navy-950 p-4 text-white shadow-sm">
            <Sparkles className="h-5 w-5 text-blue-200" />
            <h3 className="mt-3 font-black">Need help deciding?</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-blue-100">
              Ask AI to rank the comparison by commute, budget, school or lifestyle.
            </p>
            <Button asChild className="mt-4 h-10 w-full rounded-full bg-white font-black text-navy-950 hover:bg-blue-50">
              <Link to="/ai-advisor">Open AI Advisor</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ComparePage;
