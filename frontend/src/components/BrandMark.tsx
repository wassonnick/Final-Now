// The SocietyFlats mark — the original "society grid": nine rounded cells with
// one accent cell (middle-right) and one taller cell (bottom-centre). Geometry
// matches the live web mark exactly; only the palette moves to Calm & Verified —
// charcoal tile, white cells, verified-green accent (was navy / cream / brass).
export function BrandMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="118" fill="#1D1D1F" />
      {/* row 1 */}
      <rect x="110" y="110" width="76" height="76" rx="20" fill="#FFFFFF" />
      <rect x="218" y="110" width="76" height="76" rx="20" fill="#FFFFFF" />
      <rect x="326" y="110" width="76" height="76" rx="20" fill="#FFFFFF" />
      {/* row 2 — accent cell at middle-right */}
      <rect x="110" y="218" width="76" height="76" rx="20" fill="#FFFFFF" />
      <rect x="218" y="218" width="76" height="76" rx="20" fill="#FFFFFF" />
      <rect x="326" y="218" width="76" height="76" rx="20" fill="#0F7B63" />
      {/* row 3 — taller cell at bottom-centre */}
      <rect x="110" y="326" width="76" height="76" rx="20" fill="#FFFFFF" />
      <rect x="218" y="326" width="76" height="110" rx="20" fill="#FFFFFF" />
      <rect x="326" y="326" width="76" height="76" rx="20" fill="#FFFFFF" />
    </svg>
  );
}
