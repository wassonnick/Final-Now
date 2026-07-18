import { useEffect, useState } from "react";
import { ExternalLink, Megaphone, Plus } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { backendApi } from "@/services/backendApi";

type CampaignRow = { id: number; slug: string; status: string; payload: any };

// "Title | text" per line → [{title, text}]
const parsePairs = (value: string, keys: [string, string]) =>
  value
    .split("\n")
    .map((line) => line.split("|"))
    .filter((parts) => parts.length >= 2 && parts[0].trim() && parts.slice(1).join("|").trim())
    .map((parts) => ({ [keys[0]]: parts[0].trim(), [keys[1]]: parts.slice(1).join("|").trim() }));

const joinPairs = (items: any[] | undefined, keys: [string, string]) =>
  (items || []).map((item) => `${item?.[keys[0]] || ""} | ${item?.[keys[1]] || ""}`).join("\n");

const emptyForm = {
  slug: "",
  badge: "For Gurgaon owners · Free listing",
  titlePlain: "",
  titleGold: "",
  subtitle: "",
  bullets: "",
  steps: "",
  faq: "",
  ctaLabel: "Get started — free",
  ctaHref: "/sell",
  whatsappText: "Hi SocietyFlats, ",
  seoTitle: "",
  seoDescription: "",
};

export function AdminCampaignsPage() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = () =>
    backendApi
      .request("/admin/campaigns")
      .then((payload) => setRows(Array.isArray(payload?.data) ? payload.data : []))
      .catch((error) => setMessage(error?.message || "Unable to load campaigns."));

  useEffect(() => {
    void load();
  }, []);

  const set = (key: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const buildPayload = () => ({
    badge: form.badge,
    titlePlain: form.titlePlain,
    titleGold: form.titleGold,
    subtitle: form.subtitle,
    bullets: parsePairs(form.bullets, ["title", "text"]),
    steps: parsePairs(form.steps, ["title", "text"]),
    faq: parsePairs(form.faq, ["question", "answer"]),
    primaryCta: { label: form.ctaLabel, href: form.ctaHref },
    whatsappText: form.whatsappText,
    leadSource: `campaign_${form.slug.replace(/-/g, "_")}`,
    seo: { title: form.seoTitle || `${form.titlePlain} ${form.titleGold} | SocietyFlats`, description: form.seoDescription || form.subtitle.slice(0, 300) },
  });

  const save = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (editingId) {
        await backendApi.request(`/admin/campaigns/${editingId}`, { method: "PATCH", body: JSON.stringify({ payload: buildPayload() }) });
        setMessage("Campaign updated.");
      } else {
        await backendApi.request("/admin/campaigns", { method: "POST", body: JSON.stringify({ slug: form.slug, payload: buildPayload() }) });
        setMessage(`Created. Publish it, then share societyflats.com/go/${form.slug}.`);
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Save failed — check the required fields.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: CampaignRow) => {
    setBusy(true);
    try {
      await backendApi.request(`/admin/campaigns/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: row.status === "published" ? "draft" : "published" }),
      });
      await load();
    } catch (error: any) {
      setMessage(error?.message || "Status change failed.");
    } finally {
      setBusy(false);
    }
  };

  const edit = (row: CampaignRow) => {
    const p = row.payload || {};
    setEditingId(row.id);
    setForm({
      slug: row.slug,
      badge: p.badge || "",
      titlePlain: p.titlePlain || "",
      titleGold: p.titleGold || "",
      subtitle: p.subtitle || "",
      bullets: joinPairs(p.bullets, ["title", "text"]),
      steps: joinPairs(p.steps, ["title", "text"]),
      faq: joinPairs(p.faq, ["question", "answer"]),
      ctaLabel: p.primaryCta?.label || "",
      ctaHref: p.primaryCta?.href || "/sell",
      whatsappText: p.whatsappText || "",
      seoTitle: p.seo?.title || "",
      seoDescription: p.seo?.description || "",
    });
    window.scrollTo(0, 0);
  };

  const textareaClass = "w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm";

  return (
    <AdminLayout
      title="Campaigns"
      subtitle="Author a landing page from this form — publish, and it's live at societyflats.com/go/<slug> instantly. Pair it with creatives from Brand Studio."
    >
      <div className="space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black text-slate-950">{editingId ? `Editing: ${form.slug}` : "New campaign page"}</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={form.slug} onChange={set("slug")} placeholder="slug e.g. nri-owners" disabled={Boolean(editingId)} className="rounded-full" />
            <Input value={form.badge} onChange={set("badge")} placeholder="Badge line" className="rounded-full" />
            <Input value={form.titlePlain} onChange={set("titlePlain")} placeholder="Headline (plain part)" className="rounded-full" />
            <Input value={form.titleGold} onChange={set("titleGold")} placeholder="Headline (gold italic part)" className="rounded-full" />
          </div>
          <textarea value={form.subtitle} onChange={set("subtitle")} placeholder="Subtitle — 2-3 sentences" rows={2} className={`mt-3 ${textareaClass}`} />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-bold text-slate-500">Benefit cards — one per line: Title | text</p>
              <textarea value={form.bullets} onChange={set("bullets")} rows={4} className={textareaClass} placeholder={"Verified enquiries only | Every request checked by a real person.\nFree listing | No fee, five minutes."} />
            </div>
            <div>
              <p className="mb-1 text-xs font-bold text-slate-500">Steps — one per line: Title | text</p>
              <textarea value={form.steps} onChange={set("steps")} rows={4} className={textareaClass} placeholder={"Tell us about your flat | Five minutes from your phone.\nWe verify it | Checked against the society record."} />
            </div>
          </div>
          <p className="mb-1 mt-3 text-xs font-bold text-slate-500">FAQ — one per line: Question | answer</p>
          <textarea value={form.faq} onChange={set("faq")} rows={3} className={textareaClass} />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input value={form.ctaLabel} onChange={set("ctaLabel")} placeholder="Primary CTA label" className="rounded-full" />
            <Input value={form.ctaHref} onChange={set("ctaHref")} placeholder="CTA link e.g. /sell" className="rounded-full" />
            <Input value={form.whatsappText} onChange={set("whatsappText")} placeholder="Prefilled WhatsApp message" className="rounded-full" />
            <Input value={form.seoTitle} onChange={set("seoTitle")} placeholder="SEO title (optional)" className="rounded-full" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={() => void save()} disabled={busy || !form.slug || !form.titlePlain} className="rounded-full bg-blue-700 text-white hover:bg-blue-800">
              <Plus className="mr-2 h-4 w-4" /> {editingId ? "Save changes" : "Create draft"}
            </Button>
            {editingId ? (
              <Button variant="outline" className="rounded-full" onClick={() => { setEditingId(null); setForm({ ...emptyForm }); }}>
                Cancel edit
              </Button>
            ) : null}
            {message ? <p className="text-sm font-semibold text-slate-600">{message}</p> : null}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-black text-slate-950">Your campaigns</h2>
          <div className="grid gap-3">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                  <p className="font-bold text-slate-900">{row.payload?.titlePlain} <span className="italic text-amber-700">{row.payload?.titleGold}</span></p>
                  <p className="text-sm text-slate-500">/go/{row.slug} · <span className={row.status === "published" ? "font-bold text-emerald-700" : "font-bold text-slate-500"}>{row.status}</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="rounded-full">
                    <a href={`/go/${row.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Preview</a>
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => edit(row)}>Edit</Button>
                  <Button size="sm" disabled={busy} onClick={() => void toggle(row)} className={`rounded-full ${row.status === "published" ? "bg-slate-600" : "bg-emerald-700"} text-white`}>
                    {row.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </div>
            ))}
            {!rows.length ? <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No admin-authored campaigns yet. The built-in ones (/list-your-flat, /sell-your-flat) ship with the app.</p> : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminCampaignsPage;
