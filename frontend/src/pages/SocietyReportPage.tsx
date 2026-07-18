import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Printer } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";
import { API_BASE_URL } from "@/config/api";
import { backendApi } from "@/services/backendApi";
import { setPublicSeo } from "@/lib/seo";

// The premium Society Report — a clean, branded, print-to-PDF artifact built from the
// intelligence data we already hold. Gated on the society page by an email/phone capture;
// this route is opened only after a lead is created. Print CSS turns it into a PDF via the
// browser's "Save as PDF". A later paid tier just replaces the gate, not this page.
const f = (society: any, camel: string, snake: string, fallback = "") =>
  society?.[camel] ?? society?.[snake] ?? fallback;

export function SocietyReportPage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const [society, setSociety] = useState<any | null>(null);
  const [intel, setIntel] = useState<any | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    Promise.all([
      fetch(`${API_BASE_URL}/societies/${encodeURIComponent(slug)}`).then((r) => (r.ok ? r.json() : null)),
      backendApi.getSocietyIntelligence(slug).catch(() => null),
    ])
      .then(([soc, it]: any[]) => {
        if (!mounted) return;
        const data = soc?.data;
        if (!data) return setState("error");
        setSociety(data);
        setIntel(it?.data || null);
        setState("ready");
        setPublicSeo(`${data.name} — Society Report | SocietyFlats`, `Verified decision report for ${data.name}.`, { canonical: `/society/${data.slug}/report`, noindex: true });
      })
      .catch(() => mounted && setState("error"));
    return () => {
      mounted = false;
    };
  }, [slug]);

  // Auto-open the print dialog when arriving straight from the capture gate (?print=1).
  useEffect(() => {
    if (state === "ready" && params.get("print") === "1") {
      const t = window.setTimeout(() => window.print(), 700);
      return () => window.clearTimeout(t);
    }
  }, [state, params]);

  const signals = useMemo(() => (Array.isArray(intel?.signal_breakdown) ? intel.signal_breakdown : []), [intel]);

  if (state === "loading") return <div className="p-16 text-center text-[#667085]">Preparing the report…</div>;
  if (state === "error" || !society)
    return (
      <div className="p-16 text-center">
        <p className="text-[#667085]">This report isn't available.</p>
        <Link to="/societies" className="mt-4 inline-block font-bold text-[#233B6E] underline">Browse societies</Link>
      </div>
    );

  const reraNumber = f(society, "reraNumber", "rera_number");
  const projectStatus = f(society, "projectStatus", "project_status", "—");
  const possession = f(society, "possessionDate", "possession_date", "—");
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="report-root mx-auto max-w-[820px] bg-white text-[#1C2434]">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-root { max-width: none; }
          .report-page { page-break-after: always; }
          @page { margin: 16mm; }
        }
        .report-page:last-child { page-break-after: auto; }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E7DCCB] bg-[#F8F3EA] px-5 py-3">
        <p className="text-sm font-bold text-[#233B6E]">Your Society Report is ready.</p>
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-[#233B6E] px-5 py-2.5 text-sm font-bold text-white">
          <Printer className="h-4 w-4" /> Download / Print PDF
        </button>
      </div>

      <div className="px-8 py-10">
        {/* Cover */}
        <div className="report-page">
          <div className="flex items-center gap-2.5">
            <BrandMark size={34} className="rounded-[10px]" />
            <span className="font-display text-2xl font-medium text-[#111827]">Society<span className="text-[#233B6E]">Flats</span></span>
          </div>
          <p className="mt-10 text-[11px] font-black uppercase tracking-[0.22em] text-[#8C6E2F]">Decision Report</p>
          <h1 className="mt-2 font-display text-[46px] font-medium leading-[1.05] text-[#111827]">{society.name}</h1>
          <p className="mt-2 text-lg text-[#667085]">{[f(society, "sector", "sector"), f(society, "locality", "locality"), f(society, "city", "city", "Gurgaon")].filter(Boolean).join(" · ")}{f(society, "builder", "builder") ? ` · by ${f(society, "builder", "builder")}` : ""}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <div className="rounded-[16px] bg-[#233B6E] px-6 py-5 text-white">
              <p className="text-xs text-[#CFD8EC]">Society intelligence score</p>
              <p className="mt-1 text-5xl font-black">{intel?.overall_score || f(society, "score", "score", "—")}</p>
              <p className="mt-1 text-xs text-[#CFD8EC]">{intel?.overall_score_label || "Verified society score"}</p>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3">
              {[["Data confidence", `${intel?.data_confidence_score || f(society, "sourceConfidenceScore", "source_confidence_score", "0")}%`], ["Evidence coverage", `${intel?.evidence_coverage_score || 0}%`], ["RERA", reraNumber ? "Registered" : "Confirm"], ["Possession", projectStatus]].map(([k, v]) => (
                <div key={k} className="rounded-[14px] border border-[#E7E3DA] bg-[#F8F3EA] px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A8F89]">{k}</p>
                  <p className="mt-0.5 text-sm font-black text-[#25302B]">{v}</p>
                </div>
              ))}
            </div>
          </div>
          {intel?.editorial_summary ? <p className="mt-8 border-l-4 border-[#C5A766] pl-4 text-[15px] leading-7 text-[#35413B]">{intel.editorial_summary}</p> : null}
          <p className="mt-10 text-xs text-[#8A8F89]">Prepared {today} · societyflats.com · +91 99118 86222</p>
        </div>

        {/* Score breakdown */}
        {signals.length ? (
          <div className="report-page mt-12">
            <h2 className="font-display text-2xl font-medium text-[#111827]">Why this score</h2>
            <p className="mt-1 text-sm text-[#667085]">Every weighted signal behind the number. Green = verified, amber = estimated, blank = not yet verified (excluded from the score).</p>
            <div className="mt-5 divide-y divide-[#EEE6DA] rounded-[16px] border border-[#EEE6DA]">
              {signals.map((s: any) => {
                const missing = s.status === "missing" || s.score == null;
                return (
                  <div key={s.key} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-10 shrink-0 text-right text-sm font-black text-[#233B6E]">{missing ? "—" : Number(s.score).toFixed(1)}</div>
                    <div className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-[#E7E3DA]"><div className="h-full rounded-full" style={{ width: missing ? "0%" : `${Number(s.score) * 10}%`, background: s.status === "verified" ? "#2A6147" : "#C8A24B" }} /></div>
                    <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#25302B]">{s.label} <span className="text-[11px] font-bold text-[#8A8F89]">· {s.weight}%</span></p><p className="text-[12px] text-[#8A8F89]">{missing ? "Not yet verified" : s.status === "verified" ? "Verified" : "Estimated"}{s.source ? ` · ${s.source}` : ""}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Buyer's Truth */}
        <div className="report-page mt-12">
          <h2 className="font-display text-2xl font-medium text-[#111827]">Buyer's Truth — verify before you pay</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[["RERA", reraNumber ? "Registered" : "Not on record", reraNumber || "Ask before you pay"], ["Project status", projectStatus, ""], ["Possession", possession !== "—" ? possession : "Confirm timeline", ""]].map(([k, v, note]) => (
              <div key={k} className="rounded-[14px] border border-[#E7E3DA] bg-[#F8F3EA] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#8A8F89]">{k}</p><p className="mt-1 text-sm font-black text-[#25302B]">{v}</p>{note ? <p className="mt-0.5 break-words text-[11px] text-[#667085]">{note}</p> : null}</div>
            ))}
          </div>
          <ul className="mt-5 space-y-2 text-[13.5px] leading-6 text-[#35413B]">
            {["Cross-check the RERA registration on the HARERA portal before payment.", "Confirm a clear, marketable title and chain of ownership with your lawyer.", "For under-construction homes, confirm the current RERA-registered possession timeline and grace period.", "Check for outstanding maintenance, property tax or loan encumbrance on the specific unit."].map((t) => (
              <li key={t} className="flex gap-2"><span className="font-black text-[#C8792F]">!</span>{t}</li>
            ))}
          </ul>
        </div>

        {/* Strengths & watch-outs */}
        {(Array.isArray(intel?.top_strengths_json) && intel.top_strengths_json.length) || (Array.isArray(intel?.things_to_verify_json) && intel.things_to_verify_json.length) ? (
          <div className="report-page mt-12 grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-display text-xl font-medium text-[#123C32]">Top strengths</h3>
              <div className="mt-3 space-y-2">{(intel?.top_strengths_json || []).map((s: any) => <div key={s.label} className="rounded-[12px] border border-[#D7E7D8] bg-[#F8FBF8] p-3 text-sm"><p className="font-bold text-[#25302B]">{s.label}</p>{s.detail ? <p className="mt-0.5 text-[12.5px] text-[#667085]">{s.detail}</p> : null}</div>)}</div>
            </div>
            <div>
              <h3 className="font-display text-xl font-medium text-[#9A552E]">Watch-outs</h3>
              <div className="mt-3 space-y-2">{(intel?.things_to_verify_json || []).map((s: any) => <div key={s.label} className="rounded-[12px] border border-[#EBCFAE] bg-[#FFFDF8] p-3 text-sm"><p className="font-bold text-[#25302B]">{s.label}</p></div>)}</div>
            </div>
          </div>
        ) : null}

        {/* Sources + disclaimer */}
        <div className="report-page mt-12">
          {Array.isArray(intel?.sources) && intel.sources.length ? (
            <>
              <h3 className="font-display text-xl font-medium text-[#111827]">Sources reviewed</h3>
              <div className="mt-3 space-y-1.5 text-[12.5px] text-[#667085]">{intel.sources.map((s: any, i: number) => <p key={i}>• {s.source_name || s.source_type} {s.verification_status ? `(${s.verification_status})` : ""}{s.public_note ? ` — ${s.public_note}` : ""}</p>)}</div>
            </>
          ) : null}
          <div className="mt-8 rounded-[14px] border border-[#E7E3DA] bg-[#F8F3EA] p-5 text-[12px] leading-6 text-[#667085]">
            <p className="font-bold text-[#35413B]">How to read this report</p>
            <p className="mt-1">This is a decision aid built from admin-reviewed society data, public records and market context. It does not invent prices, guarantees, rankings, possession status or investment returns. Verify unit-level price, exact tower, availability, legal title and RERA status independently before any payment. Prepared by SocietyFlats — societyflats.com · +91 99118 86222.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SocietyReportPage;
