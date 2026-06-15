import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.societyflats.com";
const DIST_DIR = path.resolve(process.cwd(), "dist");
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

const requiredRoutes = [
  "/",
  "/gurgaon",
  "/gurgaon/societies",
  "/gurgaon/properties",
  "/gurgaon/sector-65",
  "/builder/dlf",
  "/societies",
  "/properties",
  "/404",
];

const blockedSitemapPatterns = [
  /owner-lead/i,
  /test/i,
  /dummy/i,
  /sample/i,
  /private-limited/i,
  /mnb-build/i,
];

function fileForRoute(route) {
  return route === "/"
    ? path.join(DIST_DIR, "index.html")
    : path.join(DIST_DIR, route.replace(/^\//, ""), "index.html");
}

function expectedCanonical(route) {
  return `${SITE_URL}${route === "/" ? "" : route}`;
}

async function assertFileContains(file, checks) {
  const html = await fs.readFile(file, "utf8");

  for (const check of checks) {
    if (!html.includes(check)) {
      throw new Error(`${path.relative(process.cwd(), file)} missing: ${check}`);
    }
  }
}

async function validateStaticHtml() {
  for (const route of requiredRoutes) {
    const file = fileForRoute(route);
    const canonical = expectedCanonical(route);

    const checks = [
      "<title>",
      `rel="canonical" href="${canonical}"`,
      'property="og:title"',
      'id="sf-static-jsonld"',
      'id="sf-static-crawl-links"',
    ];

    if (route === "/404") {
      checks.push('name="robots" content="noindex, nofollow"');
    }

    await assertFileContains(file, checks);
  }
}

async function validateInternalLinks() {
  const homePage = await fs.readFile(path.resolve(process.cwd(), "src/pages/HomePage.tsx"), "utf8");
  const seoLandingPage = await fs.readFile(path.resolve(process.cwd(), "src/pages/SeoLandingPage.tsx"), "utf8");
  const footer = await fs.readFile(path.resolve(process.cwd(), "src/components/layout/Footer.tsx"), "utf8");
  const internalLinks = await fs.readFile(path.resolve(process.cwd(), "src/components/seo/InternalSeoLinks.tsx"), "utf8");

  const requiredContent = [
    "/gurgaon",
    "/gurgaon/societies",
    "/gurgaon/properties",
    "/gurgaon/sector-65",
    "/gurgaon/golf-course-extension-road",
    "/builder/dlf",
    "/builder/m3m",
  ];

  for (const required of requiredContent) {
    if (!internalLinks.includes(required)) {
      throw new Error(`Internal SEO links missing: ${required}`);
    }
  }

  if (!homePage.includes("Popular Gurgaon society searches")) {
    throw new Error("Homepage missing C35 popular search links section");
  }

  if (!seoLandingPage.includes("Related Gurgaon searches")) {
    throw new Error("SEO landing page missing C35 related search links section");
  }

  if (!seoLandingPage.includes("breadcrumbLabelForLanding")) {
    throw new Error("SEO landing page missing visible breadcrumb helper");
  }

  if (!footer.includes('<InternalSeoLinks variant="footer" />')) {
    throw new Error("Footer missing C35 internal SEO links");
  }
}

async function validateC37ConversionCopy() {
  const homePage = await fs.readFile(path.resolve(process.cwd(), "src/pages/HomePage.tsx"), "utf8");
  const societyPage = await fs.readFile(path.resolve(process.cwd(), "src/pages/SocietyPage.tsx"), "utf8");
  const searchPage = await fs.readFile(path.resolve(process.cwd(), "src/pages/SearchPage.tsx"), "utf8");
  const leadModal = await fs.readFile(path.resolve(process.cwd(), "src/components/leads/PublicLeadModal.tsx"), "utf8");

  const checks = [
    [homePage, "homepage_first_fold_shortlist", "Homepage missing C37 first-fold shortlist CTA"],
    [homePage, "Request matching Gurgaon options", "Homepage missing C37 shortlist modal title"],
    [societyPage, "society_page_no_inventory_similar_options", "Society page missing no-inventory similar-options CTA"],
    [societyPage, "Request similar options", "Society page missing similar-options CTA copy"],
    [societyPage, "rent, buy, visit planning or similar society options", "Society modal copy is still too rent-only"],
    [searchPage, "matching Gurgaon societies and homes", "Search empty-state success copy missing C37 wording"],
    [leadModal, "matching homes, similar societies and visit-ready next steps", "Lead modal success copy missing C37 wording"],
  ];

  for (const [source, needle, message] of checks) {
    if (!source.includes(needle)) {
      throw new Error(message);
    }
  }
}

async function validateBundleSplitting() {
  const assetFiles = await fs.readdir(path.join(DIST_DIR, "assets"));
  const jsFiles = assetFiles.filter((file) => file.endsWith(".js"));

  if (jsFiles.length < 8) {
    throw new Error(`Expected lazy route JS splitting, found only ${jsFiles.length} JS files`);
  }

  const expectedRouteChunks = ["SearchPage", "SocietyPage", "PropertyPage", "AdminDashboardPage"];
  for (const chunkName of expectedRouteChunks) {
    if (!jsFiles.some((file) => file.includes(chunkName))) {
      throw new Error(`Missing expected lazy route chunk: ${chunkName}`);
    }
  }
}

async function validatePublicFiles() {
  const robots = await fs.readFile(path.join(PUBLIC_DIR, "robots.txt"), "utf8");
  if (!robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`)) {
    throw new Error("robots.txt missing canonical sitemap URL");
  }

  const sitemap = await fs.readFile(path.join(PUBLIC_DIR, "sitemap.xml"), "utf8");
  for (const pattern of blockedSitemapPatterns) {
    if (pattern.test(sitemap)) {
      throw new Error(`sitemap.xml contains blocked pattern: ${pattern}`);
    }
  }

  const manifest = await fs.readFile(path.join(PUBLIC_DIR, "site.webmanifest"), "utf8");
  if (!manifest.includes("SocietyFlats") || !manifest.includes("/societyflats-icon.svg")) {
    throw new Error("site.webmanifest missing SocietyFlats branding/icon");
  }

  await fs.access(path.join(PUBLIC_DIR, "societyflats-icon.svg"));
}

async function main() {
  await validateStaticHtml();
  await validatePublicFiles();
  await validateInternalLinks();
  await validateC37ConversionCopy();
  await validateBundleSplitting();

  console.log("SEO validation passed.");
  console.log(`Checked ${requiredRoutes.length} static HTML routes, robots.txt, sitemap.xml, manifest, favicon, conversion copy and bundle splitting.`);
}

main().catch((error) => {
  console.error("SEO validation failed:");
  console.error(error?.message || error);
  process.exit(1);
});
