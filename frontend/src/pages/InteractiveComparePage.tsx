import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, MessageCircle, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/config/api";
import { backendApi } from "@/services/backendApi";
import { useAppStore } from "@/store";
import { fetchPublicSocieties, formatPublicLocation } from "@/lib/publicData";
import { societyDisplayImage, hasGooglePlacesDisplayPhoto } from "@/lib/societyImages";
import { setPublicSeo } from "@/lib/seo";

// Typeahead picker — add any published society to the comparison without leaving the page.
function SocietyPicker({ selectedSlugs }: { selectedSlugs: string[] }) {
  const addToCompare = useAppStore((s) => s.addToCompare);
  const [all, setAll] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchPublicSocieties().then((rows) => setAll(Array.isArray(rows) ? rows : [])).catch(() => setAll([]));
  }, []);

  const matches = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return all
      .filter((s) => !selectedSlugs.includes(s.slug))
      .filter((s) => [s.name, s.sector, s.locality, s.builder].some((v) => String(v || "").toLowerCase().includes(query)))
      .slice(0, 8);
  }, [q, all, selectedSlugs]);

  const disabled = selectedSlugs.length >= 3;

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-[#D8DFEC] bg-white px-4 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-[#8A8F89]" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={disabled ? "Remove one to add another" : "Add a society — name, sector or builder"}
          disabled={disabled}
          className="w-full bg-transparent text-sm outline-none placeholder:text-[#8A8F89] disabled:cursor-not-allowed"
        />
      </div>
      {open && matches.length ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-[16px] border border-[#E7DCCB] bg-white p-1.5 shadow-[0_24px_60px_-30px_rgba(0,0,0,.4)]">
          {matches.map((s) => (
            <button
              key={s.slug}
              onClick={() => { addToCompare(s); setQ(""); setOpen(false); }}
              className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left hover:bg-[#F8F3EA]"
            >
              <Plus className="h-4 w-4 shrink-0 text-[#233B6E]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#25302B]">{s.name}</p>
                <p className="truncate text-[12px] text-[#6E756E]">{formatPublicLocation(s)}{s.builder ? ` · ${s.builder}` : ""}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Interactive "society face-off" — the user's own selected societies, side by side.
// TruthEstate-inspired forensic layout: per-dimension rows with the leader highlighted,
// verified/estimated honesty, a Buyer's Truth strip, and a data-derived verdict.
type Row = { society: any; intel: any };

const f = (s: any, camel: string, snake: string, fb = "") => s?.[camel] ?? s?.[snake] ?? fb;
const num = (v: any) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

function scoreOf(s: any, intel: any) {
  return num(intel?.overall_score) ?? num(f(s, "score", "score"));
}

// ₹ text → absolute number (Cr/L/k aware) for the "value pick" verdict.
function priceFloor(text?: string): number | null {
  if (!text) return null;
  const m = String(text).replace(/,/g, "").match(/([\d.]+)\s*(cr|crore|l|lac|lakh|k)?/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  const u = (m[2] || "").toLowerCase();
  if (u.startsWith("cr")) n *= 1e7;
  else if (u.startsWith("l")) n *= 1e5;
  else if (u === "k") n *= 1e3;
  return n > 0 ? n : null;
}

export function InteractiveComparePage() {
  const [params] = useSearchParams();
  const compareList = useAppStore((s) => s.compareList);
  const removeFromCompare = useAppStore((s) => s.removeFromCompare);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const slugs = useMemo(() => {
    const fromStore = compareList.map((s: any) => s.slug).filter(Boolean);
    const fromParams = [params.get("seed"), ...(params.get("societies") || "").split(",")].map((v) => (v || "").trim()).filter(Boolean);
    return Array.from(new Set([...fromStore, ...fromParams])).slice(0, 3);
  }, [compareList, params]);

  useEffect(() => {
    setPublicSeo("Compare Gurgaon Societies Side by Side | SocietyFlats", "Compare your shortlisted Gurgaon societies on verified scores, market ranges and Buyer's Truth.", { canonical: "/compare", noindex: true });
  }, []);

  useEffect(() => {
    if (!slugs.length) {
      setRows([]);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    Promise.all([
      Promise.all(slugs.map((slug) => fetch(`${API_BASE_URL}/societies/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null))),
      backendApi.getCompareIntelligence(slugs).catch(() => null),
    ]).then(([societies, intelResp]: any[]) => {
      if (!mounted) return;
      const intelBySlug: Record<string, any> = {};
      (intelResp?.data || []).forEach((entry: any) => {
        if (entry?.society?.slug) intelBySlug[entry.society.slug] = entry.intelligence;
      });
      const next = slugs
        .map((slug) => {
          const soc = societies.find((r: any) => r?.data?.slug === slug)?.data || compareList.find((s: any) => s.slug === slug);
          return soc ? { society: soc, intel: intelBySlug[slug] || null } : null;
        })
        .filter(Boolean) as Row[];
      setRows(next);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [slugs]);

  const remove = (row: Row) => {
    if (row.society?.id) removeFromCompare(String(row.society.id));
    setRows((cur) => cur.filter((r) => r.society.slug !== row.society.slug));
  };

  // Union of signals across societies (from the intelligence breakdown), in weight order.
  const signalRows = useMemo(() => {
    const map = new Map<string, { label: string; weight: number }>();
    rows.forEach((r) => (r.intel?.signal_breakdown || []).forEach((sig: any) => { if (!map.has(sig.key)) map.set(sig.key, { label: sig.label, weight: sig.weight }); }));
    return [...map.entries()].sort((a, b) => b[1].weight - a[1].weight).map(([key, v]) => ({ key, ...v }));
  }, [rows]);

  const verdict = useMemo(() => {
    if (rows.length < 2) return null;
    const scored = rows.map((r) => ({ name: r.society.name, score: scoreOf(r.society, r.intel) })).filter((x) => x.score != null).sort((a, b) => (b.score as number) - (a.score as number));
    const rents = rows.map((r) => ({ name: r.society.name, floor: priceFloor(f(r.society, "rentRange", "rent_range")) })).filter((x) => x.floor != null).sort((a, b) => (a.floor as number) - (b.floor as number));
    return {
      topScored: scored.length && (scored.length < 2 || scored[0].score !== scored[1].score) ? scored[0] : null,
      valuePick: rents.length >= 2 && rents[0].floor !== rents[1].floor ? rents[0] : null,
    };
  }, [rows]);

  if (loading) return <div className="min-h-[50vh] bg-[#F7F4EF] p-16 text-center text-[#667085]">Loading your comparison…</div>;

  if (!rows.length) {
    return (
      <div className="min-h-[70vh] bg-[#F7F4EF] px-5 py-14 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8C6E2F]">Society face-off</p>
          <h1 className="mt-1.5 font-display text-[34px] font-medium leading-tight text-[#111827] md:text-[44px]">Build your own comparison.</h1>
          <p className="mt-3 text-[15px] leading-7 text-[#667085]">Search and add up to three Gurgaon societies — any combination you like. We line them up on verified scores, Buyer's Truth and market ranges.</p>
          <div className="mt-6 flex justify-center"><SocietyPicker selectedSlugs={slugs} /></div>
          <div className="mt-8">
            <Link to="/compare/browse" className="text-sm font-bold text-[#8C6E2F] underline">Or explore ready-made comparison pages →</Link>
          </div>
        </div>
      </div>
    );
  }

  const cols = rows.length;
  const gridCols = { gridTemplateColumns: `minmax(120px,1.1fr) repeat(${cols}, minmax(0,1fr))` };

  return (
    <div className="bg-[#F7F4EF] text-[#1C2434]">
      <section className="mx-auto max-w-[1180px] px-4 py-8 md:px-6 md:py-12">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8C6E2F]">Society face-off</p>
        <h1 className="mt-1.5 font-display text-[34px] font-medium leading-tight text-[#111827] md:text-[46px]">Compare, honestly — side by side.</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#667085]">Verified scores, the leader in each dimension, market ranges and the Buyer's Truth. Green is verified; amber is estimated and shown as such.</p>

        {verdict && (verdict.topScored || verdict.valuePick) ? (
          <div className="mt-5 flex flex-wrap gap-3">
            {verdict.topScored ? <span className="rounded-full bg-[#233B6E] px-4 py-2 text-sm font-bold text-white">Top scored · {verdict.topScored.name}</span> : null}
            {verdict.valuePick ? <span className="rounded-full border border-[#C5A766] bg-white px-4 py-2 text-sm font-bold text-[#8C6E2F]">Value pick · {verdict.valuePick.name}</span> : null}
          </div>
        ) : null}

        {/* Comparison grid */}
        <div className="mt-6 overflow-x-auto rounded-[22px] border border-[#E7DCCB] bg-white shadow-[0_18px_44px_-34px_rgba(0,0,0,.35)]">
          <div className="min-w-[640px]">
            {/* Sticky society headers */}
            <div className="grid border-b border-[#EEE6DA]" style={gridCols}>
              <div className="p-4" />
              {rows.map((r) => {
                const s = r.society;
                const sc = scoreOf(s, r.intel);
                const img = hasGooglePlacesDisplayPhoto(s) ? societyDisplayImage(s) : "";
                return (
                  <div key={s.slug} className="border-l border-[#EEE6DA] p-4">
                    <div className="relative mb-3 h-24 overflow-hidden rounded-[12px] bg-[#E8EDF7] [background-image:repeating-linear-gradient(135deg,#D8DFEC_0_1px,transparent_1px_12px)]">
                      {img ? <img src={img} alt={s.name} className="h-full w-full object-cover" /> : null}
                      <button onClick={() => remove(r)} aria-label={`Remove ${s.name}`} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#667085]"><X className="h-3.5 w-3.5" /></button>
                      {sc ? <span className="absolute bottom-1.5 left-1.5 rounded-[8px] bg-white px-2 py-0.5 text-xs font-black text-[#233B6E]">{sc}</span> : null}
                    </div>
                    <p className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FA] px-2 py-0.5 text-[10px] font-bold text-[#3156A3]"><Check className="h-3 w-3 stroke-[3]" /> Verified</p>
                    <p className="mt-1.5 truncate font-bold text-[#25302B]">{s.name}</p>
                    <p className="truncate text-[12.5px] text-[#6E756E]">{[f(s, "sector", "sector"), f(s, "builder", "builder")].filter(Boolean).join(" · ") || "Gurgaon"}</p>
                    <Link to={`/society/${s.slug}`} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-[#233B6E]">View society <ArrowRight className="h-3 w-3" /></Link>
                  </div>
                );
              })}
            </div>

            {/* Overall score row */}
            <CompareRow label="Overall score" cols={gridCols} leaderIdx={leaderIndex(rows.map((r) => scoreOf(r.society, r.intel)))}>
              {rows.map((r) => { const sc = scoreOf(r.society, r.intel); return <ScoreCell key={r.society.slug} value={sc} status="verified" />; })}
            </CompareRow>

            {/* Weighted signal rows */}
            {signalRows.map((sig) => {
              const vals = rows.map((r) => (r.intel?.signal_breakdown || []).find((x: any) => x.key === sig.key));
              return (
                <CompareRow key={sig.key} label={sig.label} sub={`${sig.weight}% weight`} cols={gridCols} leaderIdx={leaderIndex(vals.map((v: any) => num(v?.score)))}>
                  {vals.map((v: any, i) => <ScoreCell key={i} value={num(v?.score)} status={v?.status} />)}
                </CompareRow>
              );
            })}

            {/* Buyer's Truth */}
            <SectionLabel>Buyer's Truth</SectionLabel>
            <CompareRow label="RERA" cols={gridCols}>
              {rows.map((r) => { const rera = f(r.society, "reraNumber", "rera_number"); return <div key={r.society.slug} className="border-l border-[#EEE6DA] p-3 text-center"><span className={`text-[12.5px] font-bold ${rera ? "text-emerald-700" : "text-amber-700"}`}>{rera ? "Registered" : "Confirm"}</span></div>; })}
            </CompareRow>
            <CompareRow label="Possession" cols={gridCols}>
              {rows.map((r) => <div key={r.society.slug} className="border-l border-[#EEE6DA] p-3 text-center text-[12.5px] text-[#35413B]">{f(r.society, "projectStatus", "project_status", "—")}</div>)}
            </CompareRow>

            {/* Market */}
            <SectionLabel>Market ranges</SectionLabel>
            <CompareRow label="Rent" cols={gridCols}>
              {rows.map((r) => <div key={r.society.slug} className="border-l border-[#EEE6DA] p-3 text-center text-[12.5px] font-bold text-[#233B6E]">{f(r.society, "rentRange", "rent_range", "On request")}</div>)}
            </CompareRow>
            <CompareRow label="Buy" cols={gridCols}>
              {rows.map((r) => <div key={r.society.slug} className="border-l border-[#EEE6DA] p-3 text-center text-[12.5px] font-bold text-[#233B6E]">{f(r.society, "buyRange", "buy_range", "On request")}</div>)}
            </CompareRow>

            {/* CTAs */}
            <div className="grid border-t border-[#EEE6DA]" style={gridCols}>
              <div className="p-3" />
              {rows.map((r) => (
                <div key={r.society.slug} className="border-l border-[#EEE6DA] p-3">
                  <a href={`https://wa.me/919911886222?text=${encodeURIComponent(`Hi SocietyFlats, I want available homes in ${r.society.name}.`)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-full bg-[#233B6E] px-3 py-2 text-[12.5px] font-bold text-white"><MessageCircle className="h-3.5 w-3.5" /> Get homes</a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {cols < 3 ? (
          <div className="mt-5">
            <p className="mb-2 text-[13px] font-bold text-[#4A534E]">Add another society to the face-off</p>
            <SocietyPicker selectedSlugs={slugs} />
          </div>
        ) : null}

        <p className="mt-6 text-[12px] leading-6 text-[#8A8F89]">Scores are from admin-reviewed society data; amber signals are estimated and should be confirmed. Verify unit price, exact tower, availability, legal title and RERA status independently before any payment.</p>
      </section>
    </div>
  );
}

function leaderIndex(values: (number | null)[]): number {
  let best = -1, bestVal = -Infinity;
  values.forEach((v, i) => { if (v != null && v > bestVal) { bestVal = v; best = i; } });
  // No leader highlight unless a value is strictly greater than the rest.
  return values.filter((v) => v != null && v === bestVal).length === 1 ? best : -1;
}

function CompareRow({ label, sub, cols, leaderIdx = -1, children }: { label: string; sub?: string; cols: React.CSSProperties; leaderIdx?: number; children: React.ReactNode[] }) {
  return (
    <div className="grid border-t border-[#EEE6DA]" style={cols}>
      <div className="bg-[#FAF8F2] p-3 md:p-4"><p className="text-[13px] font-bold text-[#4A534E]">{label}</p>{sub ? <p className="text-[11px] text-[#8A8F89]">{sub}</p> : null}</div>
      {children.map((child, i) => (
        <div key={i} className={leaderIdx === i ? "relative bg-[#F7FAF7]" : ""}>
          {leaderIdx === i ? <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-[#2A6147] px-1.5 py-0.5 text-[9px] font-black uppercase text-white">Leads</span> : null}
          {child}
        </div>
      ))}
    </div>
  );
}

function ScoreCell({ value, status }: { value: number | null; status?: string }) {
  const verified = status === "verified";
  return (
    <div className="border-l border-[#EEE6DA] p-3">
      <div className="flex items-baseline justify-center gap-1"><span className="text-lg font-black text-[#25302B]">{value != null ? value.toFixed(1) : "—"}</span><span className="text-[10px] text-[#8A8F89]">/10</span></div>
      <div className="mx-auto mt-1.5 h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-[#E7E3DA]"><div className="h-full rounded-full" style={{ width: value != null ? `${value * 10}%` : "0%", background: verified ? "#2A6147" : "#C8A24B" }} /></div>
      {value != null ? <p className="mt-1 text-center text-[10px] font-bold" style={{ color: verified ? "#2A6147" : "#C8792F" }}>{verified ? "Verified" : "Estimated"}</p> : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="border-t border-[#EEE6DA] bg-[#233B6E] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#DCE6F7]">{children}</div>;
}

export default InteractiveComparePage;
