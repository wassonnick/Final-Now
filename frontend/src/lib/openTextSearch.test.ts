import { describe, expect, it } from "vitest";
import { readTerms, searchOpenText } from "@/lib/openTextSearch";

/**
 * Matching against what a society says about itself.
 *
 * Every case here is a bug this matcher shipped with. Substring matching had "emi" hitting
 * "premium" across 375 societies; one postal address containing "Aravalli" made the word a
 * location for every query; and a brand called "Bestech Park View" answered "park facing"
 * on its signage alone.
 */

const society = (over: Record<string, unknown> = {}) => ({
  id: Math.random(),
  name: "Test Heights",
  locality: "Sector 65",
  sector: "Sector 65",
  city: "Gurugram",
  builder: "Testco",
  description: "A premium residential project with a clubhouse and landscaped gardens.",
  amenities: ["Clubhouse", "Gym"],
  ...over,
});

describe("searchOpenText", () => {
  /**
   * The bug that mattered most: substring matching had "emi" hitting "premium" in 375
   * societies. "emi" itself is now lifted out as unrecorded before matching, so the rule
   * is proved with a word that does reach the matcher.
   */
  it("matches whole words, not substrings", () => {
    const rows = [
      society({ id: 1, name: "Street Court", description: "A short walk from Liverpool Street." }),
      society({ id: 2, name: "Water Court", description: "A pool and a gym on site." }),
    ];

    const names = searchOpenText(rows, "pool").matches.map((row) => row.name);

    expect(names).toEqual(["Water Court"]);
  });

  it("finds a term written anywhere the society describes itself", () => {
    const rows = [
      society({ id: 1, name: "Hill View", description: "Panoramic Aravalli Hills views from every tower." }),
      society({ id: 2, name: "Plain Court", description: "A quiet low-rise development." }),
    ];

    const outcome = searchOpenText(rows, "aravalli");

    expect(outcome.matches.map((row) => row.name)).toEqual(["Hill View"]);
  });

  /**
   * A single society with "Aravalli" in its address once made the word a place for every
   * query, after which it was matched against addresses and found nothing anywhere.
   */
  it("treats a word as a place only when it names one for several societies", () => {
    const rows = [
      society({ id: 1, address: "Near Aravalli Road", description: "Overlooking the Aravalli range." }),
      society({ id: 2, description: "A tower with Aravalli views." }),
      society({ id: 3, description: "No view to speak of." }),
    ];

    const outcome = searchOpenText(rows, "aravalli");

    expect(outcome.matches).toHaveLength(2);
    expect(outcome.unknownTerms).toHaveLength(0);
  });

  /** A place name filters by location, so prose mentioning another city must not match. */
  it("does not match a city named only in another society's prose", () => {
    const rows = [
      society({ id: 1, name: "Real Noida", city: "Noida", locality: "Sector 62", sector: "Sector 62" }),
      society({ id: 2, name: "Second Noida", city: "Noida", locality: "Sector 18", sector: "Sector 18" }),
      society({ id: 3, name: "Delhi Place", city: "Delhi", locality: "Greater Kailash", sector: "GK",
        description: "Well connected to the Noida expressway." }),
    ];

    const names = searchOpenText(rows, "noida").matches.map((row) => row.name);

    expect(names).toContain("Real Noida");
    expect(names).not.toContain("Delhi Place");
  });

  /**
   * "Bestech Park View" is a brand, not an outlook, and the description repeats the
   * project name in nearly every sentence — so the name has to be stripped from the prose
   * before a view term can match it.
   */
  it("will not let a project's own name answer a question about its outlook", () => {
    const rows = [
      society({ id: 1, name: "Bestech Park View", description: "Bestech Park View has 8 towers and 608 units." }),
      society({ id: 2, name: "Real Outlook", description: "Apartments here are park facing with open green views." }),
    ];

    const names = searchOpenText(rows, "park facing").matches.map((row) => row.name);

    expect(names).toEqual(["Real Outlook"]);
  });

  it("says which words the catalogue has never heard of", () => {
    const outcome = searchOpenText([society()], "unicorn stables");

    expect(outcome.unknownTerms).toContain("unicorn");
    expect(outcome.matches).toHaveLength(0);
  });

  it("names the topics it does not record at all", () => {
    expect(searchOpenText([society()], "no emi till possession").notRecorded).toContain("builder payment plans");
    expect(searchOpenText([society()], "vastu compliant").notRecorded).toContain("Vastu orientation");
  });

  /**
   * Terms combine with AND, but demanding all of them returned nothing for "low rise
   * builder floor" — three ways of saying one thing. The vaguest is dropped, and named.
   */
  it("relaxes the vaguest requirement rather than returning nothing", () => {
    const rows = [
      society({ id: 1, description: "A low-rise development of independent floors.", amenities: [] }),
      society({ id: 2, description: "A tower with a large clubhouse.", amenities: [] }),
    ];

    // Both words exist in the catalogue, but no single society has both.
    const outcome = searchOpenText(rows, "low rise clubhouse");

    expect(outcome.matches.length).toBeGreaterThan(0);
    expect(outcome.relaxedTerms.length).toBeGreaterThan(0);
    expect(outcome.unknownTerms).toHaveLength(0);
  });

  /** Where someone wants to live outlives what they want it to be like. */
  it("gives up a description before it gives up a location", () => {
    const rows = [
      // Park facing, but in the wrong part of the city.
      society({ id: 1, name: "Green Outlook", city: "Gurugram", locality: "Sector 92", sector: "Sector 92",
        description: "Apartments here are park facing with open green views.", amenities: [] }),
      society({ id: 2, name: "Right Road", city: "Gurugram", locality: "Golf Course Road", sector: "Golf Course Road",
        description: "A tower on the main road.", amenities: [] }),
      society({ id: 3, name: "Also Right Road", city: "Gurugram", locality: "Golf Course Road", sector: "Golf Course Road",
        description: "Another tower.", amenities: [] }),
    ];

    const outcome = searchOpenText(rows, "park facing golf course road");

    // The location survives; the adjective is what gets given up, and is named.
    expect(outcome.relaxedTerms).toContain("park facing");
    expect(outcome.matches.map((row) => row.name)).not.toContain("Green Outlook");
    expect(outcome.matches.length).toBeGreaterThan(0);
  });

  it("returns everything when there is nothing to search for", () => {
    const rows = [society(), society({ id: 2 })];

    expect(searchOpenText(rows, "   ").matches).toHaveLength(2);
  });

  it("quotes the sentence that answered the question", () => {
    const rows = [society({ id: 1, description: "First sentence. Panoramic Aravalli views here. Third." })];

    const outcome = searchOpenText(rows, "aravalli");
    const reason = outcome.reasons.get(String(rows[0].id));

    expect(reason?.snippet).toContain("Aravalli");
    expect(reason?.snippet).not.toContain("Third");
  });
});

describe("readTerms", () => {
  it("takes a known phrase whole rather than as separate weak words", () => {
    const { terms } = readTerms("golf course facing");

    expect(terms.map((term) => term.term)).toContain("golf course facing");
  });

  it("drops filler that every listing contains", () => {
    const { terms } = readTerms("a residential project in a good location");

    expect(terms.map((term) => term.term)).not.toContain("project");
    expect(terms.map((term) => term.term)).not.toContain("location");
  });
});
