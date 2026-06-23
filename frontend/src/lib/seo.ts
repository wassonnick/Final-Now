import { useEffect } from "react";

const SITE_NAME = "SocietyFlats";
const SITE_URL = "https://www.societyflats.com";
const DEFAULT_SOCIAL_IMAGE = "/brand/societyflats-og-image.png";
const DEFAULT_DESCRIPTION =
  "Stop sorting through scattered, unverified listings. Discover Gurgaon’s premier residential societies using data-driven ratings for security, commute, and market trends.";

type SeoInput =
  | boolean
  | {
      noindex?: boolean;
      canonical?: string;
      image?: string;
      type?: "website" | "article";
      jsonLd?: unknown;
    };

function normalizeDescription(description?: string | null): string {
  const clean = String(description || DEFAULT_DESCRIPTION).replace(/\s+/g, " ").trim();
  return clean.length > 160 ? `${clean.slice(0, 157).trim()}...` : clean;
}

function absoluteUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return SITE_URL;

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl.replace(/\/$/, "");
  }

  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${path === "/" ? "" : path}`.replace(/\/$/, "");
}

function canonicalFromLocation(): string {
  if (typeof window === "undefined") return SITE_URL;

  const pathname = window.location.pathname || "/";
  const cleanPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  return absoluteUrl(cleanPath);
}

function upsertMetaByName(name: string, content: string): void {
  if (typeof document === "undefined") return;

  let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement("meta");
    tag.name = name;
    document.head.appendChild(tag);
  }

  tag.content = content;
}

function upsertMetaByProperty(property: string, content: string): void {
  if (typeof document === "undefined") return;

  let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }

  tag.content = content;
}

function upsertCanonical(url: string): void {
  if (typeof document === "undefined") return;

  let tag = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

  if (!tag) {
    tag = document.createElement("link");
    tag.rel = "canonical";
    document.head.appendChild(tag);
  }

  tag.href = url;
}

function upsertRobots(noindex: boolean): void {
  if (typeof document === "undefined") return;

  let tag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;

  if (noindex) {
    if (!tag) {
      tag = document.createElement("meta");
      tag.name = "robots";
      document.head.appendChild(tag);
    }

    tag.content = "noindex, nofollow";
    return;
  }

  if (tag) {
    tag.content = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  } else {
    upsertMetaByName("robots", "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  }
}

function removeJsonLd(id: string): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(id);
  if (existing) existing.remove();
}

function upsertJsonLd(id: string, payload: unknown): void {
  if (typeof document === "undefined" || !payload) return;

  removeJsonLd(id);

  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.text = JSON.stringify(payload);
  document.head.appendChild(script);
}

function pageKindFromPath(): "home" | "search" | "society" | "property" | "other" {
  if (typeof window === "undefined") return "other";

  const path = window.location.pathname;

  if (path === "/") return "home";
  if (path.startsWith("/search")) return "search";
  if (path.startsWith("/society/")) return "society";
  if (path.startsWith("/property/")) return "property";

  return "other";
}

function cleanEntityName(title: string): string {
  return title
    .replace(/\s+\|\s+SocietyFlats.*$/i, "")
    .replace(/\s+\|\s+Gurgaon.*$/i, "")
    .trim();
}

function defaultJsonLd(title: string, description: string, canonical: string): unknown {
  const kind = pageKindFromPath();
  const entityName = cleanEntityName(title);

  const baseWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  };

  if (kind === "home") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "RealEstateAgent",
          name: SITE_NAME,
          url: SITE_URL,
          areaServed: "Gurugram, Haryana, India",
          description:
            "Gurgaon's society-first real estate platform built around verified availability, structural intelligence, and assisted home search.",
          logo: absoluteUrl("/brand/societyflats-icon-512.png"),
          image: absoluteUrl(DEFAULT_SOCIAL_IMAGE),
          telephone: "+91-99118-86222",
          priceRange: "₹40000 - ₹2400000",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Gurgaon",
            addressRegion: "Haryana",
            addressCountry: "IN",
          },
        },
        {
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        baseWebPage,
      ],
    };
  }

  if (kind === "society") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        baseWebPage,
        {
          "@type": "Place",
          name: entityName,
          description,
          url: canonical,
          address: {
            "@type": "PostalAddress",
            addressLocality: "Gurugram",
            addressRegion: "Haryana",
            addressCountry: "IN",
          },
        },
      ],
    };
  }

  if (kind === "property") {
    return {
      "@context": "https://schema.org",
      "@graph": [
        baseWebPage,
        {
          "@type": "Accommodation",
          name: entityName,
          description,
          url: canonical,
          address: {
            "@type": "PostalAddress",
            addressLocality: "Gurugram",
            addressRegion: "Haryana",
            addressCountry: "IN",
          },
        },
      ],
    };
  }

  return baseWebPage;
}

export function setPublicSeo(title: string, description: string, input: SeoInput = false): void {
  if (typeof document === "undefined") return;

  const options = typeof input === "boolean" ? { noindex: input } : input;
  const cleanTitle = title?.trim() || "SocietyFlats | Gurgaon’s Society-First Home Search";
  const cleanDescription = normalizeDescription(description);
  const canonical = absoluteUrl(options.canonical || canonicalFromLocation());
  const noindex = Boolean(options.noindex);
  const imageUrl = absoluteUrl(options.image || DEFAULT_SOCIAL_IMAGE);

  document.title = cleanTitle;

  upsertMetaByName("description", cleanDescription);
  upsertMetaByName("robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");
  upsertCanonical(canonical);

  upsertMetaByProperty("og:site_name", SITE_NAME);
  upsertMetaByProperty("og:title", cleanTitle);
  upsertMetaByProperty("og:description", cleanDescription);
  upsertMetaByProperty("og:type", options.type || "website");
  upsertMetaByProperty("og:url", canonical);

  upsertMetaByName("twitter:card", "summary_large_image");
  upsertMetaByName("twitter:title", cleanTitle);
  upsertMetaByName("twitter:description", cleanDescription);
  upsertMetaByProperty("og:image", imageUrl);
  upsertMetaByProperty("og:image:width", "1024");
  upsertMetaByProperty("og:image:height", "576");
  upsertMetaByProperty("og:image:alt", "SocietyFlats Gurgaon society-first home search");
  upsertMetaByName("twitter:image", imageUrl);

  upsertRobots(noindex);

  if (noindex) {
    removeJsonLd("sf-jsonld");
  } else {
    upsertJsonLd("sf-jsonld", options.jsonLd || defaultJsonLd(cleanTitle, cleanDescription, canonical));
  }
}

export function usePublicSeo(title: string, description: string, input: SeoInput = false): void {
  useEffect(() => {
    setPublicSeo(title, description, input);
  }, [title, description, JSON.stringify(input)]);
}
