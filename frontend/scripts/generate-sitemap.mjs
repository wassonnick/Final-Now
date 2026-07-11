import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.societyflats.com";
const API_BASE = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || "https://final-now.onrender.com/api";
const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");
const MIN_PUBLIC_SOCIETIES = Number.parseInt(process.env.SITEMAP_MIN_PUBLIC_SOCIETIES || "20", 10);

const staticRoutes = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/gurgaon", priority: "0.95", changefreq: "daily" },
  { loc: "/search", priority: "0.9", changefreq: "daily" },
  { loc: "/societies", priority: "0.9", changefreq: "daily" },
  { loc: "/properties", priority: "0.9", changefreq: "daily" },
  { loc: "/gurgaon/societies", priority: "0.9", changefreq: "daily" },
  { loc: "/gurgaon/properties", priority: "0.9", changefreq: "daily" },
  { loc: "/sell", priority: "0.7", changefreq: "weekly" },
  { loc: "/ai-advisor", priority: "0.6", changefreq: "weekly" },
  { loc: "/broker-crm", priority: "0.6", changefreq: "weekly" },
  { loc: "/recommendations", priority: "0.6", changefreq: "weekly" },
  { loc: "/nri-services", priority: "0.6", changefreq: "weekly" },
  { loc: "/insights", priority: "0.5", changefreq: "weekly" },
  { loc: "/chat", priority: "0.6", changefreq: "weekly" },
  { loc: "/investment-calculator", priority: "0.65", changefreq: "weekly" },
  { loc: "/builder-floors", priority: "0.7", changefreq: "weekly" },
  { loc: "/builder-portal", priority: "0.5", changefreq: "monthly" },
  { loc: "/trust", priority: "0.5", changefreq: "monthly" },
  { loc: "/privacy", priority: "0.4", changefreq: "monthly" },
  { loc: "/help", priority: "0.5", changefreq: "monthly" },
];

const preferredLocalityRoutes = [
  "/gurgaon/sector-56",
  "/gurgaon/sector-65",
  "/gurgaon/sector-66",
  "/gurgaon/sector-67",
  "/gurgaon/sector-70",
  "/gurgaon/sector-102",
  "/gurgaon/golf-course-road",
  "/gurgaon/golf-course-extension-road",
  "/gurgaon/dwarka-expressway",
  "/gurgaon/sohna-road",
];

const preferredBuilderRoutes = [
  "/builder/dlf",
  "/builder/m3m",
  "/builder/emaar",
  "/builder/ats",
  "/builder/godrej",
  "/builder/adani",
  "/builder/tulip",
  "/builder/alpha-corp",
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function toAbsoluteUrl(route) {
  if (/^https?:\/\//i.test(route)) return route.replace(/\/$/, "");
  const clean = route === "/" ? "" : route.replace(/\/$/, "");
  return `${SITE_URL}${clean}`;
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.societies)) return payload.societies;
  if (Array.isArray(payload?.properties)) return payload.properties;
  return [];
}

async function fetchRows(endpoint) {
  const urls = [
    `${API_BASE}${endpoint}?per_page=200`,
    `${API_BASE}${endpoint}?limit=200`,
    `${API_BASE}${endpoint}`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) continue;

      const payload = await response.json();
      const rows = extractRows(payload);

      return { rows, reachedApi: true };
    } catch {
      // Try the next compatible query shape before preserving the last healthy sitemap.
    }
  }

  return { rows: [], reachedApi: false };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Frontend and backend redeploy simultaneously on every push, so the API is frequently
// mid-restart at exactly the moment this build script runs — a single instant attempt
// meant the sitemap kept preserving a stale file build after build. Retry with backoff
// to ride out the deploy race (warm path costs nothing extra).
async function fetchRowsWithRetry(endpoint, attempts = 4, delayMs = 20000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = await fetchRows(endpoint);
    if (result.reachedApi) return result;
    if (attempt < attempts) {
      console.warn(
        `Sitemap: API unreachable for ${endpoint} (attempt ${attempt}/${attempts}) — retrying in ${delayMs / 1000}s.`,
      );
      await sleep(delayMs);
    }
  }

  return { rows: [], reachedApi: false };
}

function countDetailUrls(xml, segment) {
  return (String(xml).match(new RegExp(`<loc>${SITE_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/${segment}/`, "g")) || []).length;
}

function uniqueRoutes(routes) {
  const seen = new Set();

  return routes.filter((route) => {
    const loc = toAbsoluteUrl(route.loc);
    if (seen.has(loc)) return false;
    seen.add(loc);
    return true;
  });
}

function isPublicSociety(society) {
  return ["Verified", "Premium"].includes(String(society?.status || ""));
}

function isHighQualityProperty(property) {
  const slug = String(property?.slug || "").toLowerCase();
  const title = String(property?.title || "").toLowerCase();
  const status = String(property?.status || "");

  if (status && status !== "Live") return false;
  if (!slug || !title) return false;

  const blockedPatterns = [
    /owner-lead/,
    /test/,
    /dummy/,
    /sample/,
    /lead-\d+/,
    /\d{10,}$/,
    /^\d+-?bhk-?flat$/,
    /^flat$/,
    /^property$/,
  ];

  if (blockedPatterns.some((pattern) => pattern.test(slug) || pattern.test(title))) {
    return false;
  }

  const hasContext = Boolean(
    property?.society ||
    property?.society?.name ||
    property?.locality ||
    property?.society_id
  );

  const hasCommercialSignal = Boolean(property?.price || property?.bedrooms || property?.area_sqft);

  return hasContext && hasCommercialSignal;
}

function normalizeForMatch(value) {
  return String(value || "").toLowerCase().replace(/-/g, " ").trim();
}

function societyMatchesNeedle(society, needle) {
  const text = normalizeForMatch([society?.name, society?.sector, society?.locality, society?.address, society?.builder].filter(Boolean).join(" "));
  return Boolean(needle) && text.includes(needle);
}

function addDerivedLandingRoutes(routes, societies) {
  const localitySlugs = new Set();

  for (const society of societies) {
    const locality = society?.sector || society?.locality;
    const localitySlug = slugify(locality);

    if (localitySlug) localitySlugs.add(`/gurgaon/${localitySlug}`);
  }

  // Only add the curated locality/builder routes when at least one published
  // society actually matches -- otherwise the page is empty/misleading and
  // shouldn't be offered to search engines as a real landing page.
  for (const route of preferredLocalityRoutes) {
    const slug = route.split("/").pop();
    const needle = normalizeForMatch(slug);
    if (societies.some((society) => societyMatchesNeedle(society, needle))) {
      localitySlugs.add(route);
    }
  }

  for (const loc of [...localitySlugs].slice(0, 40)) {
    routes.push({ loc, priority: "0.72", changefreq: "weekly" });
  }

  for (const route of preferredBuilderRoutes) {
    const slug = route.split("/").pop();
    const needle = normalizeForMatch(slug);
    if (societies.some((society) => societyMatchesNeedle(society, needle))) {
      routes.push({ loc: route, priority: "0.7", changefreq: "weekly" });
    }
  }
}

function buildXml(routes) {
  const today = new Date().toISOString().slice(0, 10);

  const urls = uniqueRoutes(routes)
    .map((route) => {
      return [
        "  <url>",
        `    <loc>${escapeXml(toAbsoluteUrl(route.loc))}</loc>`,
        `    <lastmod>${route.lastmod || today}</lastmod>`,
        `    <changefreq>${route.changefreq || "weekly"}</changefreq>`,
        `    <priority>${route.priority || "0.6"}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`;
}

async function main() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  const routes = [...staticRoutes];

  const societyResult = await fetchRowsWithRetry("/societies");
  const propertyResult = await fetchRowsWithRetry("/properties");

  if (!societyResult.reachedApi || !propertyResult.reachedApi) {
    throw new Error(`Could not reach the public API at ${API_BASE}.`);
  }

  const societies = societyResult.rows.filter(isPublicSociety);
  const properties = propertyResult.rows.filter(isHighQualityProperty);

  if (societies.length < MIN_PUBLIC_SOCIETIES) {
    throw new Error(`Refusing to replace sitemap: public society count fell to ${societies.length}, below safety threshold ${MIN_PUBLIC_SOCIETIES}.`);
  }

  addDerivedLandingRoutes(routes, societies);

  for (const society of societies) {
    const slug = society?.slug || society?.id;
    if (!slug) continue;

    routes.push({
      loc: `/society/${slug}`,
      priority: society?.featured || society?.show_in_hero ? "0.85" : "0.75",
      changefreq: "weekly",
      lastmod: society?.updated_at?.slice?.(0, 10) || society?.published_at?.slice?.(0, 10),
    });

    routes.push({
      loc: `/rwa/${slug}`,
      priority: "0.58",
      changefreq: "weekly",
      lastmod: society?.updated_at?.slice?.(0, 10) || society?.published_at?.slice?.(0, 10),
    });
  }

  for (const property of properties) {
    const slug = property?.slug || property?.id;
    if (!slug) continue;

    routes.push({
      loc: `/property/${slug}`,
      priority: property?.featured || property?.verified ? "0.78" : "0.68",
      changefreq: "daily",
      lastmod: property?.updated_at?.slice?.(0, 10) || property?.published_at?.slice?.(0, 10),
    });
  }

  const xml = buildXml(routes);
  await fs.writeFile(SITEMAP_PATH, xml, "utf8");

  console.log(`Generated sitemap with ${uniqueRoutes(routes).length} URLs at ${SITEMAP_PATH}`);
  console.log(`Included ${societies.length} public societies and ${properties.length} high-quality public properties.`);
}

main().catch(async (error) => {
  console.warn(`Sitemap generation warning: ${error?.message || error}`);

  try {
    const existing = await fs.readFile(SITEMAP_PATH, "utf8");
    const existingSocieties = countDetailUrls(existing, "society");

    if (existingSocieties >= MIN_PUBLIC_SOCIETIES) {
      console.warn(`Preserved existing sitemap with ${existingSocieties} society URLs; no fallback sitemap was written.`);
      return;
    }
  } catch {
    // A missing/unreadable sitemap cannot be treated as a healthy fallback.
  }

  console.error("No healthy existing sitemap is available; failing the build instead of publishing a reduced sitemap.");
  process.exitCode = 1;
});
