import { useEffect, useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";

import { adminFetch } from "@/lib/adminApi";

export type VerifiedImportImage = {
  id: number;
  society_id: number;
  image_type: string;
  source_type: string;
  source_url?: string | null;
  google_photo_reference?: string | null;
  attribution?: string | null;
  confidence_score?: number | null;
  needs_review: boolean;
  admin_approved: boolean;
  admin_rejected: boolean;
};

type Props = {
  image: VerifiedImportImage;
  busy?: boolean;
  onCover: (image: VerifiedImportImage) => void;
  onGallery: (image: VerifiedImportImage) => void;
  onReject: (image: VerifiedImportImage) => void;
  draftHref?: string;
};

export function VerifiedImportImageCard({ image, busy, onCover, onGallery, onReject, draftHref }: Props) {
  const [googlePreview, setGooglePreview] = useState("");
  const [previewUnavailable, setPreviewUnavailable] = useState(false);

  useEffect(() => {
    if (!image.google_photo_reference || image.admin_rejected) return;
    let cancelled = false;
    let objectUrl = "";
    void (async () => {
      try {
        const response = await adminFetch(`/admin/verified-importer/images/${image.id}/preview`);
        if (!response.ok) throw new Error("Preview unavailable");
        objectUrl = URL.createObjectURL(await response.blob());
        if (!cancelled) setGooglePreview(objectUrl);
      } catch {
        if (!cancelled) setPreviewUnavailable(true);
      }
    })();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [image.id, image.google_photo_reference, image.admin_rejected]);

  const preview = image.source_url || googlePreview;
  const status = image.admin_rejected ? "Rejected" : image.admin_approved ? "Approved" : "Needs review";

  return <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
    {preview ? <img src={preview} alt={image.attribution || "Imported image candidate"} className="h-32 w-full object-cover" /> : <div className="flex h-32 flex-col items-center justify-center bg-slate-100 px-4 text-center text-xs text-slate-500"><ImageOff className="mb-2 h-5 w-5" />{previewUnavailable ? "Google preview unavailable; reference remains available for review." : "Loading Google photo preview…"}</div>}
    <div className="p-3">
      <div className="flex items-center justify-between gap-2 text-xs"><strong className="capitalize text-slate-800">{image.image_type} · {image.source_type.replace(/_/g, " ")}</strong><span className={image.admin_approved ? "text-emerald-700" : "text-amber-700"}>{status}</span></div>
      <p className="mt-1 text-xs text-slate-500">{image.attribution || "Source attribution pending"} · {image.confidence_score || 0}% confidence</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className="text-xs font-black text-blue-700 disabled:opacity-50" onClick={() => onCover(image)}>Approve as Cover</button>
        <button type="button" disabled={busy} className="text-xs font-black text-emerald-700 disabled:opacity-50" onClick={() => onGallery(image)}>Approve to Gallery</button>
        <button type="button" disabled={busy} className="text-xs font-black text-rose-700 disabled:opacity-50" onClick={() => onReject(image)}>Reject</button>
        {image.source_url ? <a href={image.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-black text-slate-600"><ExternalLink className="mr-1 h-3 w-3" />Open Source</a> : null}
        {draftHref ? <a href={draftHref} className="text-xs font-black text-slate-600">Open Society Draft</a> : null}
      </div>
    </div>
  </article>;
}
