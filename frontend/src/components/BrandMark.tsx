// The SocietyFlats mark — a society facade with a taller door and one gold window
// (the verified flat you find). Inline SVG so it's crisp at any size with zero
// asset requests. Keep geometry in sync with brand-kit/generate.mjs.
export function BrandMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  const cells: JSX.Element[] = [];
  const cell = 76, gap = 32, start = (512 - (3 * cell + 2 * gap)) / 2;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const lit = row === 1 && col === 2;
      const door = row === 2 && col === 1;
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={start + col * (cell + gap)}
          y={start + row * (cell + gap)}
          width={cell}
          height={door ? cell + 34 : cell}
          rx={20}
          fill={lit ? "#B08A3E" : "#F8F3EA"}
        />,
      );
    }
  }
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="118" fill="#111827" />
      {cells}
    </svg>
  );
}
