// Social post artwork, painted on a canvas.
//
// Canvas (rather than SVG-in-an-<img>) is deliberate: an <img> holding SVG is an
// isolated document, so it can't see the page's webfont and silently falls back
// to a system face. Painting directly means the preview and the downloaded PNG
// come out of the same code path, in the real brand typeface.

export const ART = {
  ink: "#1D1D1F",
  canvas: "#FFFFFF",
  surface: "#F5F5F7",
  green: "#0F7B63",
  greenDark: "#3BAE93",
  line: "#E4E4E9",
  muted: "#6E6E73",
  faint: "#86868B",
  onDark: "#C7C7CD",
  panelDark: "#252528",
  warm: "#EDEAE6",
  warmDeep: "#D8D5D0",
  sky: "#E7EEF0",
  skyDusk: "#243244",
};

export type SceneKey =
  | "interior" | "interiorDusk" | "facade" | "scores" | "checklist"
  | "keys" | "floorplan" | "mapPin" | "compare" | "balcony";
export type FormatKey = "post" | "story" | "cover";

export const FORMATS: Record<FormatKey, { w: number; h: number; label: string; note: string }> = {
  post: { w: 1080, h: 1080, label: "Square post", note: "Instagram / Facebook feed · 1080×1080" },
  story: { w: 1080, h: 1920, label: "Story / Reel", note: "Instagram / WhatsApp status · 1080×1920" },
  cover: { w: 1640, h: 624, label: "Facebook cover", note: "Page cover · 1640×624" },
};

export const SCENES: { key: SceneKey; label: string; dark: boolean }[] = [
  { key: "interior", label: "Living room (day)", dark: false },
  { key: "interiorDusk", label: "Living room (dusk)", dark: true },
  { key: "facade", label: "Society facade", dark: true },
  { key: "scores", label: "Score bars", dark: false },
  { key: "checklist", label: "Verified checklist", dark: false },
  { key: "keys", label: "Keys / handover", dark: false },
  { key: "floorplan", label: "Floor plan", dark: false },
  { key: "mapPin", label: "Location pin", dark: true },
  { key: "compare", label: "Side-by-side compare", dark: false },
  { key: "balcony", label: "Balcony view (dusk)", dark: true },
];

export type LayoutKey = "standard" | "bigStat" | "quote";

export const LAYOUTS: { key: LayoutKey; label: string; hint: string }[] = [
  { key: "standard", label: "Headline + art", hint: "The everyday post." },
  { key: "bigStat", label: "Big number", hint: "One figure, stated plainly." },
  { key: "quote", label: "Quote / claim", hint: "A single sentence, no artwork." },
];

export type PostSpec = {
  format: FormatKey;
  layout?: LayoutKey;
  stat?: string;
  statNote?: string;
  scene: SceneKey;
  kicker: string;
  line1: string;
  line2: string;
  cta: string;
  site: string;
  phone: string;
};

const FONT = `"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif`;

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

function fillRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 700, spacing = 0) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  // letterSpacing is well supported in current Chrome/Safari; harmless where it isn't.
  (ctx as unknown as { letterSpacing?: string }).letterSpacing = spacing ? `${spacing}px` : "0px";
}

// ————— the brand mark, painted small (nav/footer sizes) —————
function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tileFill = ART.ink) {
  const s = size / 512;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  fillRR(ctx, 0, 0, 512, 512, 118, tileFill);
  const cells: [number, number, number, number, string][] = [
    [110, 110, 76, 76, "#FFFFFF"], [218, 110, 76, 76, "#FFFFFF"], [326, 110, 76, 76, "#FFFFFF"],
    [110, 218, 76, 76, "#FFFFFF"], [218, 218, 76, 76, "#FFFFFF"], [326, 218, 76, 76, ART.green],
    [110, 326, 76, 76, "#FFFFFF"], [218, 326, 76, 110, "#FFFFFF"], [326, 326, 76, 76, "#FFFFFF"],
  ];
  for (const [cx, cy, cw, ch, fill] of cells) fillRR(ctx, cx, cy, cw, ch, 20, fill);
  ctx.restore();
}

// ————— scenes (drawn on an 800×600 grid, then scaled into the card) —————
function sceneInterior(ctx: CanvasRenderingContext2D, dusk: boolean) {
  const wall = dusk ? ART.panelDark : ART.warm;
  const floor = dusk ? "#1A1A1D" : ART.warmDeep;
  const glass = dusk ? ART.skyDusk : ART.sky;
  const ink = dusk ? "#FFFFFF" : ART.ink;

  ctx.fillStyle = wall; ctx.fillRect(0, 0, 800, 600);
  ctx.fillStyle = floor; ctx.fillRect(0, 470, 800, 130);

  // arch window
  const arch = () => {
    ctx.beginPath();
    ctx.moveTo(250, 470);
    ctx.lineTo(250, 250);
    ctx.arc(400, 250, 150, Math.PI, 0);
    ctx.lineTo(550, 470);
    ctx.closePath();
  };
  arch(); ctx.fillStyle = glass; ctx.fill();
  // distant towers
  fillRR(ctx, 300, 360, 46, 110, 6, dusk ? "#33333A" : "#CBD8DC");
  fillRR(ctx, 360, 320, 58, 150, 6, dusk ? "#2C2C33" : "#BFCED4");
  fillRR(ctx, 432, 386, 42, 84, 6, dusk ? "#33333A" : "#CBD8DC");
  if (dusk) fillRR(ctx, 374, 344, 14, 14, 4, ART.greenDark);
  arch(); ctx.strokeStyle = ink; ctx.lineWidth = 12; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(400, 106); ctx.lineTo(400, 470); ctx.lineWidth = 8; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(252, 300); ctx.lineTo(548, 300); ctx.stroke();

  // sofa
  fillRR(ctx, 150, 392, 330, 86, 26, ART.green);
  fillRR(ctx, 168, 356, 140, 58, 20, dusk ? "#12604D" : "#12735E");
  fillRR(ctx, 322, 356, 140, 58, 20, dusk ? "#12604D" : "#12735E");
  fillRR(ctx, 176, 470, 18, 26, 6, ink);
  fillRR(ctx, 436, 470, 18, 26, 6, ink);

  // floor lamp
  fillRR(ctx, 600, 300, 10, 182, 5, ink);
  ctx.beginPath(); ctx.moveTo(566, 300); ctx.lineTo(644, 300); ctx.lineTo(624, 244); ctx.lineTo(586, 244);
  ctx.closePath(); ctx.fillStyle = dusk ? ART.greenDark : ART.ink; ctx.fill();
  fillRR(ctx, 576, 478, 58, 12, 6, ink);

  // plant
  ctx.strokeStyle = ART.green; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(704, 470); ctx.lineTo(704, 386); ctx.stroke();
  const leaf = (dx: number, fill: string) => {
    ctx.beginPath();
    ctx.moveTo(704, 402);
    ctx.bezierCurveTo(704 + dx * 0.5, 396, 704 + dx * 0.75, 372, 704 + dx, 344);
    ctx.bezierCurveTo(704 + dx * 0.55, 348, 704, 370, 704, 402);
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  };
  leaf(-54, ART.green); leaf(54, dusk ? "#147A62" : "#15866C");
  ctx.beginPath();
  ctx.moveTo(704, 372); ctx.bezierCurveTo(684, 350, 684, 322, 700, 300);
  ctx.bezierCurveTo(720, 320, 722, 350, 704, 372);
  ctx.closePath(); ctx.fillStyle = dusk ? "#169176" : "#12735E"; ctx.fill();
  ctx.beginPath(); ctx.moveTo(684, 470); ctx.lineTo(728, 470); ctx.lineTo(720, 514); ctx.lineTo(692, 514);
  ctx.closePath(); ctx.fillStyle = dusk ? "#33333A" : "#C6C2BB"; ctx.fill();

  // rug
  ctx.beginPath(); ctx.ellipse(330, 516, 210, 26, 0, 0, Math.PI * 2);
  ctx.fillStyle = dusk ? "#232326" : "#E3DFD8"; ctx.fill();
}

function sceneFacade(ctx: CanvasRenderingContext2D) {
  const rows = 5, cols = 4, cw = 150, ch = 96, gap = 18, pad = 26;
  const w = pad * 2 + cols * cw + (cols - 1) * gap;
  const h = pad * 2 + rows * ch + (rows - 1) * gap;
  const sx = 800 / w, sy = 600 / h;
  ctx.save();
  ctx.scale(sx, sy);
  fillRR(ctx, 0, 0, w, h, 26, "#232328");
  const lit = new Set(["0-1", "1-3", "2-0", "4-2"]);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r}-${c}`;
      const X = pad + c * (cw + gap), Y = pad + r * (ch + gap);
      const fill = key === "3-2" ? ART.green : lit.has(key) ? "#FFFFFF" : "#3A3A42";
      fillRR(ctx, X, Y, cw, ch, 14, fill);
      fillRR(ctx, X - 6, Y + ch - 26, cw + 12, 12, 6, "#33333A");
    }
  }
  ctx.restore();
}

function sceneScores(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = ART.surface; ctx.fillRect(0, 0, 800, 600);
  const rowsData: [string, number][] = [["Safety", 0.92], ["Commute", 0.78], ["Lifestyle", 0.86], ["Upkeep", 0.7]];
  rowsData.forEach(([label, pct], i) => {
    const y = 120 + i * 112;
    setFont(ctx, 30, 700);
    ctx.fillStyle = ART.ink; ctx.textAlign = "left";
    ctx.fillText(label, 70, y + 10);
    fillRR(ctx, 290, y - 12, 440, 26, 13, "#E1E1E6");
    fillRR(ctx, 290, y - 12, Math.round(440 * pct), 26, 13, ART.green);
  });
}

function sceneChecklist(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = ART.surface; ctx.fillRect(0, 0, 800, 600);
  const items = ["RERA registration checked", "Possession status confirmed", "Real photos, not stock", "Price sanity-checked"];
  items.forEach((item, i) => {
    const y = 120 + i * 112;
    ctx.beginPath(); ctx.arc(102, y - 2, 26, 0, Math.PI * 2);
    ctx.fillStyle = ART.green; ctx.fill();
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(90, y - 2); ctx.lineTo(99, y + 7); ctx.lineTo(115, y - 11); ctx.stroke();
    setFont(ctx, 29, 600);
    ctx.fillStyle = ART.ink; ctx.textAlign = "left";
    ctx.fillText(item, 152, y + 8);
  });
}

function sceneKeys(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = ART.warm; ctx.fillRect(0, 0, 800, 600);
  // an open door with a key handed through it
  fillRR(ctx, 210, 120, 300, 400, 18, "#FFFFFF");
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 12;
  rr(ctx, 210, 120, 300, 400, 18); ctx.stroke();
  ctx.beginPath(); ctx.arc(468, 330, 13, 0, Math.PI * 2); ctx.fillStyle = ART.ink; ctx.fill();
  // key
  ctx.save(); ctx.translate(560, 300); ctx.rotate(-0.35);
  ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.strokeStyle = ART.green; ctx.lineWidth = 20; ctx.stroke();
  fillRR(ctx, 40, -10, 170, 20, 10, ART.green);
  fillRR(ctx, 170, 8, 18, 34, 8, ART.green);
  fillRR(ctx, 134, 8, 18, 28, 8, ART.green);
  ctx.restore();
}

function sceneFloorplan(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = ART.surface; ctx.fillRect(0, 0, 800, 600);
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 10; ctx.lineJoin = "round";
  rr(ctx, 120, 90, 560, 420, 12); ctx.stroke();
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(400, 90); ctx.lineTo(400, 330); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(120, 330); ctx.lineTo(680, 330); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(560, 330); ctx.lineTo(560, 510); ctx.stroke();
  // the "chosen" room
  fillRR(ctx, 410, 100, 260, 220, 8, "#ECF6F2");
  ctx.strokeStyle = ART.green; ctx.lineWidth = 7;
  rr(ctx, 410, 100, 260, 220, 8); ctx.stroke();
  setFont(ctx, 26, 700); ctx.fillStyle = ART.green; ctx.textAlign = "center";
  ctx.fillText("3 BHK", 540, 220);
  ctx.textAlign = "left";
  // door swings
  ctx.strokeStyle = ART.faint; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(400, 330, 46, Math.PI, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(120, 240, 46, -Math.PI / 2, 0); ctx.stroke();
}

function sceneMapPin(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#232328"; ctx.fillRect(0, 0, 800, 600);
  // road grid
  ctx.strokeStyle = "#33333A"; ctx.lineWidth = 14;
  for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 150); ctx.lineTo(800, i * 150); ctx.stroke(); }
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * 160, 0); ctx.lineTo(i * 160, 600); ctx.stroke(); }
  // blocks
  const blocks: [number, number][] = [[60, 60], [420, 60], [60, 380], [580, 380]];
  for (const [x, y] of blocks) fillRR(ctx, x, y, 130, 90, 12, "#2B2B31");
  // pin
  ctx.save(); ctx.translate(400, 250);
  ctx.beginPath();
  ctx.moveTo(0, 130);
  ctx.bezierCurveTo(-96, 26, -74, -70, 0, -70);
  ctx.bezierCurveTo(74, -70, 96, 26, 0, 130);
  ctx.closePath(); ctx.fillStyle = ART.green; ctx.fill();
  ctx.beginPath(); ctx.arc(0, -6, 30, 0, Math.PI * 2); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(400, 400, 86, 18, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(15,123,99,.25)"; ctx.fill();
}

function sceneCompare(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = ART.surface; ctx.fillRect(0, 0, 800, 600);
  const card = (x: number, pct: number, winner: boolean) => {
    fillRR(ctx, x, 90, 300, 420, 22, "#FFFFFF");
    if (winner) { ctx.strokeStyle = ART.green; ctx.lineWidth = 7; rr(ctx, x, 90, 300, 420, 22); ctx.stroke(); }
    fillRR(ctx, x + 30, 130, 240, 96, 14, winner ? "#ECF6F2" : "#EFEFF2");
    for (let i = 0; i < 3; i++) {
      const y = 268 + i * 62;
      fillRR(ctx, x + 30, y, 240, 18, 9, "#E6E6EB");
      fillRR(ctx, x + 30, y, Math.round(240 * (pct - i * 0.08)), 18, 9, winner ? ART.green : "#B9B9C0");
    }
    fillRR(ctx, x + 30, 452, 130, 24, 12, winner ? ART.green : "#D8D8DE");
  };
  card(70, 0.9, true);
  card(430, 0.62, false);
  // vs
  ctx.beginPath(); ctx.arc(400, 300, 40, 0, Math.PI * 2);
  ctx.fillStyle = ART.ink; ctx.fill();
  setFont(ctx, 26, 800); ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center";
  ctx.fillText("vs", 400, 310); ctx.textAlign = "left";
}

function sceneBalcony(ctx: CanvasRenderingContext2D) {
  // dusk sky
  const g = ctx.createLinearGradient(0, 0, 0, 600);
  g.addColorStop(0, "#1B2436"); g.addColorStop(1, "#3A4152");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 600);
  // skyline
  const towers: [number, number, number][] = [[60, 300, 90], [170, 360, 70], [260, 250, 110], [390, 330, 80], [500, 280, 96], [620, 350, 74], [710, 300, 84]];
  towers.forEach(([x, y, w], i) => {
    fillRR(ctx, x, y, w, 600 - y, 8, "#252B39");
    for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) {
      const wx = x + 14 + c * (w / 2), wy = y + 24 + r * 42;
      if (wy > 560) continue;
      const lit = (i + r + c) % 5 === 0;
      fillRR(ctx, wx, wy, 16, 20, 4, lit ? "#FFFFFF" : "#1D2331");
    }
  });
  fillRR(ctx, 356, 296, 18, 22, 4, ART.greenDark);
  // railing
  ctx.strokeStyle = ART.ink; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(0, 470); ctx.lineTo(800, 470); ctx.stroke();
  for (let x = 40; x < 800; x += 62) { ctx.beginPath(); ctx.moveTo(x, 470); ctx.lineTo(x, 600); ctx.lineWidth = 9; ctx.stroke(); }
  ctx.fillStyle = "#1A1A1D"; ctx.fillRect(0, 566, 800, 34);
}

function paintScene(ctx: CanvasRenderingContext2D, scene: SceneKey, x: number, y: number, w: number, h: number, r: number) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  // Scenes are authored on an 800×600 grid; cover the card like a photo crop.
  const s = Math.max(w / 800, h / 600);
  ctx.translate(x + (w - 800 * s) / 2, y + (h - 600 * s) / 2);
  ctx.scale(s, s);
  if (scene === "interior") sceneInterior(ctx, false);
  else if (scene === "interiorDusk") sceneInterior(ctx, true);
  else if (scene === "facade") sceneFacade(ctx);
  else if (scene === "scores") sceneScores(ctx);
  else if (scene === "keys") sceneKeys(ctx);
  else if (scene === "floorplan") sceneFloorplan(ctx);
  else if (scene === "mapPin") sceneMapPin(ctx);
  else if (scene === "compare") sceneCompare(ctx);
  else if (scene === "balcony") sceneBalcony(ctx);
  else sceneChecklist(ctx);
  ctx.restore();
}

export function isDarkScene(scene: SceneKey) {
  return scene === "interiorDusk" || scene === "facade" || scene === "mapPin" || scene === "balcony";
}

// ————— compose a finished post —————
export function drawPost(ctx: CanvasRenderingContext2D, spec: PostSpec) {
  const { w, h } = FORMATS[spec.format];
  const dark = isDarkScene(spec.scene);
  const bg = dark ? ART.ink : ART.canvas;
  const ink = dark ? "#FFFFFF" : ART.ink;
  const sub = dark ? ART.onDark : ART.muted;
  const accent = dark ? ART.greenDark : ART.green;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "alphabetic";

  if (spec.format === "cover") {
    paintScene(ctx, spec.scene, 1080, 40, 520, 544, 28);
    drawMark(ctx, 120, 60, 84, dark ? ART.panelDark : ART.ink);
    setFont(ctx, 54, 700, -1.3); ctx.textAlign = "left";
    ctx.fillStyle = ink; ctx.fillText("Society", 230, 126);
    const sw = ctx.measureText("Society").width;
    ctx.fillStyle = accent; ctx.fillText("Flats", 230 + sw, 126);
    setFont(ctx, 70, 700, -2);
    ctx.fillStyle = ink; ctx.fillText(spec.line1, 120, 300);
    ctx.fillStyle = accent; ctx.fillText(spec.line2, 120, 384);
    setFont(ctx, 26, 600, 0);
    ctx.fillStyle = sub; ctx.fillText(spec.kicker, 122, 450);
    setFont(ctx, 26, 700, 0);
    ctx.fillStyle = ink; ctx.fillText(`${spec.site}  ·  ${spec.phone}`, 122, 498);
    return;
  }

  if (spec.format === "story") {
    drawMark(ctx, 72, 84, 88, dark ? ART.panelDark : ART.ink);
    setFont(ctx, 52, 700, -1.2); ctx.textAlign = "left";
    ctx.fillStyle = ink; ctx.fillText("Society", 188, 150);
    const sw = ctx.measureText("Society").width;
    ctx.fillStyle = accent; ctx.fillText("Flats", 188 + sw, 150);

    fillRR(ctx, 72, 300, 936, 900, 34, dark ? ART.panelDark : ART.surface);
    paintScene(ctx, spec.scene, 72, 300, 936, 900, 34);

    setFont(ctx, 28, 800, 5);
    ctx.fillStyle = accent; ctx.fillText(spec.kicker.toUpperCase(), 96, 1330);
    setFont(ctx, 74, 700, -2);
    ctx.fillStyle = ink;
    ctx.fillText(spec.line1, 96, 1440);
    ctx.fillText(spec.line2, 96, 1530);
    fillRR(ctx, 96, 1602, 470, 96, 48, accent);
    setFont(ctx, 33, 800, 0); ctx.textAlign = "center";
    ctx.fillStyle = dark ? ART.ink : "#FFFFFF";
    ctx.fillText(spec.cta, 331, 1663);
    ctx.textAlign = "left";
    setFont(ctx, 29, 600, 0);
    ctx.fillStyle = sub; ctx.fillText(`${spec.site} · ${spec.phone}`, 96, 1810);
    return;
  }

  // square post — three layouts share the same footer furniture
  const layout = spec.layout || "standard";

  if (layout === "quote") {
    // Type only. A single claim, given the whole canvas.
    setFont(ctx, 26, 800, 5); ctx.textAlign = "left";
    ctx.fillStyle = accent; ctx.fillText(spec.kicker.toUpperCase(), 72, 150);
    setFont(ctx, 96, 700, -3);
    ctx.fillStyle = ink;
    ctx.fillText(spec.line1, 72, 470);
    ctx.fillText(spec.line2, 72, 586);
    fillRR(ctx, 72, 660, 120, 8, 4, accent);
  } else if (layout === "bigStat") {
    fillRR(ctx, 72, 150, 936, 590, 30, dark ? ART.panelDark : ART.surface);
    setFont(ctx, 250, 700, -10); ctx.textAlign = "center";
    ctx.fillStyle = accent;
    ctx.fillText(spec.stat || "246", 540, 470);
    setFont(ctx, 34, 600, 0);
    ctx.fillStyle = dark ? ART.onDark : ART.muted;
    ctx.fillText(spec.statNote || "verified societies", 540, 546);
    ctx.textAlign = "left";
    setFont(ctx, 26, 800, 5);
    ctx.fillStyle = accent; ctx.fillText(spec.kicker.toUpperCase(), 72, 118);
    setFont(ctx, 62, 700, -1.6);
    ctx.fillStyle = ink;
    ctx.fillText(spec.line1, 72, 806);
    ctx.fillText(spec.line2, 72, 882);
    fillRR(ctx, 72, 930, 392, 76, 38, accent);
    setFont(ctx, 27, 800, 0); ctx.textAlign = "center";
    ctx.fillStyle = dark ? ART.ink : "#FFFFFF";
    ctx.fillText(spec.cta, 268, 979);
    ctx.textAlign = "left";
    drawMark(ctx, 936, 934, 72, dark ? ART.panelDark : ART.ink);
    setFont(ctx, 23, 600, 0);
    ctx.fillStyle = sub; ctx.fillText(`${spec.site} · ${spec.phone}`, 72, 1044);
    return;
  } else {
    fillRR(ctx, 72, 150, 936, 590, 30, dark ? ART.panelDark : ART.surface);
    paintScene(ctx, spec.scene, 72, 150, 936, 590, 30);
  }

  if (layout !== "quote") {
    setFont(ctx, 26, 800, 5); ctx.textAlign = "left";
    ctx.fillStyle = accent; ctx.fillText(spec.kicker.toUpperCase(), 72, 118);
    setFont(ctx, 62, 700, -1.6);
    ctx.fillStyle = ink;
    ctx.fillText(spec.line1, 72, 806);
    ctx.fillText(spec.line2, 72, 882);
  }

  fillRR(ctx, 72, 930, 392, 76, 38, accent);
  setFont(ctx, 27, 800, 0); ctx.textAlign = "center";
  ctx.fillStyle = dark ? ART.ink : "#FFFFFF";
  ctx.fillText(spec.cta, 268, 979);

  ctx.textAlign = "left";
  drawMark(ctx, 936, 934, 72, dark ? ART.panelDark : ART.ink);
  setFont(ctx, 23, 600, 0);
  ctx.fillStyle = sub; ctx.fillText(`${spec.site} · ${spec.phone}`, 72, 1044);
}

// Render at full size to an offscreen canvas and hand back a PNG blob.
export async function renderPostBlob(spec: PostSpec): Promise<Blob> {
  const { w, h } = FORMATS[spec.format];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable in this browser.");
  if (document.fonts?.ready) await document.fonts.ready;
  drawPost(ctx, spec);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not render the image."))), "image/png");
  });
}
