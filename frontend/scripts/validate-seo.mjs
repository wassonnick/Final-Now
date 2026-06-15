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
    ];

    if (route === "/404") {
      checks.push('name="robots" content="noindex, nofollow"');
    }

    await assertFileContains(file, checks);
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

  console.log("SEO validation passed.");
  console.log(`Checked ${requiredRoutes.length} static HTML routes, robots.txt, sitemap.xml, manifest and favicon.`);
}

main().catch((error) => {
  console.error("SEO validation failed:");
  console.error(error?.message || error);
  process.exit(1);
});
