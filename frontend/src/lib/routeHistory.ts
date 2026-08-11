/**
 * The page the visitor was on before this one.
 *
 * document.referrer is no use inside a single-page app: it only changes on a full document
 * load, so every client-side click from a society page to the advisor leaves it reading
 * whatever loaded the tab an hour ago. The router has to remember for itself.
 *
 * Only the previous entry is kept. A full trail would be a browsing history attached to a
 * conversation, and this data is deliberately anonymous.
 */
let previousPath = "";
let currentPath = typeof window === "undefined" ? "" : window.location.pathname + window.location.search;

export function noteRouteChange(path: string) {
  if (path === currentPath) return;
  previousPath = currentPath;
  currentPath = path;
}

/**
 * Where this visit came from: an in-app path when there is one, otherwise the HOST of an
 * external referrer. Never the full external URL — another site's query string can carry
 * the visitor's search terms, and none of that belongs in an anonymous table.
 */
export function entryReferrer(): string {
  if (previousPath) return previousPath.slice(0, 255);

  try {
    const raw = document.referrer;
    if (!raw) return "";
    const url = new URL(raw);
    if (url.host === window.location.host) return (url.pathname + url.search).slice(0, 255);
    return url.host.slice(0, 255);
  } catch {
    return "";
  }
}
