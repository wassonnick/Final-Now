// SocietyFlats brand asset templates — browser twin of brand-kit/generate.mjs.
// Keep the tokens in sync with the kit; Admin Brand Studio renders these SVGs
// and rasterizes them to PNG (with real webfonts embedded) for download.

export const BRAND = {
  estate: "#233B6E",
  ink: "#1C2434",
  cream: "#F8F3EA",
  clay: "#B08A3E",
  clayDeep: "#8C6E2F",
  sage: "#E3DFD3",
  leaf: "#DCE6F7",
  forest: "#18254A",
  grey: "#6A7080",
};
const C = BRAND;
const SERIF = "Newsreader, Georgia, 'Times New Roman', serif";
const SANS = "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif";
const SITE = "societyflats.com";
const PHONE = "+91 99118 86222";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function duskBuilding(
  x: number,
  top: number,
  cols: number,
  opts: { h?: number; lit?: string[]; gold?: string | null } = {},
) {
  const { h = 624, lit = [], gold = null } = opts;
  const cell = 26, gap = 10, pad = 16;
  const w = pad * 2 + cols * cell + (cols - 1) * gap;
  const parts = [`<rect x="${x}" y="${top}" width="${w}" height="${h - top + 40}" rx="14" fill="${C.forest}"/>`];
  const floors = Math.max(0, Math.floor((h - top - pad - 30) / (cell + gap)));
  for (let r = 0; r < floors; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const fill = gold === key ? C.clay : lit.includes(key) ? "#F3EBDA" : "#2A3C6E";
      parts.push(
        `<rect x="${x + pad + c * (cell + gap)}" y="${top + pad + 18 + r * (cell + gap)}" width="${cell}" height="${cell}" rx="7" fill="${fill}"/>`,
      );
    }
  }
  return parts.join("");
}

function markTile(x: number, y: number, size: number, tileFill = C.estate) {
  const cellSize = 76, gap = 32, start = (512 - (3 * 76 + 2 * 32)) / 2;
  const cells: string[] = [`<rect width="512" height="512" rx="118" fill="${tileFill}"/>`];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const lit = row === 1 && col === 2;
      const door = row === 2 && col === 1;
      cells.push(
        `<rect x="${start + col * (cellSize + gap)}" y="${start + row * (cellSize + gap)}" width="${cellSize}" height="${door ? cellSize + 34 : cellSize}" rx="20" fill="${lit ? C.clay : C.cream}"/>`,
      );
    }
  }
  return `<g transform="translate(${x} ${y}) scale(${size / 512})">${cells.join("")}</g>`;
}

export type BrandAsset = { name: string; width: number; height: number; svg: string };

export function igStory(sector: string): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B38"/><stop offset="1" stop-color="${C.estate}"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#sky)"/>
  <rect x="1010" y="1180" width="90" height="740" rx="12" fill="#1E2F5C"/>
  ${duskBuilding(880, 1260, 3, { h: 1920, lit: ["2-1", "8-0"], gold: "5-2" })}
  ${duskBuilding(40, 1660, 5, { h: 1920, lit: ["1-3"] })}
  ${markTile(72, 76, 92, C.forest)}
  <text x="190" y="144" font-family="${SERIF}" font-size="52" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>
  <path d="M140 1150 L140 660 A360 360 0 0 1 860 660 L860 1150 Z" fill="${C.forest}"/>
  <text x="500" y="900" font-family="${SANS}" font-size="26" font-weight="600" fill="${C.leaf}" text-anchor="middle">PHOTO / VIDEO ZONE — mask to this window</text>
  <path d="M140 1150 L140 660 A360 360 0 0 1 860 660 L860 1150 Z" fill="none" stroke="#F3EBDA" stroke-width="12"/>
  <rect x="812" y="640" width="48" height="48" rx="13" fill="${C.clay}"/>
  <text x="140" y="1300" font-family="${SERIF}" font-size="64" font-weight="600" fill="${C.cream}">This week in <tspan font-style="italic" fill="${C.clay}">${esc(sector)}.</tspan></text>
  <text x="140" y="1372" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.leaf}">Swap this line for the story's key verified fact.</text>
  <rect x="140" y="1450" width="460" height="92" rx="46" fill="${C.clay}"/>
  <text x="370" y="1508" font-family="${SANS}" font-size="34" font-weight="800" fill="${C.ink}" text-anchor="middle">WhatsApp us →</text>
  <text x="320" y="1820" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.leaf}">${SITE} · ${PHONE}</text>
</svg>`;
  const slug = sector.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { name: `ig-story-${slug || "sector"}`, width: 1080, height: 1920, svg };
}

export function fbCover(headlinePlain: string, headlineGold: string): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1640" height="624" viewBox="0 0 1640 624">
  <defs><linearGradient id="fbsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B38"/><stop offset="1" stop-color="${C.estate}"/></linearGradient></defs>
  <rect width="1640" height="624" fill="url(#fbsky)"/>
  <rect x="1064" y="236" width="120" height="420" rx="12" fill="#1E2F5C"/>
  <rect x="1560" y="300" width="120" height="360" rx="12" fill="#1E2F5C"/>
  <rect x="40" y="470" width="130" height="200" rx="12" fill="#1E2F5C"/>
  ${duskBuilding(1120, 330, 3, { lit: ["1-0", "4-2"] })}
  ${duskBuilding(1300, 240, 4, { lit: ["0-3", "3-1", "7-0"], gold: "2-2" })}
  ${duskBuilding(1500, 400, 3, { lit: ["2-1"] })}
  ${duskBuilding(120, 512, 6, { lit: ["0-4"] })}
  ${markTile(140, 56, 88, C.forest)}
  <text x="252" y="122" font-family="${SERIF}" font-size="56" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>
  <text x="140" y="298" font-family="${SERIF}" font-size="74" font-weight="600" fill="${C.cream}">${esc(headlinePlain)}</text>
  <text x="140" y="388" font-family="${SERIF}" font-size="74" font-weight="600" fill="${C.cream}"><tspan font-style="italic" fill="${C.clay}">${esc(headlineGold)}</tspan></text>
  <text x="142" y="452" font-family="${SANS}" font-size="27" font-weight="600" fill="${C.leaf}">Admin-verified societies · Real availability · No fake listings</text>
  <text x="142" y="496" font-family="${SANS}" font-size="27" font-weight="700" fill="${C.cream}">${SITE}  ·  ${PHONE}</text>
</svg>`;
  return { name: "facebook-cover", width: 1640, height: 624, svg };
}

// Embed the page's webfonts into an SVG string as data-URI @font-face rules so
// canvas rasterization renders real Newsreader/Hanken instead of Times fallback.
let fontCssPromise: Promise<string> | null = null;
async function embeddedFontCss(): Promise<string> {
  if (!fontCssPromise) {
    fontCssPromise = (async () => {
      try {
        const cssUrl =
          "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap";
        const css = await (await fetch(cssUrl)).text();
        const urls = [...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]);
        let inlined = css;
        await Promise.all(
          urls.map(async (url) => {
            const buf = await (await fetch(url)).arrayBuffer();
            let binary = "";
            const bytes = new Uint8Array(buf);
            for (let i = 0; i < bytes.length; i += 0x8000) {
              binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
            }
            inlined = inlined.replace(url, `data:font/woff2;base64,${btoa(binary)}`);
          }),
        );
        return inlined;
      } catch {
        return "";
      }
    })();
  }
  return fontCssPromise;
}

export async function assetToPngBlob(asset: BrandAsset, scale = 1): Promise<Blob> {
  const fontCss = await embeddedFontCss();
  const svgWithFonts = asset.svg.replace(
    /<svg([^>]*)>/,
    `<svg$1><style>${fontCss.replace(/</g, "")}</style>`,
  );
  const url = URL.createObjectURL(new Blob([svgWithFonts], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG render failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = asset.width * scale;
    canvas.height = asset.height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
