import { useMemo, useState } from "react";
import { Download, Palette } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assetToPngBlob, downloadBlob, fbCover, igStory, type BrandAsset } from "@/lib/brandTemplates";

function AssetCard({ asset, wide = false }: { asset: BrandAsset; wide?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(asset.svg)}`,
    [asset.svg],
  );

  const download = async () => {
    setBusy(true);
    setError("");
    try {
      downloadBlob(await assetToPngBlob(asset), `${asset.name}.png`);
    } catch (err: any) {
      setError(err?.message || "Export failed — try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${wide ? "col-span-full" : ""}`}>
      <img
        src={preview}
        alt={asset.name}
        className="w-full rounded-2xl border border-slate-100"
        style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900">{asset.name}.png</p>
          <p className="text-xs text-slate-500">{asset.width}×{asset.height}</p>
        </div>
        <Button onClick={download} disabled={busy} className="rounded-full bg-blue-700 text-white hover:bg-blue-800">
          <Download className="mr-2 h-4 w-4" />
          {busy ? "Exporting…" : "Download PNG"}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}

export function AdminBrandStudioPage() {
  const [sectorInput, setSectorInput] = useState("Sector 65, Sector 102, Golf Course Ext");
  const [headlinePlain, setHeadlinePlain] = useState("One of these windows");
  const [headlineGold, setHeadlineGold] = useState("is your next home.");

  const stories = useMemo(
    () =>
      sectorInput
        .split(",")
        .map((sector) => sector.trim())
        .filter(Boolean)
        .slice(0, 12)
        .map((sector) => igStory(sector)),
    [sectorInput],
  );
  const cover = useMemo(() => fbCover(headlinePlain, headlineGold), [headlinePlain, headlineGold]);

  return (
    <AdminLayout
      title="Brand Studio"
      subtitle="Generate on-brand social assets in the browser — previews update live, downloads are exact-size PNGs with the real brand fonts. Full kit (print, logos, guidelines): brand-kit/ in the repo."
    >
      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-700" />
            <h2 className="text-xl font-black text-slate-950">Instagram stories — per sector</h2>
          </div>
          <p className="mb-3 max-w-2xl text-sm text-slate-500">
            Comma-separated sectors or localities. One 1080×1920 story per entry — mask your society photo to the arch window in Canva after download.
          </p>
          <Input
            value={sectorInput}
            onChange={(event) => setSectorInput(event.target.value)}
            placeholder="Sector 65, Sector 102, Golf Course Ext"
            className="max-w-2xl rounded-full"
          />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stories.map((asset) => (
              <AssetCard key={asset.name} asset={asset} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-black text-slate-950">Facebook cover</h2>
          <p className="mb-3 max-w-2xl text-sm text-slate-500">
            Two headline lines — the second renders in italic gold, like the homepage hero.
          </p>
          <div className="flex max-w-2xl flex-col gap-3 sm:flex-row">
            <Input value={headlinePlain} onChange={(event) => setHeadlinePlain(event.target.value)} className="rounded-full" />
            <Input value={headlineGold} onChange={(event) => setHeadlineGold(event.target.value)} className="rounded-full" />
          </div>
          <div className="mt-5 grid max-w-4xl gap-5">
            <AssetCard asset={cover} wide />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminBrandStudioPage;
