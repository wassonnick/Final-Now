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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The backend redeploys alongside the frontend, so it can be mid-restart when this build step
// runs. Retry rather than silently shipping a build with no society shells.
async function fetchJsonWithRetry(url, attempts = 4, delayMs = 15000) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (response.ok) return await response.json();
    } catch {
      // fall through to retry
    }
    if (attempt < attempts) {
      console.warn(`Prerender: ${url} unreachable (attempt ${attempt}/${attempts}) — retrying in ${delayMs / 1000}s.`);
      await sleep(delayMs);
    }
  }
  return null;
}

async function fetchLiveSocieties() {
  const payload = await fetchJsonWithRetry(`${API_BASE}/societies?per_page=200`);
  if (!payload) return [];

  return extractRows(payload).filter(
    (society) =>
      ["Verified", "Premium"].includes(String(society?.status || "")) && society?.slug,
  );
}

async function fetchLiveProperties() {
  const payload = await fetchJsonWithRetry(`${API_BASE}/properties?per_page=200`);
  if (!payload) return [];

  return extractRows(payload).filter((property) => property?.slug);
}

async function fetchLiveComparePages() {
  const payload = await fetchJsonWithRetry(`${API_BASE}/compare-pages?per_page=200`);
  if (!payload) return [];

  return extractRows(payload).filter((page) => page?.slug && page?.status === "published");
}

function localityCountsFrom(societies) {
  const counts = new Map();

  for (const society of societies) {
    const locality = society?.sector || society?.locality;
    const slug = slugify(locality);

    if (!slug) continue;

    counts.set(slug, (counts.get(slug) || 0) + 1);
  }

  return counts;
}

const routeMeta = [
  {
    path: "/",
    title: "Verified Gurgaon Societies — Compare Before You Choose a Home | SocietyFlats",
    description:
      "40+ Gurgaon societies reviewed field-by-field before publishing — real coordinates, reviewed display images and no invented listings. Compare security, commute and price before you visit.",
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
  ...[
    ["affordable", "Affordable Flats in Gurgaon under ₹1.5 Cr — Verified Societies | SocietyFlats", "Browse verified affordable Gurgaon societies with resale ranges up to ₹1.5 Cr. Real scores, honest price context, no fake listings."],
    ["under-2-cr", "Flats Under ₹2 Cr in Gurgaon — Verified Societies & Prices | SocietyFlats", "Verified Gurgaon societies with resale ranges under ₹2 Cr. Society scores, real price context and no fake inventory."],
    ["under-3-cr", "Flats Under ₹3 Cr in Gurgaon — Verified Societies & Prices | SocietyFlats", "Verified Gurgaon societies with resale ranges under ₹3 Cr. Real scores, honest pricing, verified inventory only."],
    ["luxury", "Luxury Flats in Gurgaon (₹3–7 Cr) — Verified Premium Societies | SocietyFlats", "Explore verified luxury Gurgaon societies priced ₹3–7 Cr. Society scores, market ranges and the Buyer's Truth on every profile."],
    ["elite", "Elite Flats in Gurgaon (₹7–15 Cr) — Verified Prime Societies | SocietyFlats", "Verified elite Gurgaon societies priced ₹7–15 Cr. Real scores, honest market context, verified availability only."],
    ["ultra-luxury", "Ultra-Luxury Flats in Gurgaon (₹15 Cr+) — Verified Societies | SocietyFlats", "Discover verified ultra-luxury Gurgaon societies above ₹15 Cr. Society intelligence scores and honest market ranges, no fake listings."],
  ].map(([slug, title, description]) => ({
    path: `/gurgaon-flats/${slug}`,
    title,
    description,
    priority: "0.78",
    changefreq: "weekly",
    schemaType: "CollectionPage",
  })),
  {
    path: "/list-your-flat",
    title: "List Your Gurgaon Flat Free — Verified Tenants & Buyers | SocietyFlats",
    description:
      "List your flat on your society's verified SocietyFlats page. Free listing, verified enquiries only, no spam — tenants and buyers who already chose your society.",
    priority: "0.8",
    changefreq: "weekly",
    schemaType: "WebPage",
  },
  {
    path: "/sell-your-flat",
    title: "Sell Your Gurgaon Flat — Verified Buyers, Free Listing | SocietyFlats",
    description:
      "Sell your flat where buyers already research your society: verified scores, honest resale ranges, serious enquiries only. Free listing on SocietyFlats.",
    priority: "0.8",
    changefreq: "weekly",
    schemaType: "WebPage",
  },
  {
    path: "/compare",
    title: "Compare Gurgaon Societies | SocietyFlats",
    description:
      "Browse published 3-way SocietyFlats comparison pages for Gurgaon societies using admin-reviewed society data.",
    priority: "0.82",
    changefreq: "weekly",
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
    path: "/broker-crm",
    title: "Gurgaon Broker Partner Program | SocietyFlats",
    description:
      "Apply to become a verified SocietyFlats broker partner for society-specific Gurgaon enquiries and reviewed inventory.",
    priority: "0.6",
    changefreq: "weekly",
    schemaType: "WebPage",
  },
  {
    path: "/recommendations",
    title: "Gurgaon Society Recommendations | SocietyFlats",
    description:
      "Build a shortlist from published Gurgaon society profiles and live verified inventory without fabricated matches.",
    priority: "0.6",
    changefreq: "weekly",
    schemaType: "WebPage",
  },
  {
    path: "/nri-services",
    title: "NRI Property Support in Gurgaon | SocietyFlats",
    description:
      "Request human-reviewed Gurgaon property support for buying, selling, renting out or local coordination from overseas.",
    priority: "0.6",
    changefreq: "weekly",
    schemaType: "WebPage",
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

// ---------------------------------------------------------------------------
// Society / RWA / property shells — the money pages. Without these, every
// /society/<slug> URL served the homepage's HTML including a canonical pointing
// at the homepage, telling crawlers the whole catalogue was a duplicate of "/".
// ---------------------------------------------------------------------------

function textOf(value) {
  return String(value ?? "").trim();
}

function listOf(value) {
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean);
  const text = textOf(value);
  if (!text) return [];
  return text.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function truncateText(text, max = 158) {
  const clean = textOf(text).replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

function societyFaqs(society) {
  const raw = society?.faq;
  const items = Array.isArray(raw) ? raw : [];

  return items
    .map((item) => ({
      question: textOf(item?.question ?? item?.q),
      answer: textOf(item?.answer ?? item?.a),
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 6);
}

function societyImage(society) {
  const candidate = textOf(society?.cover_image) || textOf(society?.image_url);
  return /^https:\/\//.test(candidate) ? candidate : null;
}

function societyScoreText(society) {
  const raw = Number(society?.score ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  return (raw > 10 ? raw / 10 : raw).toFixed(1);
}

function societyDescriptionMeta(society) {
  const explicit = textOf(society?.meta_description);
  if (explicit) return truncateText(explicit);

  const bits = [];
  if (textOf(society?.rent_range)) bits.push(`Rent ${textOf(society.rent_range)}`);
  if (textOf(society?.buy_range)) bits.push(`resale ${textOf(society.buy_range)}`);
  const priceLine = bits.length ? ` ${bits.join(", ")}.` : "";

  return truncateText(
    `${society.name} in ${textOf(society?.sector) || "Gurgaon"}: verified society profile with score, amenities and market context.${priceLine} Reviewed by SocietyFlats.`,
  );
}

function societySchema(society, canonicalPath) {
  const schema = {
    "@type": "ApartmentComplex",
    name: society.name,
    url: `${SITE_URL}${canonicalPath}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: textOf(society?.address) || undefined,
      addressLocality: textOf(society?.sector) || textOf(society?.locality) || "Gurugram",
      addressRegion: "Haryana",
      addressCountry: "IN",
    },
  };

  const image = societyImage(society);
  if (image) schema.image = image;

  const lat = Number(society?.latitude);
  const lng = Number(society?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) {
    schema.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
  }

  const amenities = listOf(society?.amenities).slice(0, 12);
  if (amenities.length) {
    schema.amenityFeature = amenities.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true }));
  }

  return schema;
}

function societyFaqSchema(faqs) {
  if (!faqs.length) return null;

  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

function societySnapshot(society, faqs) {
  const facts = [];
  const score = societyScoreText(society);
  if (score) facts.push(["Society score", `${score} / 10`]);
  if (textOf(society?.rent_range)) facts.push(["Rent range", textOf(society.rent_range)]);
  if (textOf(society?.buy_range)) facts.push(["Resale range", textOf(society.buy_range)]);
  if (textOf(society?.price_per_sqft)) facts.push(["Price per sq ft", textOf(society.price_per_sqft)]);
  if (textOf(society?.builder)) facts.push(["Builder", textOf(society.builder)]);
  if (textOf(society?.project_status)) facts.push(["Status", textOf(society.project_status)]);
  if (textOf(society?.rera_number)) facts.push(["RERA", textOf(society.rera_number)]);

  const amenities = listOf(society?.amenities).slice(0, 14);
  const sectorSlug = slugify(society?.sector || society?.locality);

  // This snapshot is the same content the React page renders; React replaces it on hydration.
  // It exists so crawlers (and users on slow connections) get real content on first paint.
  const parts = [
    '<div id="sf-prerender" style="max-width:920px;margin:0 auto;padding:28px 20px;font-family:system-ui,-apple-system,sans-serif;color:#25302B;">',
    '<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#2A6147;">SocietyFlats · Verified Gurgaon society</p>',
    `<h1 style="font-size:28px;margin:6px 0;">${escapeHtml(society.name)}${textOf(society?.sector) ? `, ${escapeHtml(textOf(society.sector))}` : ""} Gurugram</h1>`,
  ];

  const description = textOf(society?.description);
  if (description) parts.push(`<p style="line-height:1.6;">${escapeHtml(truncateText(description, 700))}</p>`);

  if (facts.length) {
    parts.push("<ul style=\"line-height:1.8;padding-left:18px;\">");
    for (const [label, value] of facts) parts.push(`<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`);
    parts.push("</ul>");
  }

  if (amenities.length) {
    parts.push(`<h2 style="font-size:18px;">Amenities</h2><p>${escapeHtml(amenities.join(" · "))}</p>`);
  }

  if (faqs.length) {
    parts.push('<h2 style="font-size:18px;">Frequently asked questions</h2>');
    for (const item of faqs) {
      parts.push(`<h3 style="font-size:15px;margin-bottom:2px;">${escapeHtml(item.question)}</h3><p style="margin-top:2px;line-height:1.6;">${escapeHtml(item.answer)}</p>`);
    }
  }

  parts.push('<p style="margin-top:18px;">');
  parts.push('<a href="/societies">All verified Gurgaon societies</a>');
  if (sectorSlug) parts.push(` · <a href="/gurgaon/${sectorSlug}">More societies in ${escapeHtml(textOf(society?.sector) || "this sector")}</a>`);
  parts.push(` · <a href="/rwa/${escapeHtml(society.slug)}">${escapeHtml(society.name)} RWA updates</a>`);
  parts.push("</p></div>");

  return parts.join("");
}

function societyRoutes(societies) {
  return societies.map((society) => {
    const canonicalPath = `/society/${society.slug}`;
    const faqs = societyFaqs(society);
    const sector = textOf(society?.sector) || "Gurgaon";
    const title = textOf(society?.meta_title)
      || `${society.name}, ${sector} Gurgaon — Rent, Price & Review | SocietyFlats`;

    return {
      path: canonicalPath,
      title,
      description: societyDescriptionMeta(society),
      schemaType: "WebPage",
      ogImage: societyImage(society),
      extraSchemas: [societySchema(society, canonicalPath), societyFaqSchema(faqs)].filter(Boolean),
      skipGenericFaq: true,
      rootSnapshot: societySnapshot(society, faqs),
    };
  });
}

function rwaRoutes(societies) {
  return societies.map((society) => ({
    path: `/rwa/${society.slug}`,
    title: `${society.name} RWA — Announcements & Resident Updates | SocietyFlats`,
    description: truncateText(
      `Official RWA announcements, resident questions and community updates for ${society.name}, ${textOf(society?.sector) || "Gurgaon"} — on the verified SocietyFlats profile.`,
    ),
    schemaType: "WebPage",
    skipGenericFaq: true,
    rootSnapshot: [
      '<div id="sf-prerender" style="max-width:920px;margin:0 auto;padding:28px 20px;font-family:system-ui,-apple-system,sans-serif;color:#25302B;">',
      `<h1 style="font-size:26px;">${escapeHtml(society.name)} RWA — Announcements &amp; Resident Updates</h1>`,
      `<p style="line-height:1.6;">Community announcements, resident Q&amp;A and verified society context for ${escapeHtml(society.name)}${textOf(society?.sector) ? `, ${escapeHtml(textOf(society.sector))}` : ""}, Gurugram.</p>`,
      `<p><a href="/society/${escapeHtml(society.slug)}">View the full verified ${escapeHtml(society.name)} society profile</a> · <a href="/societies">All verified Gurgaon societies</a></p>`,
      "</div>",
    ].join(""),
  }));
}

function propertyRoutes(properties) {
  return properties.map((property) => {
    const title = textOf(property?.title) || "Verified Gurgaon home";
    const price = textOf(property?.price);

    return {
      path: `/property/${property.slug}`,
      title: `${title}${price ? ` — ${price}` : ""} | SocietyFlats`,
      description: truncateText(
        textOf(property?.description)
          || `${title} — a verified listing on SocietyFlats, reviewed against the published society record. No fake inventory.`,
      ),
      schemaType: "WebPage",
      skipGenericFaq: true,
    };
  });
}

function comparePageRoutes(comparePages) {
  return comparePages.map((page) => {
    const canonicalPath = `/compare/${page.slug}`;
    const faqs = Array.isArray(page.faq_json) ? page.faq_json.filter((f) => f?.question && f?.answer) : [];
    const societies = Array.isArray(page.society_summaries_json) ? page.society_summaries_json : [];
    const rows = Array.isArray(page.comparison_table_json?.rows) ? page.comparison_table_json.rows : [];
    const columns = Array.isArray(page.comparison_table_json?.columns) ? page.comparison_table_json.columns : [];

    const itemList = societies.length
      ? {
          "@type": "ItemList",
          name: page.title,
          itemListElement: societies.map((society, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: society.name,
            url: `${SITE_URL}/society/${society.slug}`,
          })),
        }
      : null;
    const faqSchema = faqs.length
      ? {
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: { "@type": "Answer", text: faq.answer },
          })),
        }
      : null;

    const snapshot = [
      '<div id="sf-prerender" style="max-width:960px;margin:0 auto;padding:28px 20px;font-family:system-ui,-apple-system,sans-serif;color:#25302B;">',
      `<h1 style="font-size:26px;">${escapeHtml(page.h1 || page.title)}</h1>`,
      page.intro ? `<p style="line-height:1.6;">${escapeHtml(page.intro)}</p>` : "",
      page.comparison_summary ? `<p style="line-height:1.6;">${escapeHtml(page.comparison_summary)}</p>` : "",
      rows.length
        ? `<table style="border-collapse:collapse;width:100%;margin:16px 0;"><thead><tr><th style="text-align:left;padding:6px;border:1px solid #ddd;">Comparison point</th>${columns
            .map((column) => `<th style="text-align:left;padding:6px;border:1px solid #ddd;">${escapeHtml(column.name || "")}</th>`)
            .join("")}</tr></thead><tbody>${rows
            .map(
              (row) =>
                `<tr><td style="padding:6px;border:1px solid #ddd;">${escapeHtml(row.label || "")}</td>${(row.values || [])
                  .map((value) => `<td style="padding:6px;border:1px solid #ddd;">${escapeHtml(String(value ?? ""))}</td>`)
                  .join("")}</tr>`,
            )
            .join("")}</tbody></table>`
        : "",
      societies.length
        ? societies
            .map(
              (society) =>
                `<p style="line-height:1.6;"><a href="/society/${escapeHtml(society.slug)}"><strong>${escapeHtml(society.name)}</strong></a>${society.blurb ? ` — ${escapeHtml(society.blurb)}` : " society profile"}</p>`,
            )
            .join("")
        : "",
      faqs.length
        ? `<section>${faqs
            .map((faq) => `<h2 style="font-size:18px;">${escapeHtml(faq.question)}</h2><p style="line-height:1.6;">${escapeHtml(faq.answer)}</p>`)
            .join("")}</section>`
        : "",
      '<p><a href="/compare">All society comparisons</a> · <a href="/societies">All verified Gurgaon societies</a></p>',
      "</div>",
    ]
      .filter(Boolean)
      .join("");

    return {
      path: canonicalPath,
      title: page.meta_title || `${page.title} | SocietyFlats`,
      description: truncateText(page.meta_description || page.comparison_summary || page.intro || page.title),
      schemaType: "WebPage",
      extraSchemas: [itemList, faqSchema].filter(Boolean),
      skipGenericFaq: true,
      rootSnapshot: snapshot,
    };
  });
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

  // Entity-specific schema (ApartmentComplex, per-society FAQPage, …) replaces the generic
  // brand FAQ so a page never carries two competing FAQPage blocks.
  if (Array.isArray(meta.extraSchemas)) graph.push(...meta.extraSchemas);

  const faq = meta.skipGenericFaq ? null : faqFor(meta);

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
    ...(meta.ogImage ? [`    <meta property="og:image" content="${escapeHtml(meta.ogImage)}" />`] : []),
    `    <meta name="twitter:card" content="${meta.ogImage ? "summary_large_image" : "summary"}" />`,
    `    <meta name="twitter:title" content="${title}" />`,
    `    <meta name="twitter:description" content="${description}" />`,
    ...(meta.ogImage ? [`    <meta name="twitter:image" content="${escapeHtml(meta.ogImage)}" />`] : []),
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
  if (html.includes('<div id="root"></div>')) {
    return html.replace('<div id="root"></div>', `<div id="root"></div>${staticCrawlLinks()}`);
  }
  // Pages with a baked #root snapshot: append the crawl nav before </body> instead.
  return html.replace("</body>", `${staticCrawlLinks()}</body>`);
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
  let html = injectMeta(baseHtml, meta);

  // Bake the crawlable content snapshot inside #root: crawlers and slow connections get real
  // content on first paint; React replaces it with the live page on hydration.
  if (meta.rootSnapshot) {
    html = html.replace('<div id="root"></div>', `<div id="root">${meta.rootSnapshot}</div>`);
  }

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
  const societies = await fetchLiveSocieties();
  const properties = await fetchLiveProperties();
  const comparePages = await fetchLiveComparePages();

  if (societies.length === 0) {
    console.warn("Prerender: no societies fetched — society/RWA shells skipped this build (static routes still written).");
  }

  const allRoutes = [
    ...routeMeta,
    ...derivedLocalityRoutes(localityCountsFrom(societies)),
    ...societyRoutes(societies),
    ...rwaRoutes(societies),
    ...propertyRoutes(properties),
    ...comparePageRoutes(comparePages),
  ];
  const written = [];

  for (const meta of allRoutes) {
    written.push(await writeRouteHtml(baseHtml, meta));
  }

  console.log(
    `Static SEO shells generated for ${written.length} routes ` +
      `(${societies.length} societies, ${societies.length} RWA pages, ${properties.length} properties, ${comparePages.length} compare pages).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
