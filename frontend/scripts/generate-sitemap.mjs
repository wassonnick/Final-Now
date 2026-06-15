import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://societyflats.com";
const API_BASE = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || "https://final-now.onrender.com/api";
const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml");

const staticRoutes = [
  { loc: "/", priority: "1.0", changefreq: "daily" },
  { loc: "/search", priority: "0.9", changefreq: "daily" },
  { loc: "/societies", priority: "0.9", changefreq: "daily" },
  { loc: "/properties", priority: "0.9", changefreq: "daily" },
  { loc: "/sell", priority: "0.7", changefreq: "weekly" },
  { loc: "/ai-advisor", priority: "0.6", changefreq: "weekly" },
  { loc: "/recommendations", priority: "0.6", changefreq: "weekly" },
  { loc: "/insights", priority: "0.5", changefreq: "weekly" },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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

      if (rows.length) return rows;
    } catch {
      // Keep sitemap generation resilient. Static fallback will still be written.
    }
  }

  return [];
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

  const societies = await fetchRows("/societies");
  const properties = await fetchRows("/properties");

  for (const society of societies) {
    const slug = society?.slug || society?.id;
    if (!slug) continue;

    routes.push({
      loc: `/society/${slug}`,
      priority: society?.featured || society?.show_in_hero ? "0.85" : "0.75",
      changefreq: "weekly",
      lastmod: society?.updated_at?.slice?.(0, 10) || society?.published_at?.slice?.(0, 10),
    });
  }

  for (const property of properties) {
    const slug = property?.slug || property?.id;
    if (!slug) continue;

    routes.push({
      loc: `/property/${slug}`,
      priority: "0.75",
      changefreq: "daily",
      lastmod: property?.updated_at?.slice?.(0, 10) || property?.published_at?.slice?.(0, 10),
    });
  }

  const xml = buildXml(routes);
  await fs.writeFile(SITEMAP_PATH, xml, "utf8");

  console.log(`Generated sitemap with ${uniqueRoutes(routes).length} URLs at ${SITEMAP_PATH}`);
}

main().catch(async (error) => {
  console.warn("Sitemap API fetch failed. Writing static fallback sitemap.");
  console.warn(error?.message || error);

  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.writeFile(SITEMAP_PATH, buildXml(staticRoutes), "utf8");
});
