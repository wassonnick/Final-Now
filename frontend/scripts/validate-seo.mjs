import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.societyflats.com";
const DIST_DIR = path.resolve(process.cwd(), "dist");
const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const MIN_PUBLIC_SOCIETIES = Number.parseInt(process.env.SITEMAP_MIN_PUBLIC_SOCIETIES || "20", 10);

const requiredRoutes = [
  "/",
  "/gurgaon",
  "/gurgaon/societies",
  "/gurgaon/properties",
  "/gurgaon/sector-65",
  "/builder/dlf",
  "/societies",
  "/properties",
  "/investment-calculator",
  "/builder-floors",
  "/builder-portal",
  "/broker-crm",
  "/recommendations",
  "/chat",
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
  const internalLinks = await fs.readFile(path.resolve(process.cwd(), "src/components/seo/InternalSeoLinks.tsx"), "utf8");
  const prerender = await fs.readFile(path.resolve(process.cwd(), "scripts/prerender-static-meta.mjs"), "utf8");

  const requiredContent = [
    "/gurgaon",
    "/gurgaon/societies",
    "/gurgaon/properties",
    "/gurgaon/sector-65",
    "/gurgaon/golf-course-extension-road",
    "/builder/dlf",
    "/builder/m3m",
    "/investment-calculator",
    "/builder-floors",
    "/builder-portal",
    "/chat",
  ];

  for (const required of requiredContent) {
    if (!internalLinks.includes(required) && !prerender.includes(required)) {
      throw new Error(`Internal SEO links missing: ${required}`);
    }
  }

  if (!prerender.includes("sf-static-crawl-links")) {
    throw new Error("Static crawl links missing from prerender script");
  }
}

async function validateC37ConversionCopy() {
  const societyPage = await fs.readFile(path.resolve(process.cwd(), "src/pages/SocietyPage.tsx"), "utf8");
  const searchPage = await fs.readFile(path.resolve(process.cwd(), "src/pages/SearchPage.tsx"), "utf8");
  const leadModal = await fs.readFile(path.resolve(process.cwd(), "src/components/leads/PublicLeadModal.tsx"), "utf8");
  const hero = await fs.readFile(path.resolve(process.cwd(), "src/components/home/SocietyFlatsHero.tsx"), "utf8");
  const homePage = await fs.readFile(path.resolve(process.cwd(), "src/pages/HomePage.tsx"), "utf8");
  const aiAdvisor = await fs.readFile(path.resolve(process.cwd(), "src/pages/AIAdvisorPage.tsx"), "utf8");
  const propertiesPage = await fs.readFile(path.resolve(process.cwd(), "src/pages/PropertiesPage.tsx"), "utf8");
  const featureExperience = await fs.readFile(path.resolve(process.cwd(), "src/pages/FeatureExperiencePage.tsx"), "utf8");
  const protectedPages = await Promise.all([
    "OwnerDashboard.tsx",
    "CustomerDashboardPage.tsx",
    "BrokerDashboardPage.tsx",
  ].map((file) => fs.readFile(path.resolve(process.cwd(), "src/pages", file), "utf8")));

  const checks = [
    [hero, "Ask SocietyFlats AI", "Hero missing real AI chat card"],
    [hero, "submitHeroAi", "Hero AI is not wired to submit on-page"],
    [hero, "No forced AI page jump.", "Hero missing no forced page jump copy"],
    [homePage, "Start with the path buyers and tenants search most.", "Homepage missing premium popular searches section"],
    [homePage, "Need help choosing between societies?", "Homepage missing compact AI section"],

    [homePage, "Prime localities", "Homepage popular searches missing locality card"],
    [homePage, "Top builders", "Homepage popular searches missing builder card"],
    [homePage, "User intent", "Homepage popular searches missing intent card"],
    [homePage, "A quick market view before users shortlist societies", "Homepage market insights not compacted"],
    [societyPage, "society_page_no_inventory_similar_options", "Society page missing no-inventory similar-options CTA"],
    [societyPage, "Request similar options", "Society page missing similar-options CTA copy"],
    [searchPage, "matching Gurgaon societies and homes", "Search empty-state success copy missing C37 wording"],
    [leadModal, "matching homes, similar societies and visit-ready next steps", "Lead modal success copy missing C37 wording"],
    [aiAdvisor, "Continue your Gurgaon society shortlist.", "AI Advisor page does not feel like continuation flow"],
    [aiAdvisor, "Open full search", "AI Advisor page missing return-to-search flow"],
    [searchPage, "moreFromBuilderResults", "Search page missing builder grouping"],
    [propertiesPage, "No verified homes are currently published", "Properties page missing honest zero-inventory copy"],
    [propertiesPage, "Request current availability", "Properties page missing zero-inventory lead CTA"],
    [featureExperience, "canonical: '/broker-crm'", "Broker CRM missing route-specific SEO"],
    [featureExperience, "canonical: '/recommendations'", "Recommendations missing route-specific SEO"],
  ];

  for (const [source, needle, message] of checks) {
    if (!source.includes(needle)) {
      throw new Error(message);
    }
  }

  if ((hero.match(/<h1\b/g) || []).length !== 1) {
    throw new Error("Homepage hero must render exactly one H1 in the DOM");
  }

  if (protectedPages.some((source) => !source.includes("noindex: true"))) {
    throw new Error("Every protected account dashboard must set explicit noindex metadata");
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

  const societyUrlCount = (sitemap.match(/<loc>https:\/\/www\.societyflats\.com\/society\//g) || []).length;
  if (societyUrlCount < MIN_PUBLIC_SOCIETIES) {
    throw new Error(`sitemap.xml has only ${societyUrlCount} society URLs; expected at least ${MIN_PUBLIC_SOCIETIES}`);
  }

  const manifest = await fs.readFile(path.join(PUBLIC_DIR, "site.webmanifest"), "utf8");
  if (!manifest.includes("SocietyFlats") || !manifest.includes("/icon-192.png") || !manifest.includes("/icon-512.png")) {
    throw new Error("site.webmanifest missing SocietyFlats branding/icon");
  }

  await fs.access(path.join(PUBLIC_DIR, "favicon-32.png"));
  await fs.access(path.join(PUBLIC_DIR, "apple-touch-icon.png"));
  await fs.access(path.join(PUBLIC_DIR, "icon-192.png"));
  await fs.access(path.join(PUBLIC_DIR, "icon-512.png"));
  await fs.access(path.join(PUBLIC_DIR, "brand", "societyflats-logo-light.png"));
  await fs.access(path.join(PUBLIC_DIR, "brand", "societyflats-logo-dark.png"));
  await fs.access(path.join(PUBLIC_DIR, "brand", "societyflats-logo-white.png"));
  await fs.access(path.join(PUBLIC_DIR, "brand", "societyflats-og-image.png"));
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
