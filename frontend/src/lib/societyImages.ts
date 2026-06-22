const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://final-now.onrender.com/api';

const APPROVED_SOCIETY_IMAGE_STATUSES = [
  'licensed_uploaded',
  'self_shot_uploaded',
  'developer_permission_received',
  'approved_for_live',
];

function escapeSvgText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function field<T = unknown>(item: any, camel: string, snake: string, fallback: T): T {
  const value = item?.[camel] ?? item?.[snake];
  return (value === undefined || value === null || value === '') ? fallback : value;
}

function firstText(...values: Array<unknown>) {
  return values
    .map((value) => String(value || '').trim())
    .find(Boolean) || '';
}

export function isRenderableSocietyImage(value: unknown) {
  const url = String(value || '').trim();

  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('blob:')) return true;

  if (!/^https?:\/\//i.test(url)) return false;

  if (/maps\.google|google\.com\/maps|maps\.app\.goo\.gl/i.test(url)) return false;
  if (/maps\.googleapis\.com\/maps\/api\/place\/photo/i.test(url)) return false;

  return /\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(url);
}

export function hasApprovedSocietyImage(society: any) {
  const approvedByAdmin = Boolean(field<boolean>(society, 'imageApprovedByAdmin', 'image_approved_by_admin', false));
  const imageStatus = String(field<string>(society, 'imageStatus', 'image_status', 'placeholder'));

  return approvedByAdmin && APPROVED_SOCIETY_IMAGE_STATUSES.includes(imageStatus);
}

export function approvedSocietyImage(society: any) {
  if (!hasApprovedSocietyImage(society)) return '';

  const galleryImages = society?.galleryImages ?? society?.gallery_images;
  const firstGalleryImage = Array.isArray(galleryImages) ? galleryImages.find(Boolean) : '';

  return [
    field<string>(society, 'imageUrl', 'image_url', ''),
    field<string>(society, 'coverImage', 'cover_image', ''),
    firstGalleryImage,
  ].find(isRenderableSocietyImage) || '';
}


export function hasGooglePlacesDisplayPhoto(society: any) {
  const approvedByAdmin = Boolean(field<boolean>(society, 'imageApprovedByAdmin', 'image_approved_by_admin', false));
  const imageStatus = String(field<string>(society, 'imageStatus', 'image_status', 'placeholder'));
  const placeId = firstText(field<string>(society, 'placeId', 'place_id', ''));
  const referenceUrl = firstText(field<string>(society, 'imageReferenceUrl', 'image_reference_url', ''));
  const credit = firstText(field<string>(society, 'imageCredit', 'image_credit', ''));

  return (
    approvedByAdmin &&
    imageStatus === 'google_places_reference_found' &&
    Boolean(placeId) &&
    (/google/i.test(credit) || /google\.com|maps\.app\.goo\.gl/i.test(referenceUrl))
  );
}

export function googlePlacesSocietyPhotoUrl(society: any, width = 1400) {
  if (!hasGooglePlacesDisplayPhoto(society)) return '';

  const slugOrId = encodeURIComponent(
    firstText(field<string>(society, 'slug', 'slug', ''), field<string>(society, 'id', 'id', '')),
  );

  if (!slugOrId) return '';

  return `${API_BASE}/societies/${slugOrId}/google-place-photo?w=${width}`;
}

export function societyPlaceholderImage(input: any, locationOverride = '') {
  const name = typeof input === 'string'
    ? input
    : firstText(input?.name, input?.title, 'SocietyFlats');

  const location = locationOverride || (typeof input === 'string'
    ? 'Gurugram'
    : firstText(input?.sector, input?.locality, input?.address, 'Gurugram'));

  const initial = escapeSvgText(name.trim().charAt(0).toUpperCase() || 'S');
  const safeName = escapeSvgText(name || 'SocietyFlats');
  const safeLocation = escapeSvgText(location || 'Gurugram');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="900" viewBox="0 0 1400 900" role="img" aria-label="${safeName} SocietyFlats placeholder">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#eff6ff"/>
      <stop offset="42%" stop-color="#dbeafe"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="card" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#e0f2fe" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="26" stdDeviation="28" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
  </defs>
  <rect width="1400" height="900" fill="url(#bg)"/>
  <circle cx="1180" cy="140" r="210" fill="#bfdbfe" opacity="0.45"/>
  <circle cx="190" cy="780" r="260" fill="#dbeafe" opacity="0.65"/>
  <g opacity="0.18" fill="none" stroke="#2563eb" stroke-width="3">
    <path d="M90 705 C260 610 340 690 505 595 S780 505 960 590 1200 650 1320 565"/>
    <path d="M120 190 C275 105 400 170 560 115 S840 65 1040 150 1210 225 1310 160"/>
  </g>
  <g filter="url(#shadow)">
    <rect x="220" y="180" width="960" height="540" rx="54" fill="url(#card)" stroke="#bfdbfe" stroke-width="2"/>
    <rect x="292" y="500" width="816" height="96" rx="28" fill="#ffffff" opacity="0.72"/>
    <g transform="translate(356 258)">
      <rect x="0" y="94" width="114" height="190" rx="22" fill="#1d4ed8" opacity="0.92"/>
      <rect x="146" y="38" width="138" height="246" rx="24" fill="#2563eb" opacity="0.82"/>
      <rect x="318" y="0" width="166" height="284" rx="26" fill="#60a5fa" opacity="0.8"/>
      <rect x="36" y="128" width="24" height="24" rx="6" fill="#eff6ff"/>
      <rect x="36" y="172" width="24" height="24" rx="6" fill="#eff6ff"/>
      <rect x="36" y="216" width="24" height="24" rx="6" fill="#eff6ff"/>
      <rect x="186" y="78" width="28" height="28" rx="7" fill="#eff6ff"/>
      <rect x="186" y="130" width="28" height="28" rx="7" fill="#eff6ff"/>
      <rect x="186" y="182" width="28" height="28" rx="7" fill="#eff6ff"/>
      <rect x="368" y="48" width="32" height="32" rx="8" fill="#eff6ff"/>
      <rect x="368" y="108" width="32" height="32" rx="8" fill="#eff6ff"/>
      <rect x="368" y="168" width="32" height="32" rx="8" fill="#eff6ff"/>
    </g>
    <circle cx="878" cy="382" r="112" fill="#ffffff" stroke="#bfdbfe" stroke-width="8"/>
    <text x="878" y="425" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="118" font-weight="800" fill="#1d4ed8">${initial}</text>
    <text x="700" y="556" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800" fill="#0f172a">${safeName}</text>
    <text x="700" y="614" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="600" fill="#475569">${safeLocation}</text>
    <text x="700" y="668" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="800" letter-spacing="2.5" fill="#2563eb">SOCIETYFLATS VERIFIED PROFILE</text>
  </g>
</svg>`.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function societyDisplayImage(society: any) {
  return approvedSocietyImage(society) || googlePlacesSocietyPhotoUrl(society) || societyPlaceholderImage(society);
}


export type SocietyImageAttribution = {
  label: string;
  tone: "approved" | "google" | "placeholder";
  title: string;
};

export function societyImageAttribution(society: any): SocietyImageAttribution {
  const credit = firstText(field<string>(society, 'imageCredit', 'image_credit', ''));

  if (hasApprovedSocietyImage(society) && approvedSocietyImage(society)) {
    return {
      label: credit ? `Image: ${credit}` : "Image: Approved source",
      tone: "approved",
      title: "This image is approved for public display by SocietyFlats admin.",
    };
  }

  if (hasGooglePlacesDisplayPhoto(society)) {
    return {
      label: "Image: Google Places",
      tone: "google",
      title: "Reference image displayed through Google Places. It is not owned by SocietyFlats.",
    };
  }

  return {
    label: "Image: SocietyFlats placeholder",
    tone: "placeholder",
    title: "Placeholder visual used until an approved or reference image is available.",
  };
}

export function societyImageAttributionClassName(tone: SocietyImageAttribution["tone"]): string {
  if (tone === "approved") {
    return "bg-emerald-950/80 text-white ring-1 ring-white/20";
  }

  if (tone === "google") {
    return "bg-slate-950/80 text-white ring-1 ring-white/20";
  }

  return "bg-white/90 text-slate-700 ring-1 ring-slate-200";
}
