import { describe, expect, it } from "vitest";
import {
  buildShortlist, describeBrief, EMPTY_BRIEF, formatMoney, prioritiesFor, unrecordedPriorities,
  type Brief, type CommuteContext,
} from "@/lib/briefMatch";

/**
 * Scoring societies against one person's brief.
 *
 * The bug worth guarding hardest: a priority we cannot judge was being dropped from the
 * average instead of counting against it, so a society with no connectivity data led a
 * commute-led brief at 96% while the same card admitted it could not be assessed on
 * commute. Unmeasured is not the same as good.
 */

const brief = (over: Partial<Brief> = {}): Brief => ({ ...EMPTY_BRIEF, ...over });

const society = (over: Record<string, unknown> = {}) => ({
  id: 1,
  name: "Test Heights",
  sector: "Sector 65",
  locality: "Golf Course Extension Road",
  city: "Gurugram",
  builder: "Testco",
  score: 8,
  rentRange: "₹35,000 - ₹80,000",
  buyRange: "₹1.2Cr - ₹3Cr",
  configuration: "2 BHK, 3 BHK",
  projectStatus: "Ready to Move",
  reraNumber: "HRERA 123/2020",
  scoreBreakdown: {
    connectivity: { value: 9.1, confidence: 1, signals: { metro: { present: true, value: 9.8, weight: 0.32, label: "911m to nearest metro/transit" } } },
    lifestyle: { value: 8, confidence: 1, signals: { amenities: { present: true, value: 8, weight: 1, label: "amenity richness" } } },
    security: { value: 8, confidence: 1, signals: {} },
    maintenance: { value: 7, confidence: 1, signals: {} },
    investment: { value: 7, confidence: 1, signals: {} },
  },
  ...over,
});

describe("buildShortlist", () => {
  it("reports the funnel it produced", () => {
    const rows = [society(), society({ id: 2 }), society({ id: 3 })];
    const result = buildShortlist(rows, brief({ bhk: [3], budget: 60000 }));

    expect(result.scanned).toBe(3);
    expect(result.eligible).toBeGreaterThan(0);
    expect(result.fits.length).toBeGreaterThan(0);
  });

  it("excludes a society whose cheapest home is over the rent ceiling", () => {
    const rows = [
      society({ id: 1, name: "Affordable", rentRange: "₹20,000 - ₹40,000" }),
      society({ id: 2, name: "Expensive", rentRange: "₹2,00,000 - ₹4,00,000" }),
    ];

    const names = buildShortlist(rows, brief({ budget: 50000 })).fits.map((fit) => fit.society.name);

    expect(names).toContain("Affordable");
    expect(names).not.toContain("Expensive");
  });

  /**
   * A requirement that matches nothing is loosened rather than returning an empty page,
   * and whatever was given up is named.
   */
  it("loosens a requirement instead of returning nothing", () => {
    const rows = [society({ rentRange: "₹2,00,000 - ₹4,00,000" })];
    const result = buildShortlist(rows, brief({ budget: 20000 }));

    expect(result.fits.length).toBeGreaterThan(0);
    expect(result.loosened.length).toBeGreaterThan(0);
  });

  /**
   * Once the budget is let go, the smallest stretch leads. Ranking on fit alone put a
   * ₹5.31 Cr project at the top of a ₹1.5 Cr first-home brief.
   */
  it("leads with the cheapest near-miss once the budget is loosened", () => {
    const rows = [
      society({ id: 1, name: "Way Over", buyRange: "₹9 Cr - ₹20 Cr", score: 9.9 }),
      society({ id: 2, name: "Just Over", buyRange: "₹1.8 Cr - ₹3 Cr", score: 6 }),
    ];

    const result = buildShortlist(rows, brief({ mode: "buy", budget: 15000000 }));

    expect(result.loosened.length).toBeGreaterThan(0);
    expect(result.fits[0].society.name).toBe("Just Over");
  });

  /** Missing data must not raise a score. */
  it("counts an unjudgeable priority against the fit rather than skipping it", () => {
    const measured = society({ id: 1, name: "Measured" });
    const unmeasured = society({ id: 2, name: "Unmeasured", scoreBreakdown: null });

    const result = buildShortlist([measured, unmeasured], brief({ priorities: ["location"] }));
    const byName = Object.fromEntries(result.fits.map((fit) => [fit.society.name, fit]));

    expect(byName.Measured.percent).toBeGreaterThan(byName.Unmeasured.percent);
    expect(byName.Unmeasured.unknown).toContain("Location & commute");
  });

  it("quotes the measured signal behind a chosen priority", () => {
    const result = buildShortlist([society()], brief({ priorities: ["location"] }));

    expect(result.fits[0].reasons.map((reason) => reason.label).join(" ")).toContain("911m");
  });

  /** A commute is the only thing here counted in metres, so it outweighs the rest. */
  it("ranks by measured commute distance when one is given", () => {
    const rows = [
      society({ id: 1, name: "Far" }),
      society({ id: 2, name: "Close" }),
    ];
    const commute: CommuteContext = {
      name: "Cyber Hub",
      slug: "dlf-cyber-hub",
      distances: new Map([["1", 7.4], ["2", 0.46]]),
    };

    const result = buildShortlist(rows, brief({ priorities: ["location"] }), 6, commute);

    expect(result.fits[0].society.name).toBe("Close");
    expect(result.fits[0].reasons[0].label).toContain("from Cyber Hub");
  });

  it("does not invent a fit for a society with nothing scored", () => {
    const rows = [society({ scoreBreakdown: null, reraNumber: "", builder: "", projectStatus: "" })];
    const result = buildShortlist(rows, brief());

    expect(result.fits[0].percent).toBeLessThan(100);
  });
});

describe("brief vocabulary", () => {
  it("offers only the priorities that make sense for the mode", () => {
    const rent = prioritiesFor("rent").map((priority) => priority.id);
    const buy = prioritiesFor("buy").map((priority) => priority.id);

    expect(rent).toContain("pet_friendly");
    expect(rent).not.toContain("no_emi");
    expect(buy).toContain("no_emi");
    expect(buy).not.toContain("negotiable");
  });

  /** The questions a catalogue answers worst are still worth capturing. */
  it("marks the priorities nothing in the data can answer", () => {
    const asked = unrecordedPriorities(brief({ mode: "buy", priorities: ["no_emi", "location"] }));

    expect(asked.map((priority) => priority.id)).toEqual(["no_emi"]);
  });

  it("describes a brief the way its owner would", () => {
    const chips = describeBrief(brief({
      mode: "buy", budget: 15000000, bhk: [2, 3], where: "Paschim Vihar", commute: "Cyber Hub",
    }));

    expect(chips).toContain("₹1.5 Cr");
    expect(chips).toContain("2 BHK/3 BHK");
    expect(chips).toContain("Paschim Vihar");
    expect(chips).toContain("Near Cyber Hub");
  });

  it("formats money the way people here read it", () => {
    expect(formatMoney(40000)).toBe("₹40K");
    expect(formatMoney(1500000)).toBe("₹15 L");
    expect(formatMoney(15000000)).toBe("₹1.5 Cr");
  });
});
