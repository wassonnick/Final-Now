// The SocietyFlats mark — the original 3×3 "society grid" (nine homes in a
// community), recoloured to Calm & Verified: charcoal tile, white cells, and
// the centre cell in verified-green as the trust signal. Geometry matches the
// live web mark exactly. Crisp from favicon to hero.
export function BrandMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  const pos = [110, 218, 326];
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="118" fill="#1D1D1F" />
      {pos.map((y) =>
        pos.map((x) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="76"
            height="76"
            rx="20"
            fill={x === 218 && y === 218 ? "#0F7B63" : "#FFFFFF"}
          />
        )),
      )}
    </svg>
  );
}
