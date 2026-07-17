// SocietyFlats brand kit generator — single source of truth for every brand asset.
// Edit the tokens, run `node brand-kit/generate.mjs`, and every SVG regenerates.
// All assets are vector (print-ready at any size); PNGs for the web app are
// rasterized separately (see brand-kit/README.md).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// ————— Brand tokens (matches the live product UI) —————
export const C = {
  estate: "#153F2B", // primary deep green
  ink: "#19231C", // near-black text
  cream: "#F8F3EA", // canvas
  clay: "#C8793F", // accent — "the flat you find"
  clayDeep: "#9A552E",
  sage: "#DFDED6", // hairlines
  leaf: "#E6F4E9", // success tint
  forest: "#0E2F20", // hover/deep green
  white: "#FFFFFF",
  grey: "#667064", // secondary text
};
const SERIF = "Newsreader, Georgia, 'Times New Roman', serif";
const SANS = "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif";
const SITE = "societyflats.com";
const PHONE = "+91 99118 86222";
const TAGLINE = "Verified society homes in Gurgaon";

// ————— The mark: three-tower skyline + clay window, in a rounded tile —————
// Geometry lives in a 512×512 box. `tile:false` renders green towers for light
// backgrounds; `tile:true` renders cream towers on the estate-green tile.
function mark({ tile = true, towerFill, windowFill = C.clay, tileFill = C.estate } = {}) {
  const towers = towerFill || (tile ? C.cream : C.estate);
  // Side-tower windows use the background colour (cutouts) so the shapes read as
  // buildings, not a bar chart; they vanish gracefully at favicon sizes. The single
  // clay window stays the star — "the verified flat you find".
  const cut = tile ? tileFill : C.cream;
  return [
    tile ? `<rect width="512" height="512" rx="118" fill="${tileFill}"/>` : "",
    `<rect x="128" y="208" width="76" height="168" rx="22" fill="${towers}"/>`,
    `<rect x="218" y="136" width="76" height="240" rx="22" fill="${towers}"/>`,
    `<rect x="308" y="240" width="76" height="136" rx="22" fill="${towers}"/>`,
    `<rect x="150" y="234" width="24" height="24" rx="7" fill="${cut}"/>`,
    `<rect x="330" y="266" width="24" height="24" rx="7" fill="${cut}"/>`,
    `<rect x="240" y="164" width="32" height="32" rx="9" fill="${windowFill}"/>`,
  ].join("\n  ");
}

function svg(w, h, body, { unit = "" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}${unit}" height="${h}${unit}" viewBox="0 0 ${w} ${h}" fill="none">\n  ${body}\n</svg>\n`;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function text(x, y, str, { size = 32, fill = C.ink, font = SANS, weight = 600, spacing = 0, anchor = "start", style = "" } = {}) {
  return `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}"${spacing ? ` letter-spacing="${spacing}"` : ""}${anchor !== "start" ? ` text-anchor="${anchor}"` : ""}${style ? ` ${style}` : ""}>${esc(str)}</text>`;
}

function markAt(x, y, size, opts) {
  return `<g transform="translate(${x} ${y}) scale(${size / 512})">\n  ${mark(opts)}\n  </g>`;
}

// Wordmark: "Society" in serif ink + "Flats" in serif estate-green.
function wordmark(x, y, size, { dark = false } = {}) {
  const main = dark ? C.cream : C.ink;
  const accent = dark ? C.leaf : C.estate;
  return (
    `<text x="${x}" y="${y}" font-family="${SERIF}" font-size="${size}" font-weight="600" fill="${main}">Society<tspan fill="${accent}">Flats</tspan></text>`
  );
}

const files = {};

// ————— 1. Logo suite —————
files["logo/mark-tile.svg"] = svg(512, 512, mark({ tile: true }));
files["logo/mark-green.svg"] = svg(512, 512, mark({ tile: false }));
files["logo/mark-mono-black.svg"] = svg(512, 512, mark({ tile: false, towerFill: "#000000", windowFill: "#000000" }));
files["logo/mark-mono-white.svg"] = svg(512, 512, mark({ tile: false, towerFill: "#FFFFFF", windowFill: "#FFFFFF" }));
files["logo/favicon.svg"] = svg(512, 512, mark({ tile: true }));

// Horizontal lockup: tile mark + wordmark (+ optional tagline).
function horizontal({ dark = false, tagline = false }) {
  const W = tagline ? 1320 : 1280;
  const bg = dark ? `<rect width="${W}" height="320" fill="${C.estate}"/>` : "";
  return svg(W, 320, [
    bg,
    markAt(40, 56, 208, dark ? { tile: true, tileFill: C.forest } : { tile: true }),
    wordmark(292, tagline ? 178 : 202, 128, { dark }),
    tagline
      ? text(296, 236, TAGLINE.toUpperCase(), { size: 30, fill: dark ? C.leaf : C.clayDeep, spacing: 6, weight: 700 })
      : "",
  ].filter(Boolean).join("\n  "));
}
files["logo/horizontal-light.svg"] = horizontal({ dark: false });
files["logo/horizontal-dark.svg"] = horizontal({ dark: true });
files["logo/horizontal-tagline-light.svg"] = horizontal({ dark: false, tagline: true });

// Stacked lockup (square-ish; social profiles, print corners).
function stacked({ dark = false }) {
  const bg = dark ? `<rect width="880" height="760" fill="${C.estate}"/>` : "";
  return svg(880, 760, [
    bg,
    markAt(320, 80, 240, dark ? { tile: true, tileFill: C.forest } : { tile: true }),
    `<text x="440" y="500" font-family="${SERIF}" font-size="104" font-weight="600" text-anchor="middle" fill="${dark ? C.cream : C.ink}">Society<tspan fill="${dark ? C.leaf : C.estate}">Flats</tspan></text>`,
    text(440, 572, TAGLINE.toUpperCase(), { size: 26, fill: dark ? C.leaf : C.clayDeep, spacing: 5.5, weight: 700, anchor: "middle" }),
  ].filter(Boolean).join("\n  "));
}
files["logo/stacked-light.svg"] = stacked({ dark: false });
files["logo/stacked-dark.svg"] = stacked({ dark: true });

// ————— 2. Social media —————
// Shared decorative skyline strip (product motif) for banner right-edges.
function skylineStrip(x, y, scale, fill, windowFill) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="0.92">
    <rect x="0" y="72" width="52" height="150" rx="16" fill="${fill}"/>
    <rect x="62" y="24" width="52" height="198" rx="16" fill="${fill}"/>
    <rect x="124" y="96" width="52" height="126" rx="16" fill="${fill}"/>
    <rect x="186" y="48" width="52" height="174" rx="16" fill="${fill}"/>
    <rect x="77" y="44" width="22" height="22" rx="6" fill="${windowFill}"/>
  </g>`;
}

// OG / link-share image 1200×630 (also the default social card).
files["social/og-image.svg"] = svg(1200, 630, [
  `<rect width="1200" height="630" fill="${C.cream}"/>`,
  `<rect x="840" width="360" height="630" fill="${C.estate}"/>`,
  skylineStrip(880, 340, 1.15, C.cream, C.clay),
  markAt(72, 64, 120, { tile: true }),
  `<text x="72" y="308" font-family="${SERIF}" font-size="64" font-weight="600" fill="${C.ink}">Verified society homes</text>`,
  `<text x="72" y="386" font-family="${SERIF}" font-size="64" font-weight="600" fill="${C.estate}">in Gurgaon.</text>`,
  text(72, 470, "Society-first search · Admin-verified data · Real availability", { size: 26, fill: C.grey, weight: 600 }),
  text(72, 560, `${SITE}   ·   ${PHONE}`, { size: 28, fill: C.clayDeep, weight: 700 }),
].join("\n  "));

// Facebook page cover 1640×624 (safe area: centre 1310×624).
files["social/facebook-cover.svg"] = svg(1640, 624, [
  `<rect width="1640" height="624" fill="${C.estate}"/>`,
  skylineStrip(1390, 330, 1.0, C.forest, C.clay),
  markAt(190, 120, 128, { tile: true, tileFill: C.forest }),
  `<text x="352" y="212" font-family="${SERIF}" font-size="88" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>`,
  `<text x="192" y="356" font-family="${SERIF}" font-size="44" font-weight="500" fill="${C.cream}">Every home verified against its society. No fake inventory.</text>`,
  text(192, 436, `${SITE}  ·  ${PHONE}  ·  WhatsApp us for verified availability`, { size: 30, fill: C.leaf, weight: 600 }),
].join("\n  "));

// X / Twitter header 1500×500.
files["social/x-header.svg"] = svg(1500, 500, [
  `<rect width="1500" height="500" fill="${C.cream}"/>`,
  `<rect y="428" width="1500" height="72" fill="${C.estate}"/>`,
  skylineStrip(1200, 150, 1.15, C.estate, C.clay),
  markAt(96, 110, 120, { tile: true }),
  `<text x="252" y="196" font-family="${SERIF}" font-size="80" font-weight="600" fill="${C.ink}">Society<tspan fill="${C.estate}">Flats</tspan></text>`,
  text(98, 300, TAGLINE.toUpperCase(), { size: 30, fill: C.clayDeep, spacing: 6, weight: 700 }),
  text(96, 476, `${SITE}`, { size: 28, fill: C.cream, weight: 700 }),
].join("\n  "));

// LinkedIn company banner 1128×191 (tight safe area — keep it simple).
files["social/linkedin-company-banner.svg"] = svg(1128, 191, [
  `<rect width="1128" height="191" fill="${C.estate}"/>`,
  skylineStrip(920, 30, 0.72, C.forest, C.clay),
  markAt(48, 40, 110, { tile: true, tileFill: C.forest }),
  `<text x="186" y="112" font-family="${SERIF}" font-size="58" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>`,
  text(188, 156, TAGLINE, { size: 24, fill: C.leaf, weight: 600 }),
].join("\n  "));

// LinkedIn personal banner 1584×396 (founder profile).
files["social/linkedin-personal-banner.svg"] = svg(1584, 396, [
  `<rect width="1584" height="396" fill="${C.cream}"/>`,
  `<rect x="1130" width="454" height="396" fill="${C.estate}"/>`,
  skylineStrip(1190, 160, 1.15, C.cream, C.clay),
  markAt(90, 90, 108, { tile: true }),
  `<text x="232" y="168" font-family="${SERIF}" font-size="64" font-weight="600" fill="${C.ink}">Society<tspan fill="${C.estate}">Flats</tspan></text>`,
  `<text x="92" y="266" font-family="${SERIF}" font-size="34" font-weight="500" fill="${C.grey}">Building Gurgaon's society-first, verified rental &amp; resale marketplace.</text>`,
  text(92, 330, SITE, { size: 26, fill: C.clayDeep, weight: 700 }),
].join("\n  "));

// YouTube banner 2560×1440 — everything important inside the 1546×423 safe area.
files["social/youtube-banner.svg"] = svg(2560, 1440, [
  `<rect width="2560" height="1440" fill="${C.estate}"/>`,
  skylineStrip(180, 900, 2.4, C.forest, C.forest),
  skylineStrip(1900, 880, 2.4, C.forest, C.clay),
  markAt(1120, 430, 160, { tile: true, tileFill: C.forest }),
  `<text x="1280" y="700" font-family="${SERIF}" font-size="96" font-weight="600" text-anchor="middle" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>`,
  text(1280, 780, TAGLINE.toUpperCase(), { size: 30, fill: C.leaf, spacing: 6, weight: 700, anchor: "middle" }),
  text(1280, 850, SITE, { size: 30, fill: C.cream, weight: 600, anchor: "middle" }),
].join("\n  "));

// Instagram / WhatsApp profile picture 1000×1000.
files["social/profile-picture.svg"] = svg(1000, 1000, [
  `<rect width="1000" height="1000" fill="${C.estate}"/>`,
  markAt(244, 244, 512, { tile: false, towerFill: C.cream }),
].join("\n  "));

// Instagram post template 1080×1080 — photo zone + caption band, on-brand frame.
files["social/instagram-post-template.svg"] = svg(1080, 1080, [
  `<rect width="1080" height="1080" fill="${C.cream}"/>`,
  `<rect x="60" y="60" width="960" height="640" rx="36" fill="${C.sage}"/>`,
  text(540, 390, "PHOTO ZONE — drop society/property image here", { size: 30, fill: C.grey, anchor: "middle", weight: 600 }),
  `<text x="64" y="806" font-family="${SERIF}" font-size="58" font-weight="600" fill="${C.ink}">Headline goes here — one clear</text>`,
  `<text x="64" y="874" font-family="${SERIF}" font-size="58" font-weight="600" fill="${C.estate}">benefit, no hype.</text>`,
  `<rect x="60" y="932" width="430" height="76" rx="38" fill="${C.estate}"/>`,
  text(275, 981, "Check availability →", { size: 30, fill: C.cream, anchor: "middle", weight: 700 }),
  markAt(944, 936, 72, { tile: true }),
  text(64, 1048, `${SITE} · ${PHONE}`, { size: 24, fill: C.grey, weight: 600 }),
].join("\n  "));

// Instagram story template 1080×1920.
files["social/instagram-story-template.svg"] = svg(1080, 1920, [
  `<rect width="1080" height="1920" fill="${C.estate}"/>`,
  `<rect x="60" y="220" width="960" height="1060" rx="44" fill="${C.forest}"/>`,
  text(540, 760, "PHOTO / VIDEO ZONE", { size: 34, fill: C.leaf, anchor: "middle", weight: 700 }),
  markAt(60, 72, 96, { tile: true, tileFill: C.forest }),
  `<text x="184" y="138" font-family="${SERIF}" font-size="52" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>`,
  `<text x="72" y="1420" font-family="${SERIF}" font-size="66" font-weight="600" fill="${C.cream}">Two-line story headline</text>`,
  `<text x="72" y="1498" font-family="${SERIF}" font-size="66" font-weight="600" fill="${C.leaf}">with the key fact.</text>`,
  `<rect x="72" y="1580" width="500" height="88" rx="44" fill="${C.clay}"/>`,
  text(322, 1636, "WhatsApp us →", { size: 34, fill: C.white, anchor: "middle", weight: 700 }),
  text(72, 1800, `${SITE} · ${PHONE}`, { size: 30, fill: C.leaf, weight: 600 }),
].join("\n  "));

// ————— 3. Print (300dpi-equivalent px; 1in = 300px; includes 0.125in bleed) —————
// Business card 3.5×2in + bleed → 1125×675. Trim box: 37.5px inset.
files["print/business-card-front.svg"] = svg(1125, 675, [
  `<rect width="1125" height="675" fill="${C.cream}"/>`,
  markAt(85, 85, 150, { tile: true }),
  `<text x="272" y="188" font-family="${SERIF}" font-size="84" font-weight="600" fill="${C.ink}">Society<tspan fill="${C.estate}">Flats</tspan></text>`,
  text(88, 320, "NITIN WASSON", { size: 34, fill: C.ink, spacing: 4, weight: 800 }),
  text(88, 368, "Founder", { size: 28, fill: C.grey, weight: 600 }),
  text(88, 480, PHONE, { size: 32, fill: C.ink, weight: 700 }),
  text(88, 530, `hello@${SITE}`, { size: 30, fill: C.grey, weight: 600 }),
  text(88, 580, SITE, { size: 30, fill: C.clayDeep, weight: 700 }),
  skylineStrip(830, 400, 1.0, C.sage, C.clay),
].join("\n  "));

files["print/business-card-back.svg"] = svg(1125, 675, [
  `<rect width="1125" height="675" fill="${C.estate}"/>`,
  markAt(430, 155, 265, { tile: true, tileFill: C.forest }),
  text(562, 520, TAGLINE.toUpperCase(), { size: 30, fill: C.leaf, spacing: 5, weight: 700, anchor: "middle" }),
].join("\n  "));

// Letterhead A4 (2480×3508 @300dpi).
files["print/letterhead-a4.svg"] = svg(2480, 3508, [
  `<rect width="2480" height="3508" fill="${C.white}"/>`,
  `<rect width="2480" height="24" fill="${C.estate}"/>`,
  markAt(180, 140, 170, { tile: true }),
  `<text x="392" y="262" font-family="${SERIF}" font-size="96" font-weight="600" fill="${C.ink}">Society<tspan fill="${C.estate}">Flats</tspan></text>`,
  text(184, 356, TAGLINE.toUpperCase(), { size: 30, fill: C.clayDeep, spacing: 5, weight: 700 }),
  `<line x1="180" y1="420" x2="2300" y2="420" stroke="${C.sage}" stroke-width="3"/>`,
  text(180, 3330, `${SITE}   ·   ${PHONE}   ·   Gurugram, Haryana, India`, { size: 34, fill: C.grey, weight: 600 }),
  `<line x1="180" y1="3260" x2="2300" y2="3260" stroke="${C.sage}" stroke-width="3"/>`,
  skylineStrip(2020, 3300, 1.0, C.sage, C.clay),
].join("\n  "));

// A5 flyer (1748×2480 @300dpi) — society launch / expo handout.
files["print/flyer-a5.svg"] = svg(1748, 2480, [
  `<rect width="1748" height="2480" fill="${C.cream}"/>`,
  `<rect width="1748" height="880" fill="${C.estate}"/>`,
  markAt(140, 130, 150, { tile: true, tileFill: C.forest }),
  `<text x="330" y="238" font-family="${SERIF}" font-size="88" font-weight="600" fill="${C.cream}">Society<tspan fill="${C.leaf}">Flats</tspan></text>`,
  `<text x="144" y="470" font-family="${SERIF}" font-size="104" font-weight="600" fill="${C.cream}">Find the home by choosing</text>`,
  `<text x="144" y="590" font-family="${SERIF}" font-size="104" font-weight="600" fill="${C.leaf}">the society first.</text>`,
  text(146, 720, "Admin-verified societies · Real availability · No fake listings", { size: 40, fill: C.leaf, weight: 600 }),
  skylineStrip(1310, 620, 1.4, C.forest, C.clay),
  // body checklist
  ...[
    ["Verified society profiles", "Scores for connectivity, lifestyle, security — checked against published data."],
    ["Live verified homes", "Every listing reviewed against its society record before it goes live."],
    ["Compare before you visit", "3-way society comparisons with verified rent and resale ranges."],
    ["Human help on WhatsApp", "Real availability checks with owners and brokers — no spam."],
  ].flatMap((item, i) => [
    `<circle cx="190" cy="${1080 + i * 260}" r="16" fill="${C.clay}"/>`,
    `<text x="240" y="${1096 + i * 260}" font-family="${SERIF}" font-size="60" font-weight="600" fill="${C.ink}">${esc(item[0])}</text>`,
    text(240, `${1156 + i * 260}`, item[1], { size: 36, fill: C.grey, weight: 500 }),
  ]),
  `<rect x="140" y="2160" width="1468" height="180" rx="90" fill="${C.estate}"/>`,
  text(874, 2238, `${SITE}  ·  ${PHONE}`, { size: 48, fill: C.cream, anchor: "middle", weight: 700 }),
  text(874, 2300, "WhatsApp us for verified availability today", { size: 34, fill: C.leaf, anchor: "middle", weight: 600 }),
].join("\n  "));

// ————— 4. Brand guidelines page (inlines every SVG; open locally in Chrome) —————
function section(title, note, entries) {
  const cards = entries
    .map(
      ([file, label, maxW, dark]) =>
        `<figure class="asset${dark ? " dark" : ""}"><div class="art" style="max-width:${maxW || 520}px">${files[file].replace(/<svg /, '<svg style="width:100%;height:auto" ')}</div><figcaption><strong>${label}</strong><span>${file}</span></figcaption></figure>`,
    )
    .join("\n");
  return `<section><h2>${title}</h2><p class="note">${note}</p><div class="grid">${cards}</div></section>`;
}

const swatch = (hex, name, use) =>
  `<div class="swatch"><div class="chip" style="background:${hex}"></div><strong>${name}</strong><code>${hex}</code><span>${use}</span></div>`;

files["guidelines.html"] = `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SocietyFlats Brand Guidelines</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap');
*{margin:0;box-sizing:border-box}
body{font-family:'Hanken Grotesk',system-ui,sans-serif;background:${C.cream};color:${C.ink};padding:0 0 80px}
header{background:${C.estate};color:${C.cream};padding:64px 6vw 56px}
header h1{font-family:Newsreader,Georgia,serif;font-weight:600;font-size:clamp(34px,5vw,56px)}
header p{margin-top:10px;color:${C.leaf};font-size:17px;max-width:640px}
main{padding:0 6vw}
section{margin-top:56px}
h2{font-family:Newsreader,Georgia,serif;font-weight:600;font-size:30px}
.note{margin:8px 0 20px;color:${C.grey};max-width:720px;line-height:1.55}
.grid{display:flex;flex-wrap:wrap;gap:24px}
.asset{background:#fff;border:1px solid ${C.sage};border-radius:20px;padding:20px;flex:1 1 320px;max-width:640px}
.asset.dark{background:${C.forest}}
.asset .art{margin:0 auto}
figcaption{display:flex;justify-content:space-between;gap:12px;margin-top:14px;font-size:13.5px}
.asset.dark figcaption{color:${C.cream}}
figcaption span{color:${C.grey};font-family:ui-monospace,monospace;font-size:12px}
.swatches{display:flex;flex-wrap:wrap;gap:18px}
.swatch{background:#fff;border:1px solid ${C.sage};border-radius:16px;padding:14px;width:190px;font-size:13.5px;display:grid;gap:4px}
.chip{height:74px;border-radius:10px;border:1px solid rgba(0,0,0,.06)}
.swatch code{color:${C.grey}}
.swatch span{color:${C.grey};line-height:1.4}
.rules{columns:2;gap:36px;max-width:1000px;color:${C.ink};line-height:1.65;font-size:15px}
.rules li{break-inside:avoid;margin-bottom:10px}
.type-card{background:#fff;border:1px solid ${C.sage};border-radius:20px;padding:26px;max-width:760px}
.type-card .serif{font-family:Newsreader,Georgia,serif;font-size:40px;font-weight:600}
.type-card .sans{font-size:17px;margin-top:10px;color:${C.grey}}
</style></head><body>
<header><h1>SocietyFlats — Brand Guidelines</h1><p>${TAGLINE}. Premium, verified, product-first. Every asset on this page is generated from <code>brand-kit/generate.mjs</code> — change the tokens, regenerate, and the whole kit stays consistent.</p></header>
<main>
<section><h2>Colour</h2><p class="note">Deep Estate Green carries trust and premium calm; Cream is the canvas; Clay is reserved for the single accent — the verified flat, the CTA, never decoration everywhere. Never place Clay text on Estate Green.</p>
<div class="swatches">
${swatch(C.estate, "Estate Green", "Primary. Tiles, headers, CTAs.")}
${swatch(C.forest, "Forest", "Hover states, panels on green.")}
${swatch(C.ink, "Ink", "Headlines and body text.")}
${swatch(C.cream, "Cream", "Background canvas everywhere.")}
${swatch(C.clay, "Clay", "The accent. One per layout.")}
${swatch(C.clayDeep, "Deep Clay", "Clay text on cream.")}
${swatch(C.leaf, "Leaf", "Success tints, text on green.")}
${swatch(C.sage, "Sage", "Hairlines and card borders.")}
</div></section>
<section><h2>Typography</h2><p class="note">Newsreader (serif) for display and headlines — editorial, premium, human. Hanken Grotesk for UI, labels and body. Both are free Google Fonts (OFL licence) — install them before producing print files.</p>
<div class="type-card"><div class="serif">Find the home by choosing the society first.</div><div class="sans">Hanken Grotesk carries the interface: labels, buttons, numbers, captions — 400/600/700/800. Uppercase labels get +5% letter-spacing.</div></div></section>
${section("The mark", "Three towers on an Estate Green tile; the single clay window is the verified flat you find. Clear space: keep a margin of half the tile's width on all sides. Never recolour, outline, rotate or add effects.", [["logo/mark-tile.svg", "Primary mark (tile)", 240], ["logo/mark-green.svg", "Mark on cream", 240], ["logo/mark-mono-black.svg", "Mono black", 200], ["logo/mark-mono-white.svg", "Mono white — dark surfaces only", 200, true]])}
${section("Lockups", "Horizontal is the default. Stacked for square placements (profiles, stamps). Use the dark variants only on Estate Green or photography dark enough to hold cream text.", [["logo/horizontal-light.svg", "Horizontal — light", 640], ["logo/horizontal-tagline-light.svg", "Horizontal + tagline", 640], ["logo/horizontal-dark.svg", "Horizontal — dark", 640], ["logo/stacked-light.svg", "Stacked — light", 420], ["logo/stacked-dark.svg", "Stacked — dark", 420]])}
${section("Social", "Sized to each platform's current spec with safe areas respected. Photo/video zones are placeholders — drop real society photography (verified societies only) and keep one clay CTA per layout.", [["social/og-image.svg", "Link share / OG · 1200×630", 640], ["social/facebook-cover.svg", "Facebook cover · 1640×624", 640], ["social/x-header.svg", "X header · 1500×500", 640], ["social/linkedin-company-banner.svg", "LinkedIn company · 1128×191", 640], ["social/linkedin-personal-banner.svg", "LinkedIn founder · 1584×396", 640], ["social/youtube-banner.svg", "YouTube · 2560×1440 (safe centre)", 640], ["social/profile-picture.svg", "Profile picture · 1000×1000", 300], ["social/instagram-post-template.svg", "Instagram post template · 1080", 460], ["social/instagram-story-template.svg", "Instagram story template · 1080×1920", 340]])}
${section("Print", "Built at 300dpi equivalents. Business card includes 0.125in bleed on every edge — give printers the SVG/PDF export and this page. Print in CMYK: Estate Green ≈ C85 M45 Y70 K45, Clay ≈ C15 M55 Y80 K5.", [["print/business-card-front.svg", "Business card — front · 3.5×2in + bleed", 560], ["print/business-card-back.svg", "Business card — back", 560], ["print/letterhead-a4.svg", "Letterhead · A4", 460], ["print/flyer-a5.svg", "Flyer · A5", 420]])}
<section><h2>Rules</h2><ul class="rules">
<li><strong>Voice:</strong> a knowledgeable local friend — warm, specific, honest. No hype, no exclamation marks, no "luxury living at its finest".</li>
<li><strong>Claims:</strong> only verified data. "Admin-verified" and "no fake inventory" are the brand promise — never dilute them with unverifiable claims.</li>
<li><strong>One clay accent per layout</strong> — the CTA or the key fact. If everything is clay, nothing is.</li>
<li><strong>Photography:</strong> real societies, daylight, uncluttered. Never stock towers that aren't ours to show.</li>
<li><strong>Minimum mark size:</strong> 24px digital / 8mm print. Below that, use the tile mark alone, never the lockups.</li>
<li><strong>Backgrounds:</strong> cream or white for light layouts; Estate Green for dark. Never place the mark on busy photography without the tile.</li>
<li><strong>Don't:</strong> stretch, recolour, outline, shadow, rotate, or pair with other marks without clear space.</li>
<li><strong>Contact block:</strong> ${SITE} · ${PHONE} — always in this order, always current.</li>
</ul></section>
</main></body></html>`;

// ————— write everything —————
for (const [rel, content] of Object.entries(files)) {
  const out = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, content, "utf8");
}
console.log(`Brand kit: ${Object.keys(files).length} SVG assets written under brand-kit/.`);
