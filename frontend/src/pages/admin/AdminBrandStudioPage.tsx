import { useMemo, useState } from "react";
import { Download, Palette } from "lucide-react";

import { AdminLayout } from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  assetToPngBlob,
  downloadBlob,
  fbCover,
  igStory,
  justVerifiedPost,
  launchFb,
  launchPost,
  launchStory,
  mythFactPost,
  ownerFb,
  ownerPost,
  ownerStory,
  rentStory,
  scoreStory,
  versusPost,
  type BrandAsset,
} from "@/lib/brandTemplates";

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

function Section({ title, hint, controls, assets }: { title: string; hint: string; controls: React.ReactNode; assets: BrandAsset[] }) {
  return (
    <section>
      <h2 className="mb-1 text-xl font-black text-slate-950">{title}</h2>
      <p className="mb-3 max-w-2xl text-sm text-slate-500">{hint}</p>
      <div className="flex max-w-3xl flex-col gap-3 sm:flex-row sm:flex-wrap">{controls}</div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {assets.map((asset) => (
          <AssetCard key={asset.name + asset.svg.length} asset={asset} />
        ))}
      </div>
    </section>
  );
}

export function AdminBrandStudioPage() {
  const [sectorInput, setSectorInput] = useState("Sector 65, Sector 102, Golf Course Ext");
  const [headlinePlain, setHeadlinePlain] = useState("One of these windows");
  const [headlineGold, setHeadlineGold] = useState("is your next home.");
  const [scoreSociety, setScoreSociety] = useState("ATS Grandstand");
  const [scoreSector, setScoreSector] = useState("Sector 99A");
  const [scoreOverall, setScoreOverall] = useState("7.4");
  const [scoreBars, setScoreBars] = useState("Connectivity 7.8, Lifestyle 7.2, Security 8.1");
  const [rentAmount, setRentAmount] = useState("₹85,000/mo");
  const [rentArea, setRentArea] = useState("Sector 65");
  const [verifiedSociety, setVerifiedSociety] = useState("Tata Primanti");
  const [verifiedSector, setVerifiedSector] = useState("Sector 72");
  const [versusA, setVersusA] = useState("DLF The Crest");
  const [versusB, setVersusB] = useState("M3M Merlin");
  const [myth, setMyth] = useState("Every listing site shows what's really available.");
  const [fact, setFact] = useState("We verify each home against its society before it goes live.");

  const scoreAsset = useMemo(() => {
    const bars = scoreBars
      .split(",")
      .map((entry) => {
        const match = entry.trim().match(/^(.*?)\s+([\d.]+)$/);
        return match ? { label: match[1], value: Number(match[2]) } : null;
      })
      .filter((bar): bar is { label: string; value: number } => Boolean(bar));
    return scoreStory(scoreSociety, scoreSector, scoreOverall, bars);
  }, [scoreSociety, scoreSector, scoreOverall, scoreBars]);
  const rentAsset = useMemo(() => rentStory(rentAmount, rentArea), [rentAmount, rentArea]);
  const verifiedAsset = useMemo(() => justVerifiedPost(verifiedSociety, verifiedSector), [verifiedSociety, verifiedSector]);
  const versusAsset = useMemo(() => versusPost(versusA, versusB), [versusA, versusB]);
  const mythAsset = useMemo(() => mythFactPost(myth, fact), [myth, fact]);
  const launchAssets = useMemo(() => [launchStory(), launchPost(), launchFb()], []);
  const [ownerSociety, setOwnerSociety] = useState("DLF The Crest");
  const ownerAssets = useMemo(() => [ownerStory(ownerSociety), ownerPost(), ownerFb()], [ownerSociety]);

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
        <Section
          title="Launch announcement — WhatsApp status · Instagram · Facebook"
          hint="One creative per channel, same dusk-skyline story: Gurgaon, meet SocietyFlats. Download and post as-is."
          controls={<></>}
          assets={launchAssets}
        />

        <Section
          title="Owner acquisition — get inventory listed"
          hint="Drives owners to societyflats.com/list-your-flat. The story personalises per society — post it in that society's owner/RWA groups."
          controls={
            <Input value={ownerSociety} onChange={(e) => setOwnerSociety(e.target.value)} placeholder="Society for the story" className="rounded-full sm:max-w-64" />
          }
          assets={ownerAssets}
        />

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

        <Section
          title="Society report card — story"
          hint="Real published scores only. Bars: comma-separated 'Label value' pairs."
          controls={
            <>
              <Input value={scoreSociety} onChange={(e) => setScoreSociety(e.target.value)} placeholder="Society" className="rounded-full sm:max-w-56" />
              <Input value={scoreSector} onChange={(e) => setScoreSector(e.target.value)} placeholder="Sector" className="rounded-full sm:max-w-44" />
              <Input value={scoreOverall} onChange={(e) => setScoreOverall(e.target.value)} placeholder="Overall (e.g. 7.4)" className="rounded-full sm:max-w-40" />
              <Input value={scoreBars} onChange={(e) => setScoreBars(e.target.value)} placeholder="Connectivity 7.8, Lifestyle 7.2" className="rounded-full sm:min-w-80" />
            </>
          }
          assets={[scoreAsset]}
        />

        <Section
          title="Rent check — story"
          hint="The hook is the giant gold number. Use a real verified entry point."
          controls={
            <>
              <Input value={rentAmount} onChange={(e) => setRentAmount(e.target.value)} placeholder="₹85,000/mo" className="rounded-full sm:max-w-52" />
              <Input value={rentArea} onChange={(e) => setRentArea(e.target.value)} placeholder="Sector 65" className="rounded-full sm:max-w-52" />
            </>
          }
          assets={[rentAsset]}
        />

        <Section
          title="Just Verified — post (FB + IG)"
          hint="Announce each newly published society. Mask the society photo to the arch after download."
          controls={
            <>
              <Input value={verifiedSociety} onChange={(e) => setVerifiedSociety(e.target.value)} placeholder="Society" className="rounded-full sm:max-w-56" />
              <Input value={verifiedSector} onChange={(e) => setVerifiedSector(e.target.value)} placeholder="Sector" className="rounded-full sm:max-w-44" />
            </>
          }
          assets={[verifiedAsset]}
        />

        <Section
          title="A vs B — post (FB + IG)"
          hint="Comparison teaser — pair it with the matching /compare page link in the caption."
          controls={
            <>
              <Input value={versusA} onChange={(e) => setVersusA(e.target.value)} placeholder="Society A" className="rounded-full sm:max-w-56" />
              <Input value={versusB} onChange={(e) => setVersusB(e.target.value)} placeholder="Society B" className="rounded-full sm:max-w-56" />
            </>
          }
          assets={[versusAsset]}
        />

        <Section
          title="Myth / Fact — post (FB + IG)"
          hint="The trust promise as a series. Keep both lines short and honest."
          controls={
            <>
              <Input value={myth} onChange={(e) => setMyth(e.target.value)} placeholder="Myth" className="rounded-full sm:min-w-96" />
              <Input value={fact} onChange={(e) => setFact(e.target.value)} placeholder="Fact" className="rounded-full sm:min-w-96" />
            </>
          }
          assets={[mythAsset]}
        />
      </div>
    </AdminLayout>
  );
}

export default AdminBrandStudioPage;
