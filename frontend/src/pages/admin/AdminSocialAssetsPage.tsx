import { useEffect, useState } from "react";
import { CheckCircle2, Pencil, XCircle } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminSocialNav } from "./AdminSocialNav";
import { approveSocialAsset, fetchSocialAssets, rejectSocialAsset, updateSocialAsset, type SocialAsset } from "@/lib/socialApi";

function chip(value: string) {
  if (value === "approved") return "bg-emerald-50 text-emerald-700";
  if (value === "rejected" || value === "high") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

export function AdminSocialAssetsPage() {
  const [assets, setAssets] = useState<SocialAsset[]>([]);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<SocialAsset | null>(null);
  const [prompt, setPrompt] = useState("");

  const load = async () => setAssets(await fetchSocialAssets("per_page=100"));
  useEffect(() => { void load(); }, []);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setMessage(success);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function savePrompt() {
    if (!editing) return;
    await run(() => updateSocialAsset(editing.id, { image_prompt: prompt }), "Asset prompt updated.");
    setEditing(null);
  }

  return (
    <AdminLayout title="Creative Assets" subtitle="Review generated images and creative briefs before any future social use.">
      <AdminSocialNav />
      {message ? <p className="mb-5 rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p> : null}

      {editing ? (
        <section className="mb-6 rounded-[1.5rem] border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Edit image prompt / creative brief</h2>
          <textarea className="mt-3 min-h-40 w-full rounded-2xl border p-3 text-sm" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <div className="mt-3 flex gap-2">
            <Button className="rounded-full bg-blue-700" onClick={() => void savePrompt()}>Save prompt</Button>
            <Button variant="outline" className="rounded-full" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {assets.map((asset) => (
          <article key={asset.id} className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize">{asset.asset_type.replace("_", " ")}</span>
                {asset.platform ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize">{asset.platform.replace("_", " ")}</span> : null}
                <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${chip(asset.status)}`}>{asset.status.replace("_", " ")}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${chip(asset.risk_level)}`}>{asset.risk_level} risk</span>
              </div>
              <span className="text-xs font-bold text-slate-400">{asset.created_at ? new Date(asset.created_at).toLocaleString("en-IN") : ""}</span>
            </div>
            {asset.public_url ? (
              <img src={asset.public_url} alt="AI social creative draft" className="mt-4 aspect-video w-full rounded-2xl object-cover" />
            ) : (
              <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">Creative brief only — no image file generated yet.</div>
            )}
            {asset.post ? <p className="mt-3 text-xs font-black text-blue-700">Linked draft: {asset.post.title || asset.post.hook || `#${asset.post.id}`}</p> : null}
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{asset.image_prompt || "No prompt saved."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" className="rounded-full bg-emerald-600" onClick={() => void run(() => approveSocialAsset(asset.id), "Asset approved.")}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button>
              <Button size="sm" variant="outline" className="rounded-full bg-white text-rose-700" onClick={() => void run(() => rejectSocialAsset(asset.id), "Asset rejected.")}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
              <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={() => { setEditing(asset); setPrompt(asset.image_prompt || ""); }}><Pencil className="mr-2 h-4 w-4" />Edit prompt</Button>
            </div>
          </article>
        ))}
      </div>
      {!assets.length ? <div className="rounded-[1.5rem] border bg-white p-8 text-center font-black text-slate-500">No creative assets yet. Generate social drafts with images or creative prompts first.</div> : null}
    </AdminLayout>
  );
}
