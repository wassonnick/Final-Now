import { propertyDisplayImage, propertyDisplayImages, hasRealPropertyPhotos } from "@/lib/propertyImages";

function cleanSlug(value: unknown) {
  return String(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/^property\//, "")
    .trim();
}

export function propertySlugOrId(property: any) {
  return cleanSlug(property?.slug || property?.property_slug) || String(property?.id || "").trim();
}

export function publicPropertyUrl(property: any) {
  const key = propertySlugOrId(property);
  return key ? `/property/${key}` : "/properties";
}

export function propertyDisplayPhoto(property: any) {
  return propertyDisplayImage(
    property?.images,
    property?.galleryImages ?? property?.gallery_images,
    property?.coverImage ?? property?.cover_image,
  );
}

export function propertyDisplayPhotoList(property: any) {
  return propertyDisplayImages(
    property?.images,
    property?.galleryImages ?? property?.gallery_images,
    property?.coverImage ?? property?.cover_image,
  );
}

export function hasRealPropertyDisplayPhotos(property: any) {
  return hasRealPropertyPhotos(
    property?.images,
    property?.galleryImages ?? property?.gallery_images,
    property?.coverImage ?? property?.cover_image,
  );
}

function firstFilled(...values: unknown[]) {
  return values.find((value) => String(value ?? "").trim() !== "");
}

export function propertyPriceNumber(value: unknown): number {
  const raw =
    typeof value === "object" && value
      ? firstFilled(
          (value as any).salePrice,
          (value as any).sale_price,
          (value as any).rentAmount,
          (value as any).rent_amount,
          (value as any).price,
          (value as any).rent,
        )
      : value;

  const text = String(raw || "").toLowerCase().trim();
  if (!text || /request|call|na|n\/a/.test(text)) return 0;

  const amount = Number(text.replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
  if (!amount) return 0;

  if (/\bcr\b|crore/.test(text)) return amount * 10_000_000;
  if (/\blac\b|\blakh\b|\bl\b/.test(text)) return amount * 100_000;
  if (/\bk\b/.test(text)) return amount * 1_000;

  return amount;
}

function trimDecimal(value: number) {
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function formatInrAmount(value: unknown, options: { monthly?: boolean; fallback?: string } = {}) {
  const fallback = options.fallback || "On request";
  const text = String(value || "").trim();

  if (!text) return fallback;
  if (/request|call|na|n\/a/i.test(text)) return fallback;
  if (/₹/.test(text) && /\b(cr|crore|lac|lakh|l)\b/i.test(text)) return text;

  const amount = propertyPriceNumber(value);
  if (!amount) return fallback;

  const suffix = options.monthly ? "/mo" : "";
  if (amount >= 10_000_000) return `₹${trimDecimal(amount / 10_000_000)} Cr${suffix}`;
  if (amount >= 100_000) return `₹${trimDecimal(amount / 100_000)} Lakh${suffix}`;
  return `₹${new Intl.NumberFormat("en-IN").format(Math.round(amount))}${suffix}`;
}

export function formatPropertyPrice(propertyOrValue: any, fallback = "On request") {
  if (propertyOrValue && typeof propertyOrValue === "object") {
    const listingType = String(propertyOrValue.listingType || propertyOrValue.listing_type || "").toLowerCase();
    const monthly = /rent|lease/.test(listingType);
    const raw = firstFilled(
      monthly ? propertyOrValue.rentAmount : undefined,
      monthly ? propertyOrValue.rent_amount : undefined,
      propertyOrValue.price,
      propertyOrValue.salePrice,
      propertyOrValue.sale_price,
      propertyOrValue.rentAmount,
      propertyOrValue.rent_amount,
      propertyOrValue.rent,
    );

    return formatInrAmount(raw, { monthly, fallback });
  }

  return formatInrAmount(propertyOrValue, { fallback });
}
