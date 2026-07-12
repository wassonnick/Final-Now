import { useEffect, useState } from "react";
import { CheckCircle2, Copy, ImagePlus, Pencil, RefreshCw, Send, XCircle } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { AdminSocialNav } from "./AdminSocialNav";
import { approveSocialPost, fetchSocialPosts, generateSocialPostImage, publishSocialPost, rejectSocialPost, updateSocialPost, type SocialPost } from "@/lib/socialApi";

function tone(value: string) {
  if (value === "high" || value === "rejected") return "bg-rose-50 text-rose-700";
  if (value === "approved" || value === "low") return "bg-emerald-50 text-emerald-700";
  return "bg-amber-50 text-amber-700";
}

export function AdminSocialDraftsPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [editing, setEditing] = useState<SocialPost | null>(null);
  const [caption, setCaption] = useState("");

  const load = async () => setPosts(await fetchSocialPosts("per_page=100"));
  useEffect(() => { void load(); }, []);

  function notify(text: string, tone: "success" | "error") {
    setMessage(text);
    setMessageTone(tone);
    // The banner is sticky, but jump to it so the result of a click far down the list is never missed.
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      notify(success, "success");
      await load();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Action failed.", "error");
    }
  }

  async function saveEdit() {
    if (!editing) return;
    await run(() => updateSocialPost(editing.id, { caption }), "Draft updated.");
    setEditing(null);
  }

  async function manualPublish(post: SocialPost) {
    const label = post.platform === "whatsapp" ? "prepare WhatsApp manual export" : "publish this approved post manually";
    if (!window.confirm(`Final confirmation: ${label}? This will never publish unapproved drafts.`)) return;
    const confirmHighRisk = post.risk_level === "high"
      ? window.confirm("This post is marked HIGH RISK. Explicitly approve high-risk manual publishing?")
      : false;
    if (post.risk_level === "high" && !confirmHighRisk) return;

    await run(async () => {
      const body = await publishSocialPost(post.id, { confirm_publish: true, confirm_high_risk: confirmHighRisk });
      const copy = body?.data?.copy as string | undefined;
      if (copy && navigator.clipboard) await navigator.clipboard.writeText(copy);
    }, post.platform === "whatsapp" ? "WhatsApp copy/export prepared." : "Post manually published.");
  }

  return (
    <AdminLayout title="AI Social Media" subtitle="Review AI-generated social drafts. SM1A never auto-posts.">
      <AdminSocialNav />
      {message ? (
        <div className={`sticky top-3 z-30 mb-5 flex items-start justify-between gap-3 rounded-2xl border p-4 text-sm font-bold shadow-sm ${messageTone === "error" ? "border-rose-300 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          <span>{messageTone === "error" ? "⚠ " : "✓ "}{message}</span>
          <button type="button" className="shrink-0 text-xs font-black opacity-70 hover:opacity-100" onClick={() => setMessage("")}>Dismiss</button>
        </div>
      ) : null}

      {editing ? (
        <section className="mb-6 rounded-[1.5rem] border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Edit draft caption</h2>
          <textarea className="mt-3 min-h-40 w-full rounded-2xl border p-3 text-sm" value={caption} onChange={(event) => setCaption(event.target.value)} />
          <div className="mt-3 flex gap-2">
            <Button className="rounded-full bg-blue-700" onClick={() => void saveEdit()}>Save edit</Button>
            <Button variant="outline" className="rounded-full" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {posts.map((post) => (
          <article key={post.id} className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize">{post.platform.replace("_", " ")}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tone(post.risk_level)}`}>{post.risk_level} risk</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tone(post.status)}`}>{post.status.replace("_", " ")}</span>
                  {post.publish_status ? <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${tone(post.publish_status)}`}>{post.publish_status.replace("_", " ")}</span> : null}
                </div>
                <h2 className="mt-3 text-xl font-black">{post.title || post.hook || "Untitled draft"}</h2>
                {post.hook ? <p className="mt-1 text-sm font-bold text-slate-500">{post.hook}</p> : null}
              </div>
              <span className="text-xs font-bold text-slate-400">{post.created_at ? new Date(post.created_at).toLocaleString("en-IN") : ""}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{post.caption}</p>
            {post.cta ? <p className="mt-3 text-sm font-black text-blue-700">CTA: {post.cta}</p> : null}
            {post.hashtags?.length ? <p className="mt-2 text-xs font-bold text-slate-500">{post.hashtags.join(" ")}</p> : null}
            {post.creative_prompt || post.image_prompt ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                {post.creative_prompt ? <p><strong>Creative:</strong> {post.creative_prompt}</p> : null}
                {post.image_prompt ? <p className="mt-1"><strong>Image:</strong> {post.image_prompt}</p> : null}
              </div>
            ) : null}
            {post.assets?.length ? <p className="mt-3 text-xs font-bold text-slate-500">{post.assets.length} attached asset(s)</p> : null}
            {post.publish_error ? <p className="mt-3 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-700">{post.publish_error}</p> : null}
            {post.external_post_id ? <p className="mt-3 text-xs font-bold text-emerald-700">External post ID: {post.external_post_id}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {post.status !== "published" ? <Button size="sm" className="rounded-full bg-emerald-600" onClick={() => void run(() => approveSocialPost(post.id), "Draft approved.")}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button> : null}
              <Button size="sm" variant="outline" className="rounded-full bg-white text-rose-700" onClick={() => void run(() => rejectSocialPost(post.id), "Draft rejected.")}><XCircle className="mr-2 h-4 w-4" />Reject</Button>
              <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={() => { setEditing(post); setCaption(post.caption); }}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
              <Button size="sm" variant="outline" className="rounded-full bg-white" onClick={() => void run(() => generateSocialPostImage(post.id), "Asset generated for review.")}><ImagePlus className="mr-2 h-4 w-4" />Generate image</Button>
              {post.status === "approved" ? (
                <Button size="sm" className="rounded-full bg-slate-950" onClick={() => void manualPublish(post)}>
                  {post.platform === "whatsapp" ? <Copy className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                  {post.platform === "whatsapp" ? "Export WhatsApp" : "Publish manually"}
                </Button>
              ) : null}
              <Button size="sm" variant="outline" disabled className="rounded-full bg-white"><RefreshCw className="mr-2 h-4 w-4" />Regenerate in SM2</Button>
            </div>
          </article>
        ))}
      </div>
      {!posts.length ? <div className="rounded-[1.5rem] border bg-white p-8 text-center font-black text-slate-500">No AI social drafts yet. Generate the first batch from the Generate Social Posts page.</div> : null}
    </AdminLayout>
  );
}
