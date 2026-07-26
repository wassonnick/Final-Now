// The SocietyFlats mark — an architectural society arch with one jade doorway
// (the home journey) and one brass light (the verified signal). Inline SVG keeps
// it crisp at favicon size. Keep geometry in sync with brand-kit/generate.mjs.
export function BrandMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="118" fill="#242426" />
      <path
        d="M118 392V238C118 157 179 98 256 98s138 59 138 140v154h-58V238c0-50-35-82-80-82s-80 32-80 82v154h-58Z"
        fill="#F8F3EA"
      />
      <rect x="92" y="378" width="328" height="42" rx="21" fill="#F8F3EA" />
      <path d="M220 392v-94c0-27 15-44 36-44s36 17 36 44v94h-72Z" fill="#3BAE93" />
      <circle cx="326" cy="236" r="17" fill="#B08A3E" />
    </svg>
  );
}
