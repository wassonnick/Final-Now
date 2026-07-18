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

// Shrink a font size so `text` fits the width a `maxChars`-long string would use.
const fitSize = (text: string, base: number, maxChars: number) =>
  Math.round(base * Math.min(1, maxChars / Math.max(1, text.length)));

// Greedy word-wrap into at most `maxLines` lines of ~`maxChars` (last line ellipsised).
function wrapLines(text: string, maxChars: number, maxLines = 2): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars || current === "") {
      current = (current + " " + word).trim();
    } else {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  const used = lines.join(" ").split(/\s+/).filter(Boolean).length;
  const rest = words.slice(used).join(" ");
  lines.push(rest.length > maxChars ? rest.slice(0, maxChars - 1).trimEnd() + "…" : rest);
  return lines.filter(Boolean);
}

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

// Society report card story — real scores as a shareable card. Weekly content
// straight from published data; never invent numbers.
export function scoreStory(
  society: string,
  sector: string,
  overall: string,
  bars: Array<{ label: string; value: number }>,
): BrandAsset {
  const barRows = bars
    .filter((bar) => bar.label && bar.value > 0)
    .slice(0, 4)
    .map((bar, index) => {
      const y = 1150 + index * 118;
      const width = Math.max(40, Math.min(10, bar.value) / 10 * 640);
      return `
  <text x="140" y="${y}" font-family="${SANS}" font-size="30" font-weight="700" fill="${C.leaf}" letter-spacing="3">${esc(bar.label.toUpperCase())}</text>
  <rect x="140" y="${y + 22}" width="640" height="18" rx="9" fill="#2A3C6E"/>
  <rect x="140" y="${y + 22}" width="${width}" height="18" rx="9" fill="#F3EBDA"/>
  <text x="830" y="${y + 40}" font-family="${SERIF}" font-size="40" font-weight="600" fill="${C.cream}">${bar.value.toFixed(1)}</text>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B38"/><stop offset="1" stop-color="${C.estate}"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#sky)"/>
  ${duskBuilding(900, 1500, 2, { h: 1920, lit: ["1-0"], gold: "3-1" })}
  ${markTile(72, 76, 92, C.forest)}
  <text x="190" y="144" font-family="${SERIF}" font-size="52" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>
  <text x="540" y="340" font-family="${SANS}" font-size="30" font-weight="700" fill="${C.leaf}" text-anchor="middle" letter-spacing="5">SOCIETY REPORT CARD</text>
  <circle cx="540" cy="600" r="160" fill="none" stroke="${C.clay}" stroke-width="14"/>
  <circle cx="540" cy="600" r="132" fill="${C.forest}"/>
  <text x="540" y="640" font-family="${SERIF}" font-size="120" font-weight="600" fill="${C.clay}" text-anchor="middle">${esc(overall)}</text>
  <text x="540" y="700" font-family="${SANS}" font-size="26" font-weight="700" fill="${C.leaf}" text-anchor="middle">OVERALL / 10</text>
  <text x="540" y="880" font-family="${SERIF}" font-size="${fitSize(society, 72, 24)}" font-weight="600" fill="${C.cream}" text-anchor="middle">${esc(society)}</text>
  <text x="540" y="950" font-family="${SANS}" font-size="32" font-weight="600" fill="${C.leaf}" text-anchor="middle">${esc(sector)} · admin-verified data</text>
  ${barRows}
  <rect x="140" y="1660" width="520" height="92" rx="46" fill="${C.clay}"/>
  <text x="400" y="1718" font-family="${SANS}" font-size="34" font-weight="800" fill="${C.ink}" text-anchor="middle">See the full profile →</text>
  <text x="140" y="1850" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.leaf}">${SITE} · ${PHONE}</text>
</svg>`;
  const slug = society.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { name: `score-card-${slug || "society"}`, width: 1080, height: 1920, svg };
}

// Rent-check story — the scroll-stopping hook is a giant gold number.
export function rentStory(amount: string, area: string): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="${C.cream}"/>
  ${markTile(72, 76, 92)}
  <text x="190" y="144" font-family="${SERIF}" font-size="52" font-weight="600" fill="${C.ink}">Society<tspan fill="${C.estate}">Flats</tspan></text>
  <text x="90" y="560" font-family="${SERIF}" font-size="88" font-weight="600" fill="${C.ink}">What does</text>
  <text x="90" y="780" font-family="${SERIF}" font-size="${fitSize(amount, 150, 11)}" font-weight="600" font-style="italic" fill="${C.clayDeep}">${esc(amount)}</text>
  <text x="90" y="940" font-family="${SERIF}" font-size="88" font-weight="600" fill="${C.ink}">get you in ${esc(area)}?</text>
  <text x="92" y="1060" font-family="${SANS}" font-size="34" font-weight="600" fill="${C.grey}">Real options from verified societies — no bait listings.</text>
  <rect x="90" y="1180" width="560" height="100" rx="50" fill="${C.estate}"/>
  <text x="370" y="1243" font-family="${SANS}" font-size="36" font-weight="800" fill="${C.cream}" text-anchor="middle">See verified options →</text>
  <g opacity="0.35">${duskBuilding(120, 1500, 5, { h: 1920, lit: [] })}${duskBuilding(420, 1580, 4, { h: 1920, lit: [] })}${duskBuilding(680, 1460, 5, { h: 1920, lit: [], gold: "2-2" })}</g>
  <text x="90" y="1420" font-family="${SANS}" font-size="30" font-weight="700" fill="${C.clayDeep}">${SITE} · ${PHONE}</text>
</svg>`;
  return { name: "rent-check", width: 1080, height: 1920, svg };
}

// Just Verified post (1080×1080, FB + IG) — announcement card with a gold seal.
export function justVerifiedPost(society: string, sector: string): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${C.cream}"/>
  <rect x="28" y="28" width="1024" height="1024" rx="28" fill="none" stroke="${C.sage}" stroke-width="2"/>
  <path d="M280 620 L280 400 A260 260 0 0 1 800 400 L800 620 Z" fill="${C.sage}"/>
  <text x="540" y="500" font-family="${SANS}" font-size="24" font-weight="600" fill="${C.grey}" text-anchor="middle">PHOTO — mask to this window</text>
  <path d="M280 620 L280 400 A260 260 0 0 1 800 400 L800 620 Z" fill="none" stroke="${C.estate}" stroke-width="12"/>
  <circle cx="800" cy="620" r="86" fill="${C.clay}"/>
  <circle cx="800" cy="620" r="70" fill="none" stroke="${C.cream}" stroke-width="4"/>
  <path d="M766 620 L790 646 L836 592" fill="none" stroke="${C.cream}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="90" y="800" font-family="${SANS}" font-size="28" font-weight="700" fill="${C.clayDeep}" letter-spacing="5">JUST VERIFIED</text>
  <text x="90" y="878" font-family="${SERIF}" font-size="${fitSize(society, 64, 26)}" font-weight="600" fill="${C.ink}">${esc(society)}</text>
  <text x="90" y="936" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.grey}">${esc(sector)} · scores, market ranges and amenities now live</text>
  ${markTile(920, 900, 72)}
  <text x="90" y="1010" font-family="${SANS}" font-size="26" font-weight="700" fill="${C.estate}">${SITE} · ${PHONE}</text>
</svg>`;
  const slug = society.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { name: `just-verified-${slug || "society"}`, width: 1080, height: 1080, svg };
}

// Versus post (1080×1080) — split panel comparison teaser; feeds the compare pages.
export function versusPost(societyA: string, societyB: string): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="540" height="1080" fill="${C.cream}"/>
  <rect x="540" width="540" height="1080" fill="${C.estate}"/>
  <g opacity="0.5">${duskBuilding(120, 620, 4, { h: 940, lit: [] })}</g>
  ${duskBuilding(700, 560, 4, { h: 940, lit: ["1-2", "4-0"], gold: "2-3" })}
  <text x="270" y="380" font-family="${SERIF}" font-size="${fitSize(societyA, 60, 14)}" font-weight="600" fill="${C.ink}" text-anchor="middle">${esc(societyA)}</text>
  <text x="810" y="380" font-family="${SERIF}" font-size="${fitSize(societyB, 60, 14)}" font-weight="600" fill="${C.cream}" text-anchor="middle">${esc(societyB)}</text>
  <circle cx="540" cy="480" r="90" fill="${C.clay}"/>
  <text x="540" y="508" font-family="${SERIF}" font-size="72" font-weight="600" font-style="italic" fill="${C.ink}" text-anchor="middle">vs</text>
  <rect x="140" y="920" width="800" height="92" rx="46" fill="${C.forest}"/>
  <text x="540" y="978" font-family="${SANS}" font-size="32" font-weight="800" fill="${C.cream}" text-anchor="middle">Compare them side by side → ${SITE}/compare</text>
  <text x="270" y="150" font-family="${SANS}" font-size="26" font-weight="700" fill="${C.clayDeep}" text-anchor="middle" letter-spacing="4">WHICH ONE FITS YOU?</text>
  <text x="810" y="150" font-family="${SANS}" font-size="26" font-weight="700" fill="${C.leaf}" text-anchor="middle" letter-spacing="4">ADMIN-VERIFIED DATA</text>
</svg>`;
  return { name: "versus-post", width: 1080, height: 1080, svg };
}

// Myth/Fact post (1080×1080) — the trust promise as an ongoing series.
export function mythFactPost(myth: string, fact: string): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="540" fill="${C.estate}"/>
  <rect y="540" width="1080" height="540" fill="${C.cream}"/>
  <g opacity="0.4">${duskBuilding(920, 120, 3, { h: 500, lit: [] })}</g>
  <text x="90" y="170" font-family="${SANS}" font-size="30" font-weight="800" fill="${C.leaf}" letter-spacing="6">MYTH</text>
  ${wrapLines(`“${myth}”`, 34).map((line, index) => `<text x="90" y="${252 + index * 74}" font-family="${SERIF}" font-size="56" font-weight="500" font-style="italic" fill="${C.cream}">${esc(line)}</text>`).join("")}
  <text x="90" y="690" font-family="${SANS}" font-size="30" font-weight="800" fill="${C.clayDeep}" letter-spacing="6">FACT</text>
  ${wrapLines(fact, 34).map((line, index) => `<text x="90" y="${772 + index * 74}" font-family="${SERIF}" font-size="56" font-weight="600" fill="${C.ink}">${esc(line)}</text>`).join("")}
  ${markTile(920, 920, 72)}
  <text x="90" y="990" font-family="${SANS}" font-size="26" font-weight="700" fill="${C.estate}">${SITE} · every society admin-verified</text>
</svg>`;
  return { name: "myth-fact", width: 1080, height: 1080, svg };
}

// ————— Launch announcement suite — one per channel, same dusk-skyline story —————
// WhatsApp status / IG story 1080×1920.
export function launchStory(): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><linearGradient id="lsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B38"/><stop offset="1" stop-color="${C.estate}"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#lsky)"/>
  <rect x="990" y="1100" width="110" height="820" rx="12" fill="#1E2F5C"/>
  <rect x="-20" y="1240" width="120" height="680" rx="12" fill="#1E2F5C"/>
  ${duskBuilding(120, 1300, 4, { h: 1920, lit: ["1-2", "6-0"] })}
  ${duskBuilding(420, 1180, 5, { h: 1920, lit: ["0-4", "4-1", "9-3"], gold: "2-2" })}
  ${duskBuilding(760, 1360, 4, { h: 1920, lit: ["3-3"] })}
  ${markTile(414, 300, 252, C.forest)}
  <text x="540" y="700" font-family="${SERIF}" font-size="88" font-weight="600" fill="${C.cream}" text-anchor="middle">Gurgaon, meet</text>
  <text x="540" y="810" font-family="${SERIF}" font-size="96" font-weight="600" fill="${C.cream}" text-anchor="middle">Society<tspan fill="${C.leaf}">Flats</tspan>.</text>
  <text x="540" y="930" font-family="${SERIF}" font-size="52" font-weight="500" font-style="italic" fill="${C.clay}" text-anchor="middle">Every society verified. Every home real.</text>
  <text x="540" y="1030" font-family="${SANS}" font-size="32" font-weight="600" fill="${C.leaf}" text-anchor="middle">Scores, live prices and a friendly AI advisor —</text>
  <text x="540" y="1078" font-family="${SANS}" font-size="32" font-weight="600" fill="${C.leaf}" text-anchor="middle">now live for Gurgaon.</text>
  <rect x="290" y="1660" width="500" height="96" rx="48" fill="${C.clay}"/>
  <text x="540" y="1720" font-family="${SANS}" font-size="36" font-weight="800" fill="${C.ink}" text-anchor="middle">${SITE} →</text>
  <text x="540" y="1830" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.leaf}" text-anchor="middle">${PHONE} · WhatsApp us</text>
</svg>`;
  return { name: "launch-whatsapp-status", width: 1080, height: 1920, svg };
}

// Instagram launch post 1080×1080.
export function launchPost(): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs><linearGradient id="lpsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B38"/><stop offset="1" stop-color="${C.estate}"/></linearGradient></defs>
  <rect width="1080" height="1080" fill="url(#lpsky)"/>
  ${duskBuilding(60, 700, 4, { h: 1080, lit: ["2-1"] })}
  ${duskBuilding(820, 640, 4, { h: 1080, lit: ["1-3", "5-0"], gold: "3-2" })}
  ${markTile(444, 120, 192, C.forest)}
  <text x="540" y="470" font-family="${SERIF}" font-size="76" font-weight="600" fill="${C.cream}" text-anchor="middle">Gurgaon, meet Society<tspan fill="${C.leaf}">Flats</tspan>.</text>
  <text x="540" y="560" font-family="${SERIF}" font-size="44" font-weight="500" font-style="italic" fill="${C.clay}" text-anchor="middle">Every society verified. Every home real.</text>
  <text x="540" y="650" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.leaf}" text-anchor="middle">Society scores · live verified prices · AI advisor · zero fake listings</text>
  <rect x="330" y="880" width="420" height="88" rx="44" fill="${C.clay}"/>
  <text x="540" y="936" font-family="${SANS}" font-size="34" font-weight="800" fill="${C.ink}" text-anchor="middle">${SITE} →</text>
  <text x="540" y="1030" font-family="${SANS}" font-size="26" font-weight="600" fill="${C.leaf}" text-anchor="middle">${PHONE} · WhatsApp for verified availability</text>
</svg>`;
  return { name: "launch-instagram-post", width: 1080, height: 1080, svg };
}

// Facebook launch post / link card 1200×630.
export function launchFb(): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="lfsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B38"/><stop offset="1" stop-color="${C.estate}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#lfsky)"/>
  <rect x="1090" y="240" width="110" height="390" rx="12" fill="#1E2F5C"/>
  ${duskBuilding(880, 300, 4, { h: 630, lit: ["1-1", "4-3"], gold: "2-2" })}
  ${duskBuilding(1040, 380, 3, { h: 630, lit: ["2-0"] })}
  ${markTile(84, 70, 108, C.forest)}
  <text x="216" y="146" font-family="${SERIF}" font-size="64" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>
  <text x="86" y="300" font-family="${SERIF}" font-size="68" font-weight="600" fill="${C.cream}">Gurgaon, meet your</text>
  <text x="86" y="384" font-family="${SERIF}" font-size="68" font-weight="600" font-style="italic" fill="${C.clay}">society-first home search.</text>
  <text x="88" y="460" font-family="${SANS}" font-size="27" font-weight="600" fill="${C.leaf}">Every society verified · live prices · AI advisor · zero fake listings</text>
  <text x="88" y="550" font-family="${SANS}" font-size="30" font-weight="700" fill="${C.cream}">${SITE}  ·  ${PHONE}</text>
</svg>`;
  return { name: "launch-facebook-post", width: 1200, height: 630, svg };
}

// ————— Owner acquisition suite — get inventory: "list your flat" —————
const CAMPAIGN_URL = `${SITE}/list-your-flat`;

// Instagram story 1080×1920 — personalise per society for owner groups.
export function ownerStory(society: string): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs><linearGradient id="osky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B38"/><stop offset="1" stop-color="${C.estate}"/></linearGradient></defs>
  <rect width="1080" height="1920" fill="url(#osky)"/>
  ${duskBuilding(840, 1200, 4, { h: 1920, lit: ["1-1", "5-3"], gold: "3-2" })}
  ${duskBuilding(40, 1560, 5, { h: 1920, lit: ["0-2"] })}
  ${markTile(72, 76, 92, C.forest)}
  <text x="190" y="144" font-family="${SERIF}" font-size="52" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>
  <text x="90" y="500" font-family="${SERIF}" font-size="${fitSize(`Own a flat in ${society}?`, 76, 26)}" font-weight="600" fill="${C.cream}">Own a flat in ${esc(society)}?</text>
  <text x="90" y="620" font-family="${SERIF}" font-size="66" font-weight="500" font-style="italic" fill="${C.clay}">People are searching it right now.</text>
  <text x="92" y="760" font-family="${SANS}" font-size="34" font-weight="600" fill="${C.leaf}">List free on your society's verified page and meet</text>
  <text x="92" y="810" font-family="${SANS}" font-size="34" font-weight="600" fill="${C.leaf}">tenants and buyers who already chose your address.</text>
  ${["No listing fee", "Verified enquiries only", "Your number stays private", "Pause anytime"].map((line, index) => `
  <circle cx="110" cy="${940 + index * 84}" r="10" fill="${C.clay}"/>
  <text x="146" y="${952 + index * 84}" font-family="${SANS}" font-size="32" font-weight="700" fill="${C.cream}">${line}</text>`).join("")}
  <rect x="90" y="1560" width="620" height="96" rx="48" fill="${C.clay}"/>
  <text x="400" y="1620" font-family="${SANS}" font-size="34" font-weight="800" fill="${C.ink}" text-anchor="middle">List your flat free →</text>
  <text x="90" y="1740" font-family="${SANS}" font-size="30" font-weight="700" fill="${C.leaf}">${CAMPAIGN_URL}</text>
  <text x="90" y="1800" font-family="${SANS}" font-size="28" font-weight="600" fill="${C.leaf}">${PHONE} · WhatsApp us</text>
</svg>`;
  const slug = society.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { name: `owner-story-${slug || "society"}`, width: 1080, height: 1920, svg };
}

// Instagram post 1080×1080.
export function ownerPost(): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${C.cream}"/>
  <rect x="28" y="28" width="1024" height="1024" rx="28" fill="none" stroke="${C.sage}" stroke-width="2"/>
  ${markTile(84, 84, 84)}
  <text x="190" y="142" font-family="${SERIF}" font-size="46" font-weight="600" fill="${C.ink}">Society<tspan fill="${C.estate}">Flats</tspan></text>
  <text x="88" y="330" font-family="${SERIF}" font-size="72" font-weight="600" fill="${C.ink}">Your flat. Your society's page.</text>
  <text x="88" y="430" font-family="${SERIF}" font-size="72" font-weight="600" font-style="italic" fill="${C.clayDeep}">Their next home.</text>
  <text x="90" y="530" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.grey}">Gurgaon seekers on SocietyFlats pick the society first — then the flat.</text>
  <text x="90" y="578" font-family="${SANS}" font-size="30" font-weight="600" fill="${C.grey}">List yours where they're already looking. Free, verified, no spam.</text>
  ${["Free listing", "Verified enquiries", "Number stays private"].map((chip, index) => `
  <rect x="${90 + index * 300}" y="640" width="280" height="64" rx="32" fill="${C.leaf}"/>
  <text x="${230 + index * 300}" y="681" font-family="${SANS}" font-size="26" font-weight="700" fill="${C.estate}" text-anchor="middle">${chip}</text>`).join("")}
  <rect x="88" y="800" width="480" height="92" rx="46" fill="${C.estate}"/>
  <text x="328" y="858" font-family="${SANS}" font-size="32" font-weight="800" fill="${C.cream}" text-anchor="middle">List your flat free →</text>
  <g opacity="0.35">${duskBuilding(760, 760, 4, { h: 1080, lit: [], gold: "1-2" })}</g>
  <text x="88" y="990" font-family="${SANS}" font-size="28" font-weight="700" fill="${C.clayDeep}">${CAMPAIGN_URL} · ${PHONE}</text>
</svg>`;
  return { name: "owner-instagram-post", width: 1080, height: 1080, svg };
}

// Facebook post 1200×630.
export function ownerFb(): BrandAsset {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><linearGradient id="ofsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101B38"/><stop offset="1" stop-color="${C.estate}"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#ofsky)"/>
  ${duskBuilding(920, 260, 4, { h: 630, lit: ["1-0", "3-3"], gold: "2-1" })}
  ${duskBuilding(1090, 350, 2, { h: 630, lit: ["2-0"] })}
  ${markTile(84, 64, 96, C.forest)}
  <text x="200" y="132" font-family="${SERIF}" font-size="56" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>
  <text x="86" y="280" font-family="${SERIF}" font-size="62" font-weight="600" fill="${C.cream}">Own a flat in a Gurgaon society?</text>
  <text x="86" y="360" font-family="${SERIF}" font-size="62" font-weight="600" font-style="italic" fill="${C.clay}">List it where they're searching.</text>
  <text x="88" y="436" font-family="${SANS}" font-size="27" font-weight="600" fill="${C.leaf}">Free listing · verified enquiries only · your number stays private</text>
  <rect x="86" y="490" width="430" height="80" rx="40" fill="${C.clay}"/>
  <text x="301" y="541" font-family="${SANS}" font-size="30" font-weight="800" fill="${C.ink}" text-anchor="middle">List your flat free →</text>
  <text x="550" y="541" font-family="${SANS}" font-size="27" font-weight="700" fill="${C.cream}">${CAMPAIGN_URL}</text>
</svg>`;
  return { name: "owner-facebook-post", width: 1200, height: 630, svg };
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
