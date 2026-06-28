import fs from "node:fs/promises";
import path from "node:path";

const SITE_URL = "https://www.societyflats.com";
const API_BASE = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || "https://final-now.onrender.com/api";
const DIST_DIR = path.resolve(process.cwd(), "dist");
const INDEX_PATH = path.join(DIST_DIR, "index.html");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function readableFromSlug(value) {
  return String(value || "")
    .split("-")
    .filter(Boolean)
    .map((part) => (part.toUpperCase() === "DLF" ? "DLF" : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(" ");
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

async function fetchLiveLocalities() {
  try {
    const response = await fetch(`${API_BASE}/societies?per_page=200`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return new Map();

    const rows = extractRows(await response.json()).filter((society) =>
      ["Verified", "Premium"].includes(String(society?.status || "")),
    );

    const counts = new Map();

    for (const society of rows) {
      const locality = society?.sector || society?.locality;
      const slug = slugify(locality);

      if (!slug) continue;

      counts.set(slug, (counts.get(slug) || 0) + 1);
    }

    return counts;
  } catch {
    return new Map();
  }
}

const routeMeta = [
  {
    path: "/",
    title: "Verified Gurgaon Societies — Compare Before You Choose a Home | SocietyFlats",
    description:
      "22+ Gurgaon societies reviewed field-by-field before publishing — real coordinates, real Google-sourced photos, no invented listings. Compare security, commute and price before you visit.",
    priority: "1.0",
    changefreq: "daily",
    schemaType: "WebSite",
  },
  {
    path: "/gurgaon",
    title: "Find the Right Society in Gurgaon Before Choosing the Home | SocietyFlats",
    description:
      "Discover verified Gurgaon societies, live properties, owner listings and society-first recommendations on SocietyFlats.",
    priority: "0.95",
    changefreq: "daily",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/societies",
    title: "Verified Societies in Gurgaon | SocietyFlats",
    description:
      "Explore verified Gurgaon societies with society scores, rent ranges, sale ranges, live inventory and callback support.",
    priority: "0.9",
    changefreq: "daily",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/properties",
    title: "Verified Properties in Gurgaon | SocietyFlats",
    description:
      "Browse live Gurgaon rental and resale homes from verified societies with SocietyFlats intelligence and callback support.",
    priority: "0.9",
    changefreq: "daily",
    schemaType: "CollectionPage",
  },
  {
    path: "/societies",
    title: "Explore Verified Societies in Gurgaon | SocietyFlats",
    description:
      "Compare Gurgaon society scores, rent ranges, sale ranges, amenities and available inventory before shortlisting your next home.",
    priority: "0.9",
    changefreq: "daily",
    schemaType: "CollectionPage",
  },
  {
    path: "/properties",
    title: "Discover Verified Gurgaon Properties | SocietyFlats",
    description:
      "Browse premium Gurgaon rental and resale inventory backed by verified societies and SocietyFlats intelligence.",
    priority: "0.9",
    changefreq: "daily",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/sector-65",
    title: "Societies and Properties in Sector 65 Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes in Sector 65 Gurgaon with society-first intelligence, pricing context and callback support.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/sector-56",
    title: "Societies and Properties in Sector 56 Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes in Sector 56 Gurgaon with society-first intelligence, pricing context and callback support.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/sector-66",
    title: "Societies and Properties in Sector 66 Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes in Sector 66 Gurgaon with society-first intelligence, pricing context and callback support.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/sector-67",
    title: "Societies and Properties in Sector 67 Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes in Sector 67 Gurgaon with society-first intelligence, pricing context and callback support.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/sector-70",
    title: "Societies and Properties in Sector 70 Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes in Sector 70 Gurgaon with society-first intelligence, pricing context and callback support.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/sector-102",
    title: "Societies and Properties in Sector 102 Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes in Sector 102 Gurgaon with society-first intelligence, pricing context and callback support.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/golf-course-road",
    title: "Societies and Properties on Golf Course Road Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes on Golf Course Road Gurgaon with society-first intelligence and callback support.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/golf-course-extension-road",
    title: "Societies and Properties on Golf Course Extension Road Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes on Golf Course Extension Road Gurgaon with pricing context and SocietyFlats intelligence.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/dwarka-expressway",
    title: "Societies and Properties on Dwarka Expressway Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes on Dwarka Expressway Gurgaon with society-first intelligence and callback support.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/gurgaon/sohna-road",
    title: "Societies and Properties on Sohna Road Gurgaon | SocietyFlats",
    description:
      "Explore verified societies and live homes on Sohna Road Gurgaon with pricing context and SocietyFlats intelligence.",
    priority: "0.72",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder/dlf",
    title: "DLF Societies and Properties in Gurgaon | SocietyFlats",
    description:
      "Explore DLF societies and available homes in Gurgaon with verified society intelligence, pricing context and callback support.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder/m3m",
    title: "M3M Societies and Properties in Gurgaon | SocietyFlats",
    description:
      "Explore M3M societies and available homes in Gurgaon with verified society intelligence, pricing context and callback support.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder/emaar",
    title: "Emaar Societies and Properties in Gurgaon | SocietyFlats",
    description:
      "Explore Emaar societies and available homes in Gurgaon with verified society intelligence, pricing context and callback support.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder/ats",
    title: "ATS Societies and Properties in Gurgaon | SocietyFlats",
    description:
      "Explore ATS societies and available homes in Gurgaon with verified society intelligence, pricing context and callback support.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder/godrej",
    title: "Godrej Societies and Properties in Gurgaon | SocietyFlats",
    description:
      "Explore Godrej societies and available homes in Gurgaon with verified society intelligence, pricing context and callback support.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder/adani",
    title: "Adani Realty Societies and Properties in Gurgaon | SocietyFlats",
    description:
      "Explore Adani Realty societies and available homes in Gurgaon with verified society intelligence, pricing context and callback support.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder/tulip",
    title: "Tulip Societies and Properties in Gurgaon | SocietyFlats",
    description:
      "Explore Tulip societies and available homes in Gurgaon with verified society intelligence, pricing context and callback support.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder/alpha-corp",
    title: "Alpha Corp Societies and Properties in Gurgaon | SocietyFlats",
    description:
      "Explore Alpha Corp societies and available homes in Gurgaon with verified society intelligence, pricing context and callback support.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/investment-calculator",
    title: "Rental Yield and ROI Calculator Gurgaon | SocietyFlats",
    description:
      "Calculate gross yield, net yield, payback, projected value and CAGR for a Gurgaon property investment.",
    priority: "0.65",
    changefreq: "weekly",
    schemaType: "WebPage",
  },
  {
    path: "/builder-floors",
    title: "Builder Floors in Gurgaon | SocietyFlats",
    description:
      "Explore Gurgaon builder floors with apartment comparisons, title-diligence guidance and published inventory.",
    priority: "0.7",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  },
  {
    path: "/builder-portal",
    title: "Builder and RWA Portal | SocietyFlats",
    description:
      "Claim a published Gurgaon society and submit official updates through the SocietyFlats verification workflow.",
    priority: "0.5",
    changefreq: "monthly",
    schemaType: "WebPage",
  },
  {
    path: "/trust",
    title: "How SocietyFlats Verifies Society Data",
    description:
      "Understand SocietyFlats research, admin review, image approval, data confidence and public publishing workflow.",
    priority: "0.5",
    changefreq: "monthly",
    schemaType: "WebPage",
  },
  {
    path: "/privacy",
    title: "Trust and Privacy | SocietyFlats",
    description:
      "Learn how SocietyFlats protects account, owner, broker and enquiry information.",
    priority: "0.4",
    changefreq: "monthly",
    schemaType: "WebPage",
  },
  {
    path: "/help",
    title: "Help and FAQ | SocietyFlats",
    description:
      "Answers about society verification, live inventory, AI recommendations, owner listings and broker partners.",
    priority: "0.5",
    changefreq: "monthly",
    schemaType: "FAQPage",
  },
  {
    path: "/chat",
    title: "Gurgaon Society AI Chat | SocietyFlats",
    description:
      "Ask a conversational assistant grounded in published SocietyFlats societies and live Gurgaon homes.",
    priority: "0.6",
    changefreq: "weekly",
    schemaType: "WebPage",
  },
  {
    path: "/404",
    title: "Page Not Found | SocietyFlats",
    description:
      "This SocietyFlats page could not be found. Search verified Gurgaon societies and live homes instead.",
    noindex: true,
    schemaType: "WebPage",
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function canonicalFor(routePath) {
  return `${SITE_URL}${routePath === "/" ? "" : routePath}`;
}

function breadcrumbItems(meta) {
  const cleanParts = meta.path
    .split("/")
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part;
      return part
        .split("-")
        .filter(Boolean)
        .map((word) => {
          if (["dlf", "m3m", "ats"].includes(word)) return word.toUpperCase();
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
    });

  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
  ];

  let currentPath = "";

  cleanParts.forEach((name, index) => {
    currentPath += `/${meta.path.split("/").filter(Boolean)[index]}`;
    items.push({
      "@type": "ListItem",
      position: index + 2,
      name,
      item: canonicalFor(currentPath),
    });
  });

  return {
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function faqFor(meta) {
  if (meta.noindex) return null;

  const isBuilder = meta.path.startsWith("/builder/");
  const isLocality = meta.path.startsWith("/gurgaon/") && !["/gurgaon/societies", "/gurgaon/properties"].includes(meta.path);

  const questions = [
    {
      "@type": "Question",
      name: "What is SocietyFlats?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "SocietyFlats is a society-first Gurgaon property platform that helps users compare verified societies, live homes, owner listings and location intelligence before shortlisting a home.",
      },
    },
    {
      "@type": "Question",
      name: "Does SocietyFlats focus on Gurgaon?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. SocietyFlats is currently focused on Gurgaon with society-first search, verified inventory and callback support.",
      },
    },
  ];

  if (isLocality) {
    questions.push({
      "@type": "Question",
      name: "Can I find societies and homes by Gurgaon sector?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. SocietyFlats provides locality and sector landing pages for important Gurgaon areas so users can explore verified societies and available homes by location.",
      },
    });
  }

  if (isBuilder) {
    questions.push({
      "@type": "Question",
      name: "Can I explore Gurgaon societies by builder?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. SocietyFlats includes builder-focused Gurgaon pages for leading developers, helping users compare societies and available homes under each builder collection.",
      },
    });
  }

  return {
    "@type": "FAQPage",
    mainEntity: questions,
  };
}

function schemaFor(meta) {
  const canonical = canonicalFor(meta.path);

  const organization = {
    "@type": "RealEstateAgent",
    name: "SocietyFlats",
    url: SITE_URL,
    areaServed: "Gurugram, Haryana, India",
    description:
      "Gurgaon's society-first real estate platform built around verified availability, structural intelligence, and assisted home search.",
    telephone: "+91-99118-86222",
    priceRange: "₹40000 - ₹2400000",
    logo: `${SITE_URL}/brand/societyflats-icon-512.png`,
    image: `${SITE_URL}/brand/societyflats-og-image.png`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Gurgaon",
      addressRegion: "Haryana",
      addressCountry: "IN",
    },
  };

  const website = {
    "@type": "WebSite",
    name: "SocietyFlats",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const page = {
    "@type": meta.schemaType || "CollectionPage",
    name: meta.title,
    description: meta.description,
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: "SocietyFlats",
      url: SITE_URL,
    },
    about: {
      "@type": "Place",
      name: "Gurugram, Haryana, India",
    },
  };

  const graph = meta.path === "/" ? [organization, website] : [organization, website, page, breadcrumbItems(meta)];
  const faq = faqFor(meta);

  if (faq) graph.push(faq);

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

function stripExistingSeo(head) {
  return head
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(/\s*<meta\s+name=["']description["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name=["']robots["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "\n")
    .replace(/\s*<script\s+id=["']sf-static-jsonld["'][\s\S]*?<\/script>\s*/gi, "\n");
}

function seoTags(meta) {
  const canonical = canonicalFor(meta.path);
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const schema = escapeJson(schemaFor(meta));
  const robots = meta.noindex
    ? "noindex, nofollow"
    : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

  return [
    `    <title>${title}</title>`,
    `    <meta name="description" content="${description}" />`,
    `    <meta name="robots" content="${robots}" />`,
    `    <link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `    <meta property="og:site_name" content="SocietyFlats" />`,
    `    <meta property="og:type" content="website" />`,
    `    <meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    `    <meta name="twitter:card" content="summary" />`,
    `    <meta name="twitter:title" content="${title}" />`,
    `    <meta name="twitter:description" content="${description}" />`,
    `    <script id="sf-static-jsonld" type="application/ld+json">${schema}</script>`,
  ].join("\n");
}


function staticCrawlLinks() {
  const links = [
    ["/gurgaon", "Gurgaon society guide"],
    ["/gurgaon/societies", "Verified Gurgaon societies"],
    ["/gurgaon/properties", "Verified Gurgaon properties"],
    ["/gurgaon/sector-65", "Sector 65 Gurgaon societies"],
    ["/gurgaon/sector-56", "Sector 56 Gurgaon societies"],
    ["/gurgaon/sector-66", "Sector 66 Gurgaon societies"],
    ["/gurgaon/sector-67", "Sector 67 Gurgaon societies"],
    ["/gurgaon/sector-70", "Sector 70 Gurgaon societies"],
    ["/gurgaon/sector-102", "Sector 102 Gurgaon societies"],
    ["/gurgaon/golf-course-road", "Golf Course Road societies"],
    ["/gurgaon/golf-course-extension-road", "Golf Course Extension Road societies"],
    ["/gurgaon/dwarka-expressway", "Dwarka Expressway societies"],
    ["/gurgaon/sohna-road", "Sohna Road societies"],
    ["/builder/dlf", "DLF societies in Gurgaon"],
    ["/builder/m3m", "M3M societies in Gurgaon"],
    ["/builder/emaar", "Emaar societies in Gurgaon"],
    ["/builder/ats", "ATS societies in Gurgaon"],
    ["/builder/godrej", "Godrej societies in Gurgaon"],
    ["/builder/adani", "Adani Realty societies in Gurgaon"],
    ["/builder/tulip", "Tulip societies in Gurgaon"],
    ["/builder/alpha-corp", "Alpha Corp societies in Gurgaon"],
    ["/societies", "All verified societies"],
    ["/properties", "All verified properties"],
    ["/investment-calculator", "Gurgaon rental yield calculator"],
    ["/builder-floors", "Builder floors in Gurgaon"],
    ["/builder-portal", "Builder and RWA verification portal"],
    ["/chat", "Gurgaon society AI chat"],
  ];

  return [
    '<nav id="sf-static-crawl-links" aria-label="Popular Gurgaon searches" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;">',
    '<h2>Popular Gurgaon society searches</h2>',
    ...links.map(([href, label]) => `<a href="${href}">${label}</a>`),
    '</nav>',
  ].join("");
}

function injectStaticCrawlLinks(html) {
  if (html.includes('id="sf-static-crawl-links"')) return html;
  return html.replace('<div id="root"></div>', `<div id="root"></div>${staticCrawlLinks()}`);
}

function injectMeta(baseHtml, meta) {
  const headMatch = baseHtml.match(/<head>([\s\S]*?)<\/head>/i);

  if (!headMatch) {
    throw new Error("Could not find <head> in dist/index.html");
  }

  const cleanHead = stripExistingSeo(headMatch[1]).trimEnd();
  const newHead = `<head>\n${cleanHead}\n${seoTags(meta)}\n  </head>`;

  return baseHtml.replace(/<head>[\s\S]*?<\/head>/i, newHead);
}

async function writeRouteHtml(baseHtml, meta) {
  const html = injectMeta(baseHtml, meta);
  const routeDir = meta.path === "/" ? DIST_DIR : path.join(DIST_DIR, meta.path.replace(/^\//, ""));
  const outputPath = path.join(routeDir, "index.html");

  await fs.mkdir(routeDir, { recursive: true });
  await fs.writeFile(outputPath, injectStaticCrawlLinks(html), "utf8");

  return outputPath;
}

function derivedLocalityRoutes(localityCounts) {
  const existing = new Set(routeMeta.map((meta) => meta.path));
  const derived = [];

  for (const [slug, count] of localityCounts.entries()) {
    const routePath = `/gurgaon/${slug}`;
    if (existing.has(routePath)) continue;

    const label = readableFromSlug(slug);

    derived.push({
      path: routePath,
      title: `Societies and Properties in ${label} Gurgaon | SocietyFlats`,
      description: `Explore verified societies and live homes in ${label} Gurgaon with society-first intelligence, pricing context and callback support.`,
      priority: count >= 3 ? "0.72" : "0.65",
      changefreq: "weekly",
      schemaType: "CollectionPage",
    });
  }

  return derived;
}

async function main() {
  const baseHtml = await fs.readFile(INDEX_PATH, "utf8");
  const localityCounts = await fetchLiveLocalities();
  const allRoutes = [...routeMeta, ...derivedLocalityRoutes(localityCounts)];
  const written = [];

  for (const meta of allRoutes) {
    written.push(await writeRouteHtml(baseHtml, meta));
  }

  console.log(`C33 static meta generated for ${written.length} routes.`);
  for (const file of written) {
    console.log(`- ${path.relative(DIST_DIR, file)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
