/**
 * The last verified-society count we showed for each city.
 *
 * The catalogue is fetched on every load, so the headline number had nothing to display
 * until it arrived and showed an em dash for a second or two. That dash is deliberate — an
 * invented "240+" that visibly corrects itself is worse on the one number carrying the
 * verification promise — but a number we genuinely showed last visit is not invented, and
 * it is almost always still right.
 *
 * Small enough to keep whole: six cities, one integer each.
 */
const KEY = "sf.society.counts.v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Cache = { at: number; counts: Record<string, number> };

function read(): Cache | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cache;
    // Capped: a count a week stale stops being a better opening claim than no claim.
    if (!parsed?.at || Date.now() - parsed.at > TTL_MS) return null;
    return parsed?.counts && typeof parsed.counts === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** The count to show before the catalogue lands, or null when we have never shown one. */
export function cachedSocietyCount(citySlug: string): number | null {
  const value = read()?.counts?.[citySlug];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function rememberSocietyCount(citySlug: string, count: number) {
  try {
    const current = read()?.counts ?? {};
    window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), counts: { ...current, [citySlug]: count } }));
  } catch {
    // Not remembering costs one dash on the next load.
  }
}
