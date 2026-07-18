import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RefreshCw, Rocket, Save, ShieldCheck, XCircle } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backendApi } from "@/services/backendApi";

const scoreFields = [
  ["liveability_score", "Liveability"],
  ["connectivity_score", "Connectivity"],
  ["construction_quality_score", "Construction quality"],
  ["maintenance_score", "Maintenance"],
  ["builder_reliability_score", "Builder reliability"],
  ["price_value_score", "Price value"],
  ["rental_demand_score", "Rental demand"],
  ["resale_liquidity_score", "Resale liquidity"],
  ["safety_security_score", "Safety & security"],
  ["family_suitability_score", "Family suitability"],
  ["legal_rera_confidence_score", "Legal/RERA confidence"],
  ["environmental_resilience_score", "Environmental resilience"],
] as const;

function safeJson(value: unknown, fallback: unknown) {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function AdminSocietyIntelligencePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [jsonText, setJsonText] = useState({
    best_for_json: "[]",
    not_ideal_for_json: "[]",
    top_strengths_json: "[]",
    things_to_verify_json: "[]",
  });

  const load = () => {
    if (!id) return;
    setLoading(true);
    backendApi
      .request(`/admin/societies/${id}/intelligence`)
      .then((payload) => {
        const data = payload.data || {};
        setProfile(data);
        setJsonText({
          best_for_json: JSON.stringify(data.best_for_json || [], null, 2),
          not_ideal_for_json: JSON.stringify(data.not_ideal_for_json || [], null, 2),
          top_strengths_json: JSON.stringify(data.top_strengths_json || [], null, 2),
          things_to_verify_json: JSON.stringify(data.things_to_verify_json || [], null, 2),
        });
        setMessage("");
      })
      .catch((error) => setMessage(error?.message || "Unable to load intelligence profile."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const action = async (label: string, path: string) => {
    if (!id) return;
    setBusy(label);
    setMessage("");
    try {
      const payload = await backendApi.request(path, { method: "POST" });
      setProfile(payload.data);
      setMessage(`${label} completed.`);
      load();
    } catch (error: any) {
      setMessage(error?.message || `${label} failed.`);
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (!id || !profile) return;
    setBusy("Save draft");
    setMessage("");
    try {
      const payload: any = {
        ...profile,
        best_for_json: safeJson(jsonText.best_for_json, []),
        not_ideal_for_json: safeJson(jsonText.not_ideal_for_json, []),
        top_strengths_json: safeJson(jsonText.top_strengths_json, []),
        things_to_verify_json: safeJson(jsonText.things_to_verify_json, []),
        intelligence_status: profile.intelligence_status === "published" ? "needs_review" : profile.intelligence_status || "draft",
      };
      delete payload.id;
      delete payload.society_id;
      delete payload.sources;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.published_at;

      const response = await backendApi.request(`/admin/societies/${id}/intelligence`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setProfile(response.data);
      setMessage("Draft saved. Published intelligence is never updated until approved and published again.");
    } catch (error: any) {
      setMessage(error?.message || "Unable to save intelligence draft.");
    } finally {
      setBusy("");
    }
  };

  return (
    <AdminLayout title="Decision Intelligence" subtitle="Evidence-based society decision profile. Public only after explicit intelligence publish.">
      <div className="mb-4 flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-full">
          <Link to={id ? `/admin/societies/${id}/edit` : "/admin/societies"}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to society editor
          </Link>
        </Button>
        <Button onClick={() => action("Recalculate", `/admin/societies/${id}/intelligence/recalculate`)} disabled={Boolean(busy)} variant="outline" className="rounded-full">
          <RefreshCw className="mr-2 h-4 w-4" /> Recalculate
        </Button>
        <Button onClick={save} disabled={Boolean(busy)} className="rounded-full bg-blue-700 text-white">
          <Save className="mr-2 h-4 w-4" /> Save draft
        </Button>
        <Button onClick={() => action("Approve", `/admin/societies/${id}/intelligence/approve`)} disabled={Boolean(busy)} className="rounded-full bg-emerald-600 text-white">
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
        </Button>
        <Button onClick={() => action("Publish", `/admin/societies/${id}/intelligence/publish`)} disabled={Boolean(busy)} className="rounded-full bg-slate-950 text-white">
          <Rocket className="mr-2 h-4 w-4" /> Publish intelligence
        </Button>
        <Button onClick={() => action("Unpublish", `/admin/societies/${id}/intelligence/unpublish`)} disabled={Boolean(busy)} variant="outline" className="rounded-full border-red-200 text-red-600">
          <XCircle className="mr-2 h-4 w-4" /> Unpublish
        </Button>
      </div>

      {message ? <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-700">{message}</div> : null}

      {loading || !profile ? (
        <div className="rounded-3xl border bg-white p-8 text-slate-500">Loading intelligence editor…</div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_330px]">
          <section className="space-y-5">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                  <p className="mt-1 text-xl font-black capitalize">{profile.intelligence_status || "draft"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Overall score</p>
                  <p className="mt-1 text-xl font-black">{profile.overall_score || "Insufficient"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Coverage</p>
                  <p className="mt-1 text-xl font-black">{profile.evidence_coverage_score || 0}%</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Confidence</p>
                  <p className="mt-1 text-xl font-black">{profile.data_confidence_score || 0}%</p>
                </div>
              </div>
              <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                Minimum public score coverage is 60%. Missing data is not treated as a negative score.
              </p>
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Overview</h2>
              <label className="mt-4 block text-sm font-bold text-slate-600">Editorial summary</label>
              <textarea className="mt-2 min-h-28 w-full rounded-2xl border p-3" value={profile.editorial_summary || ""} onChange={(e) => setProfile({ ...profile, editorial_summary: e.target.value })} />
              <label className="mt-4 block text-sm font-bold text-slate-600">Score explanation</label>
              <textarea className="mt-2 min-h-24 w-full rounded-2xl border p-3" value={profile.score_explanation || ""} onChange={(e) => setProfile({ ...profile, score_explanation: e.target.value })} />
            </div>

            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Scores</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {scoreFields.map(([field, label]) => (
                  <label key={field} className="block rounded-2xl border p-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</span>
                    <Input type="number" min={0} max={10} step={0.1} value={profile[field] ?? ""} onChange={(e) => setProfile({ ...profile, [field]: e.target.value })} className="mt-2" />
                  </label>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Manual overall override</span>
                  <Input type="number" min={0} max={10} step={0.1} value={profile.score_override ?? ""} onChange={(e) => setProfile({ ...profile, score_override: e.target.value })} className="mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">Override reason</span>
                  <Input value={profile.score_override_reason || ""} onChange={(e) => setProfile({ ...profile, score_override_reason: e.target.value })} className="mt-2" />
                </label>
              </div>
            </div>

            {[
              ["best_for_json", "Best for"],
              ["not_ideal_for_json", "Not ideal for"],
              ["top_strengths_json", "Strengths"],
              ["things_to_verify_json", "Risks and things to verify"],
            ].map(([field, label]) => (
              <div key={field} className="rounded-3xl border bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">{label}</h2>
                <p className="mt-1 text-sm text-slate-500">Use structured JSON. Public strengths/verification items should include status: "published". Risk items also require public: true.</p>
                <textarea className="mt-4 min-h-48 w-full rounded-2xl border p-3 font-mono text-xs" value={(jsonText as any)[field]} onChange={(e) => setJsonText({ ...jsonText, [field]: e.target.value })} />
              </div>
            ))}
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <h2 className="mt-3 text-lg font-black">Publishing protection</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">A published society does not automatically publish intelligence. Save → approve → publish intelligence separately.</p>
            </div>
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Sources</h2>
              <p className="mt-2 text-sm text-slate-500">{profile.sources?.length || 0} source records attached.</p>
              <p className="mt-3 text-xs leading-5 text-slate-400">Source editing API is in place for reusable verified facts. Full visual source table can be expanded in the next admin polish pass.</p>
            </div>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link to="/admin/intelligence-corrections">Review corrections</Link>
            </Button>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminSocietyIntelligencePage;
