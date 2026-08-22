import { EMPTY_BRIEF, describeBrief, timelineLabel, type Brief } from "@/lib/briefMatch";
import { API_BASE_URL } from "@/services/backendApi";
import { getCustomerAccountSession } from "@/lib/customerAccount";

/**
 * A brief has to survive a refresh, and a trip through the login screen.
 *
 * Nine questions is a real amount of work to ask of someone. Losing it to a reload — or
 * worse, to the sign-in round trip we ourselves send them on — teaches people not to
 * start. The draft is kept locally for everyone, signed in or not, and only then offered
 * to the account.
 */

const KEY = "sf.brief.draft.v2";

/**
 * A step number past the last question, so a restored brief opens on its shortlist.
 *
 * The page treats any step at or beyond the question count as "show the results", which
 * is what someone reopening a saved brief wants — they already answered it.
 */
export const COMPLETED_STEP = 99;

interface Draft {
  brief: Brief;
  step: number;
  at: number;
}

/** Old drafts are worth restoring; ancient ones are just confusing. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function saveDraft(brief: Brief, step: number): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ brief, step, at: Date.now() } satisfies Draft));
  } catch {
    // A full or blocked store is not worth interrupting the page for.
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;

    const draft = JSON.parse(raw) as Draft;
    if (!draft?.brief || typeof draft.step !== "number") return null;
    if (Date.now() - (draft.at ?? 0) > MAX_AGE_MS) return null;

    // Merged over the defaults so a draft written before a new question existed still
    // restores, with the new field simply empty rather than undefined.
    return { ...draft, brief: { ...EMPTY_BRIEF, ...draft.brief } };
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}

/** A title a person would recognise in a list of saved briefs. */
export function briefTitle(brief: Brief, cityName: string): string {
  const parts = describeBrief(brief).slice(0, 3);

  return [
    brief.purpose || (brief.mode === "rent" ? "Rental" : "Purchase"),
    "in",
    cityName,
    parts.length > 0 ? `· ${parts.join(" · ")}` : "",
  ].join(" ").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function isSignedIn(): boolean {
  return Boolean(getCustomerAccountSession()?.accountAccessToken);
}

/**
 * Keep the brief on the account, reusing saved searches rather than inventing a store.
 *
 * A brief is a saved search with more of the question filled in, and the alerting that
 * already hangs off saved searches is the useful half: with barely any listed inventory,
 * "tell me when something matching turns up" is worth more than any result we can show
 * today.
 */
/**
 * The brief flattened for the filters column, in one place.
 *
 * Both the signed-in save and the anonymous record write this shape, and the demand-gap
 * report reads it. When they drifted apart once before, the alert matcher read `tab`/`q`
 * while the brief wrote `mode`/`where`, and every saved brief matched every listing.
 */
function briefFilters(brief: Brief, cityName: string): Record<string, string> {
  return {
    kind: "brief",
    city: cityName,
    mode: brief.mode,
    purpose: brief.purpose,
    budget: String(brief.budget),
    bhk: brief.bhk.join(","),
    where: brief.where,
    commute: brief.commute,
    timeline: brief.timeline,
    timeline_label: timelineLabel(brief),
    priorities: brief.priorities.join(","),
    notes: brief.notes,
  };
}

export async function saveBriefToAccount(
  brief: Brief,
  cityName: string,
  alerts: boolean,
): Promise<void> {
  const token = getCustomerAccountSession()?.accountAccessToken;
  if (!token) throw new Error("Sign in to save this brief.");

  const response = await fetch(`${API_BASE_URL}/accounts/saved-searches`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: briefTitle(brief, cityName),
      // Stored as the brief itself, so reopening it later rebuilds the whole thing rather
      // than a lossy summary of it.
      filters: briefFilters(brief, cityName),
      alert_enabled: alerts,
      alert_channel: "whatsapp",
      alert_frequency: "daily",
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json?.message || "Could not save this brief.");
}

/**
 * Turn a stored brief back into one that can be answered again.
 *
 * Saved searches hold flat strings, because that is what the filters column takes. This
 * is the other half of `saveBriefToAccount` — without it a saved brief could be listed
 * but never reopened, which is most of the value of having saved it.
 */
export function briefFromFilters(filters: Record<string, unknown>): Brief {
  const text = (key: string) => String(filters?.[key] ?? "").trim();

  const sizes = text("bhk")
    .split(",")
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value));

  return {
    ...EMPTY_BRIEF,
    mode: text("mode") === "buy" ? "buy" : "rent",
    purpose: text("purpose"),
    budget: Number.parseInt(text("budget"), 10) || EMPTY_BRIEF.budget,
    bhk: sizes,
    where: text("where"),
    commute: text("commute"),
    timeline: text("timeline"),
    priorities: text("priorities").split(",").map((value) => value.trim()).filter(Boolean),
    notes: text("notes"),
  };
}

/** Put a saved brief back in the drafting slot, opened at its shortlist. */
export function reopenBrief(filters: Record<string, unknown>): void {
  saveDraft(briefFromFilters(filters), COMPLETED_STEP);
}

const ANON_TOKEN_KEY = "sf.brief.anon.v1";
const LAST_RECORDED_KEY = "sf.brief.recorded.v1";

/**
 * A random id for this browser, and nothing else.
 *
 * Not a user id and not derived from anything about the person — it exists so that editing
 * a brief updates one row instead of leaving a trail of near-duplicates from somebody
 * changing their mind. Cleared with the brief.
 */
function anonToken(): string {
  try {
    const existing = window.localStorage.getItem(ANON_TOKEN_KEY);
    if (existing) return existing;

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const token = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    window.localStorage.setItem(ANON_TOKEN_KEY, token);

    return token;
  } catch {
    return "";
  }
}

/**
 * Record what someone asked for, without asking who they are.
 *
 * Until this existed a brief only reached the database if the person signed in to save it,
 * so the best demand signal on the site — nine deliberate answers, including the parts no
 * filter can express — lived in one browser and died with the tab. No name, phone or email
 * is sent; the server refuses those fields outright.
 *
 * Fires when the shortlist is shown and again only if the brief actually changed, so
 * reading your own results does not write a row every render.
 */
export async function recordBriefAnonymously(
  brief: Brief,
  city: string,
  counts: { shortlisted: number; scanned: number },
): Promise<void> {
  const token = anonToken();
  if (!token) return;

  const filters = briefFilters(brief, city);

  const fingerprint = JSON.stringify(filters);
  try {
    if (window.localStorage.getItem(LAST_RECORDED_KEY) === fingerprint) return;
  } catch {
    // A blocked store just means we may record the same brief twice; not worth failing for.
  }

  try {
    await fetch(`${API_BASE_URL}/briefs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token, filters, shortlisted: counts.shortlisted, scanned: counts.scanned }),
    });
    window.localStorage.setItem(LAST_RECORDED_KEY, fingerprint);
  } catch {
    // Demand capture must never interrupt somebody reading their shortlist.
  }
}
