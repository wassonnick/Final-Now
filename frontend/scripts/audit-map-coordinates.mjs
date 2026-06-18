const API_BASE = process.env.VITE_API_BASE_URL || "https://final-now.onrender.com/api";
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || process.env.VITE_ADMIN_API_TOKEN || "";

function clean(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function isValidCoord(latRaw, lngRaw) {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function extractGooglePlacePinFromUrl(urlRaw) {
  const raw = clean(urlRaw);
  if (!raw) return null;

  const decoded = decodeURIComponent(raw);
  const match = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);

  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!isValidCoord(lat, lng)) return null;

  return { lat, lng };
}

function coordinateDistanceMeters(lat1Raw, lng1Raw, lat2Raw, lng2Raw) {
  const lat1 = Number(lat1Raw);
  const lng1 = Number(lng1Raw);
  const lat2 = Number(lat2Raw);
  const lng2 = Number(lng2Raw);

  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return null;

  const radius = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * radius * Math.asin(Math.sqrt(a));
}

function googleSearchUrl(society) {
  const parts = [
    society.name,
    society.sector,
    society.locality,
    society.city || "Gurugram",
    "Google Maps",
  ]
    .map(clean)
    .filter(Boolean);

  return `https://www.google.com/maps/search/${encodeURIComponent(parts.join(" "))}`;
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} for ${url}`);
  }

  return response.json();
}

function unwrapItems(json) {
  const data = json?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function fetchPublicSocieties() {
  const json = await fetchJson(`${API_BASE}/societies?per_page=200`);
  return unwrapItems(json);
}

async function fetchAdminSocieties() {
  if (!ADMIN_TOKEN) return [];

  const headers = {
    "X-Admin-Token": ADMIN_TOKEN,
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  };

  let page = 1;
  const all = [];

  while (page <= 100) {
    const json = await fetchJson(`${API_BASE}/admin/societies?per_page=100&page=${page}`, headers);
    const items = unwrapItems(json);
    all.push(...items);

    const meta = json?.data;
    const current = Number(meta?.current_page || page);
    const last = Number(meta?.last_page || page);

    if (!items.length || current >= last) break;
    page += 1;
  }

  return all;
}

function printSociety(item, index) {
  const lat = clean(item.latitude);
  const lng = clean(item.longitude);
  const valid = isValidCoord(lat, lng);
  const publicStatus = item.is_published ? "published" : "draft";
  const adminUrl = `http://localhost:5173/admin/societies/${item.id}/edit`;
  const publicUrl = item.slug ? `https://www.societyflats.com/society/${item.slug}` : "";
  const searchUrl = googleSearchUrl(item);

  console.log("");
  console.log(`${index}. ${item.name}`);
  console.log(`   id: ${item.id}`);
  console.log(`   slug: ${item.slug || "-"}`);
  console.log(`   status: ${item.status || "-"} | ${publicStatus}`);
  console.log(`   location: ${[item.sector, item.locality, item.city || "Gurugram"].map(clean).filter(Boolean).join(", ") || "-"}`);
  console.log(`   coordinates: ${valid ? `${lat}, ${lng}` : "MISSING"}`);

  const urlPin = extractGooglePlacePinFromUrl(item.google_maps_url);
  if (valid && urlPin) {
    const distance = coordinateDistanceMeters(lat, lng, urlPin.lat, urlPin.lng);
    const rounded = distance === null ? null : Math.round(distance);

    if (rounded !== null && rounded > 25) {
      console.log(`   ⚠️ coordinate mismatch: saved URL place pin is ${urlPin.lat}, ${urlPin.lng} (${rounded}m away)`);
      console.log("   action: reopen admin, extract again from the saved Google Maps URL, verify, and save corrected coordinates.");
    } else if (rounded !== null) {
      console.log(`   URL place pin check: OK (${rounded}m difference)`);
    }
  } else if (!valid && urlPin) {
    console.log(`   suggested exact place pin from saved URL: ${urlPin.lat}, ${urlPin.lng}`);
  }
  console.log(`   admin edit: ${adminUrl}`);
  if (publicUrl) console.log(`   public page: ${publicUrl}`);
  console.log(`   Google Maps search: ${searchUrl}`);
  if (item.google_maps_url) console.log(`   saved Google Maps URL: ${item.google_maps_url}`);
}

async function main() {
  console.log("===== SocietyFlats map coordinate audit =====");
  console.log(`API: ${API_BASE}`);
  console.log("");

  const publicItems = await fetchPublicSocieties();

  const publicMissing = publicItems.filter((item) => !isValidCoord(item.latitude, item.longitude));
  const publicReady = publicItems.filter((item) => isValidCoord(item.latitude, item.longitude));

  console.log(`Public societies: ${publicItems.length}`);
  console.log(`Ready map pins: ${publicReady.length}`);
  console.log(`Missing public pins: ${publicMissing.length}`);

  if (publicReady.length) {
    console.log("");
    console.log("===== READY PUBLIC MAP PINS =====");
    publicReady.forEach(printSociety);
  }

  if (publicMissing.length) {
    console.log("");
    console.log("===== PUBLIC SOCIETIES NEEDING COORDINATES =====");
    publicMissing.forEach(printSociety);
  }

  const adminItems = await fetchAdminSocieties();

  if (adminItems.length) {
    const adminMissing = adminItems.filter((item) => !isValidCoord(item.latitude, item.longitude));
    const draftWithInventory = adminMissing.filter((item) => Number(item.properties_count || 0) > 0);

    console.log("");
    console.log("===== ADMIN BACKFILL SUMMARY =====");
    console.log(`Admin societies: ${adminItems.length}`);
    console.log(`Missing admin coordinates: ${adminMissing.length}`);
    console.log(`Missing coordinates but has inventory: ${draftWithInventory.length}`);

    if (draftWithInventory.length) {
      console.log("");
      console.log("===== PRIORITY DRAFT/ADMIN SOCIETIES WITH INVENTORY =====");
      draftWithInventory.slice(0, 25).forEach(printSociety);
    }
  } else {
    console.log("");
    console.log("Admin audit skipped because ADMIN_API_TOKEN/VITE_ADMIN_API_TOKEN was not provided.");
  }

  console.log("");
  console.log("===== Backfill rule =====");
  console.log("Open the Google Maps search, select the exact society place page, copy the full URL, paste in admin, extract coordinates, open extracted pin, then save only after visual verification.");
}

main().catch((error) => {
  console.error("");
  console.error("Coordinate audit failed:");
  console.error(error.message || error);
  process.exit(1);
});
