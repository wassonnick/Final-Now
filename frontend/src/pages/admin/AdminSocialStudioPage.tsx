// Social Studio — pick a post, tweak the words, download the PNG, copy the caption.
// The preview canvas and the downloaded file run through the same painter, so what
// you see is exactly what posts.
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, Copy, Download, Package, RefreshCw, Shuffle } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { AdminSocialNav } from "@/pages/admin/AdminSocialNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BRAND_PHONE_DISPLAY } from "@/config/contact";
import {
  FORMATS,
  LAYOUTS,
  SCENES,
  drawPost,
  isDarkScene,
  renderPostBlob,
  type FormatKey,
  type PostSpec,
  type LayoutKey,
  type SceneKey,
} from "@/lib/socialPostArt";
import {
  POST_IDEAS,
  THEMES,
  ideaForDate,
  type PostIdea,
  type PostTheme,
} from "@/lib/socialContentCalendar";

const SITE = "societyflats.com";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export function AdminSocialStudioPage() {
  const todays = useMemo(() => ideaForDate(), []);
  const [idea, setIdea] = useState<PostIdea>(todays);
  const [format, setFormat] = useState<FormatKey>("post");
  const [scene, setScene] = useState<SceneKey>(todays.scene);
  const [kicker, setKicker] = useState(todays.kicker);
  const [line1, setLine1] = useState(todays.line1);
  const [line2, setLine2] = useState(todays.line2);
  const [cta, setCta] = useState(todays.cta);
  const [layout, setLayout] = useState<LayoutKey>("standard");
  const [stat, setStat] = useState("246");
  const [statNote, setStatNote] = useState("verified societies");
  const [themeFilter, setThemeFilter] = useState<PostTheme | "all">("all");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const spec: PostSpec = useMemo(
    () => ({ format, layout, stat, statNote, scene, kicker, line1, line2, cta, site: SITE, phone: BRAND_PHONE_DISPLAY }),
    [format, layout, stat, statNote, scene, kicker, line1, line2, cta],
  );

  // Repaint the preview whenever anything changes (and once fonts have loaded,
  // otherwise the first paint uses a fallback face).
  useEffect(() => {
    let cancelled = false;
    const paint = () => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const { w, h } = FORMATS[format];
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      try {
        drawPost(ctx, spec);
        setError("");
      } catch {
        setError("Could not draw the preview in this browser.");
      }
    };
    paint();
    void document.fonts?.ready.then(paint);
    return () => { cancelled = true; };
  }, [spec, format]);

  const applyIdea = (next: PostIdea) => {
    setIdea(next);
    setScene(next.scene);
    setKicker(next.kicker);
    setLine1(next.line1);
    setLine2(next.line2);
    setCta(next.cta);
  };

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const blob = await renderPostBlob(spec);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `societyflats-${format}-${slug(line1) || idea.id}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the image.");
    } finally {
      setBusy(false);
    }
  };

  // Render one asset per format/scene and save them in sequence. Browsers throttle
  // rapid downloads, so this paces itself rather than firing them all at once.
  const downloadKit = async () => {
    setBusy(true);
    setError("");
    try {
      const jobs: { name: string; spec: PostSpec }[] = [];
      for (const f of Object.keys(FORMATS) as FormatKey[]) {
        jobs.push({ name: `${f}-${slug(line1) || idea.id}`, spec: { ...spec, format: f } });
      }
      for (const sc of SCENES) {
        jobs.push({ name: `post-${sc.key}`, spec: { ...spec, format: "post", scene: sc.key } });
      }
      for (const job of jobs) {
        const blob = await renderPostBlob(job.spec);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `societyflats-${job.name}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        await new Promise((r) => window.setTimeout(r, 350));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the pack.");
    } finally {
      setBusy(false);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(idea.caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Clipboard is blocked — select the caption and copy it manually.");
    }
  };

  const visible = themeFilter === "all" ? POST_IDEAS : POST_IDEAS.filter((p) => p.theme === themeFilter);
  const dark = isDarkScene(scene);

  return (
    <AdminLayout
      title="Social Studio"
      subtitle="Pick a post, adjust the words, download the image and copy the caption. Nothing is published from here."
    >
      <AdminSocialNav />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ————— preview + controls ————— */}
        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                {(Object.keys(FORMATS) as FormatKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormat(key)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      format === key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {FORMATS[key].label}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-500">{FORMATS[format].note}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {LAYOUTS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setLayout(l.key)}
                  title={l.hint}
                  className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
                    layout === l.key ? "bg-emerald-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-center rounded-2xl bg-slate-100 p-5">
              <canvas
                ref={canvasRef}
                aria-label="Post preview"
                className="max-h-[520px] w-auto max-w-full rounded-xl shadow-md"
                style={{ imageRendering: "auto" }}
              />
            </div>

            {error ? (
              <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={download} disabled={busy} className="rounded-full bg-emerald-700 font-bold hover:bg-emerald-800">
                <Download className="mr-2 h-4 w-4" />
                {busy ? "Rendering…" : `Download ${FORMATS[format].label}`}
              </Button>
              <Button onClick={copyCaption} variant="outline" className="rounded-full font-bold">
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Caption copied" : "Copy caption"}
              </Button>
              <Button onClick={downloadKit} disabled={busy} variant="outline" className="rounded-full font-bold">
                <Package className="mr-2 h-4 w-4" /> Download pack
              </Button>
              <Button
                onClick={() => applyIdea(POST_IDEAS[Math.floor(Math.random() * POST_IDEAS.length)])}
                variant="outline"
                className="rounded-full font-bold"
              >
                <Shuffle className="mr-2 h-4 w-4" /> Surprise me
              </Button>
              <Button onClick={() => applyIdea(idea)} variant="ghost" className="rounded-full font-bold text-slate-600">
                <RefreshCw className="mr-2 h-4 w-4" /> Reset words
              </Button>
            </div>
          </div>

          {/* words + artwork */}
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">The words</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-xs font-bold text-slate-600">
                  Kicker
                  <Input value={kicker} onChange={(e) => setKicker(e.target.value)} className="mt-1.5" maxLength={34} />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  Headline — line 1
                  <Input value={line1} onChange={(e) => setLine1(e.target.value)} className="mt-1.5" maxLength={30} />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  Headline — line 2
                  <Input value={line2} onChange={(e) => setLine2(e.target.value)} className="mt-1.5" maxLength={30} />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  Button
                  <Input value={cta} onChange={(e) => setCta(e.target.value)} className="mt-1.5" maxLength={26} />
                </label>
                {layout === "bigStat" ? (
                  <div className="grid grid-cols-[110px_1fr] gap-2">
                    <label className="block text-xs font-bold text-slate-600">
                      Number
                      <Input value={stat} onChange={(e) => setStat(e.target.value)} className="mt-1.5" maxLength={7} />
                    </label>
                    <label className="block text-xs font-bold text-slate-600">
                      Under it
                      <Input value={statNote} onChange={(e) => setStatNote(e.target.value)} className="mt-1.5" maxLength={30} />
                    </label>
                  </div>
                ) : null}
                <p className="text-[11px] leading-5 text-slate-500">
                  Keep each headline line short — long lines run past the edge. Specific beats clever:
                  a checkable fact outperforms a slogan.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">The artwork</h2>
              <div className="mt-4 grid gap-2">
                {SCENES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setScene(s.key)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-bold transition ${
                      scene === s.key
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {s.label}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${s.dark ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
                      {s.dark ? "DARK" : "LIGHT"}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                Illustration, not photography — our promise is “no fake listings”, and a stock photo of
                someone else’s flat quietly breaks it. {dark ? "Dark artwork sets a charcoal background." : "Light artwork sets a white background."}
              </p>
            </div>
          </div>
        </section>

        {/* ————— the month of ideas ————— */}
        <aside className="space-y-4">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-800">
              <CalendarDays className="h-4 w-4" /> Today’s pick
            </p>
            <p className="mt-2 text-lg font-black leading-snug text-slate-900">
              {todays.line1} {todays.line2}
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-800">{THEMES[todays.theme].label}</p>
            <Button
              onClick={() => applyIdea(todays)}
              className="mt-4 h-10 w-full rounded-full bg-emerald-700 text-xs font-black hover:bg-emerald-800"
            >
              Load today’s post
            </Button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">
                Post ideas
              </h2>
              <span className="text-xs font-bold text-slate-400">{visible.length} of {POST_IDEAS.length}</span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setThemeFilter("all")}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${themeFilter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                All
              </button>
              {(Object.keys(THEMES) as PostTheme[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setThemeFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${themeFilter === key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {THEMES[key].label}
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-[560px] space-y-2 overflow-y-auto pr-1">
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyIdea(p)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition ${
                    idea.id === p.id ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700">{p.kicker}</p>
                  <p className="mt-1 text-sm font-bold leading-snug text-slate-900">
                    {p.line1} {p.line2}
                  </p>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-4 text-slate-500">{p.caption}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Caption</h2>
            <textarea
              readOnly
              value={idea.caption}
              className="mt-3 h-44 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700"
            />
            <Button onClick={copyCaption} variant="outline" className="mt-3 w-full rounded-full text-xs font-black">
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy caption"}
            </Button>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}
