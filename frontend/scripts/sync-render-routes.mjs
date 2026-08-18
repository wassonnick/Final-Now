#!/usr/bin/env node
/**
 * Keep render.yaml's rewrite rules in step with the shells the build actually wrote.
 *
 * Render serves a nested static file only when a rewrite names it. Anything else falls
 * through to the SPA catch-all, which answers with the homepage's title, the homepage's
 * canonical and `noindex` — so a prerendered page with no rule tells Google it is a
 * duplicate of the homepage and should not be indexed.
 *
 * That is not hypothetical. The rules were maintained by hand, one URL at a time, and the
 * page types added since were never added here: all 69 landmark pages, six /gurgaon-flats
 * pages and a scatter of locality and builder pages — 79 URLs advertised in the sitemap,
 * every one of them serving that fallback, while Search Console filled up with "alternate
 * page with proper canonical" and "excluded by noindex tag".
 *
 * Hand-maintenance is the bug, so this generates the rules from `dist/` instead. A page
 * type invented next year gets its rule the first time it is built, without anyone
 * remembering this file exists.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(HERE, "../dist");
const RENDER_YAML = resolve(HERE, "../../render.yaml");

const BEGIN = "      # BEGIN generated shell routes — written by scripts/sync-render-routes.mjs";
const END = "      # END generated shell routes";

/**
 * Namespaces already served by a wildcard rule.
 *
 * These hold hundreds of shells each and every path under them is prerendered, so one
 * `/society/*` beats 526 exact rules. Listing them individually would also push the file
 * past anything a person could read.
 */
const WILDCARD_NAMESPACES = ["society", "property", "compare", "rwa", "ncr"];

/** Every prerendered shell, as the URL path that must resolve to it. */
function shellPaths(dir = DIST, prefix = "") {
  const found = [];

  for (const entry of readdirSync(dir)) {
    if (entry === "assets" || entry.startsWith(".")) continue;

    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;

    const path = `${prefix}/${entry}`;
    try {
      statSync(join(full, "index.html"));
      found.push(path);
    } catch {
      // A directory that only groups other shells; keep walking.
    }
    found.push(...shellPaths(full, path));
  }

  return found;
}

/**
 * Every shell needs a rule, including the single-segment ones.
 *
 * I assumed Render resolved /insights from /insights/index.html unprompted, because the
 * pages I spot-checked worked. They worked because they had hand-written rules. The two
 * that did not — /maps and /builder-portal — were serving the homepage fallback the whole
 * time, and the first version of this generator dropped their rules on the floor.
 */
function rulesNeeded() {
  return shellPaths()
    .filter((path) => !WILDCARD_NAMESPACES.includes(path.split("/").filter(Boolean)[0]))
    .sort();
}

function block(paths) {
  const rules = paths
    .map((path) => `      - type: rewrite\n        source: ${path}\n        destination: ${path}/index.html`)
    .join("\n");

  return [
    BEGIN,
    `      # ${paths.length} prerendered pages. Do not edit by hand — rebuild instead.`,
    rules,
    END,
  ].join("\n");
}

const yaml = readFileSync(RENDER_YAML, "utf8");
const paths = rulesNeeded();

if (paths.length === 0) {
  console.error("Render routes: no shells found in dist/ — run the prerender first.");
  process.exit(1);
}

const start = yaml.indexOf(BEGIN);
const finish = yaml.indexOf(END);

if (start === -1 || finish === -1) {
  console.error(`Render routes: markers missing from render.yaml. Expected:\n${BEGIN}\n${END}`);
  process.exit(1);
}

const updated = yaml.slice(0, start) + block(paths) + yaml.slice(finish + END.length);

if (updated === yaml) {
  console.log(`Render routes: ${paths.length} shell routes already in sync.`);
  process.exit(0);
}

/**
 * On the deploy host this only ever verifies.
 *
 * Render reads routing from the committed render.yaml before the build runs, so rewriting
 * the file mid-build changes nothing about the deploy that is happening — and on a
 * read-only checkout it would fail the build outright. The rules have to be generated on a
 * developer's machine and committed. Here, a mismatch is a mistake worth stopping for.
 */
const verifyOnly = process.argv.includes("--check") || process.env.RENDER === "true" || process.env.CI === "true";

if (verifyOnly) {
  // A warning, not a failure. The deploy host builds shells from live data, so drift here
  // is expected and self-correcting: the prerenderer has already dropped any URL without a
  // rule from the sitemap, so nothing unroutable is advertised either way. Failing the
  // deploy over a society published an hour ago would be worse than the bug.
  console.warn(
    "Render routes: render.yaml does not match the shells this build wrote. "
      + "Any URL without a rule was dropped from the sitemap. "
      + "Run `npm run build` locally and commit render.yaml to publish them.",
  );
  process.exit(0);
}

writeFileSync(RENDER_YAML, updated);
console.log(`Render routes: wrote ${paths.length} shell routes to render.yaml — commit this file with the build.`);
