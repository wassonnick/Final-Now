import { describe, expect, it } from "vitest";
import {
  describeIntent, hasIntent, parseSearchIntent, propertyMatchesIntent, societyMatchesIntent, unitAsks,
} from "@/lib/searchIntent";

/**
 * The constraints people actually type, and the ones that bit.
 *
 * Every case below either came from a real phrasing or from a bug this parser shipped
 * with: "1 lakh" losing its unit to a bare "l", "semi furnished" satisfying a request for
 * fully furnished, and a plain society name being read as a filter.
 */
describe("parseSearchIntent", () => {
  it("reads the common phrasings", () => {
    const cases: Array<[string, Partial<ReturnType<typeof parseSearchIntent>>]> = [
      ["2 bhk under 50k", { bhk: [2], maxRent: 50000 }],
      ["3bhk with swimming pool", { bhk: [3], amenities: ["swimming pool"] }],
      ["2 or 3 bhk near metro", { bhk: [2, 3], nearMetro: true }],
      ["semi furnished 2 bhk in sector 45", { bhk: [2], furnished: "semi furnished" }],
      ["flat under 2 cr", { maxBuy: 20000000 }],
      ["rent between 30k and 50k", { minRent: 30000, maxRent: 50000 }],
      ["studio apartment upto 25000", { bhk: [0], maxRent: 25000 }],
    ];

    for (const [query, expected] of cases) {
      const intent = parseSearchIntent(query);
      for (const [key, value] of Object.entries(expected)) {
        expect(intent[key as keyof typeof intent], `${query} → ${key}`).toEqual(value);
      }
    }
  });

  /**
   * "1 lakh" once matched the bare "l" in the unit alternation and stranded "akh" in the
   * leftover text, so the budget came out as ₹1 rather than ₹1,00,000.
   */
  it("reads the longest money unit, not the first letter of it", () => {
    expect(parseSearchIntent("fully furnished flat under 1 lakh").maxRent).toBe(100000);
    expect(parseSearchIntent("under 1.5 crore").maxBuy).toBe(15000000);
    expect(parseSearchIntent("under 50 thousand").maxRent).toBe(50000);
    expect(parseSearchIntent("under 1 lakh").remainder).not.toContain("akh");
  });

  /** Rent and sale are told apart by size, since nobody says which they mean. */
  it("routes a budget to rent or to purchase by magnitude", () => {
    expect(parseSearchIntent("under 50k").maxRent).toBe(50000);
    expect(parseSearchIntent("under 50k").maxBuy).toBeNull();
    expect(parseSearchIntent("under 2 cr").maxBuy).toBe(20000000);
    expect(parseSearchIntent("under 2 cr").maxRent).toBeNull();
  });

  it("leaves a plain society or sector search completely alone", () => {
    for (const query of ["dlf crest", "sector 65 gurgaon", "paschim vihar"]) {
      const intent = parseSearchIntent(query);
      expect(hasIntent(intent), query).toBe(false);
      expect(intent.remainder.trim()).not.toBe("");
    }
  });

  /**
   * "park facing" is an outlook, not a facility. Lifting "park" as an amenity left the
   * free-text layer holding a bare "facing", which matches every description saying "view".
   */
  it("does not claim a view phrase as an on-site amenity", () => {
    const intent = parseSearchIntent("a park facing home in golf course");

    expect(intent.amenities).not.toContain("park");
    expect(intent.remainder).toContain("park facing");
  });

  /** The remainder feeds the free-text layer, so its connectives have to survive. */
  it("keeps the leftover words intact for the next layer", () => {
    expect(parseSearchIntent("ready to move 3 bhk in sohna road").remainder).toContain("ready to move");
  });

  it("reads orientation and floor, which only a listing can answer", () => {
    expect(parseSearchIntent("north east facing 3 bhk").facing).toBe("north-east");
    expect(parseSearchIntent("2 bhk on the ground floor").floor).toBe("ground");
    expect(parseSearchIntent("flat on 12th floor").floor).toBe("12");
  });

  it("describes what it understood, so a misreading is visible", () => {
    const chips = describeIntent(parseSearchIntent("2 bhk under 50k with a pool"));

    expect(chips).toContain("2 BHK");
    expect(chips.join(" ")).toContain("₹50K/mo");
  });
});

describe("societyMatchesIntent", () => {
  const society = {
    name: "Test Society",
    rent_range: "₹35,000 - ₹80,000",
    buy_range: "₹1.2Cr - ₹3Cr",
    amenities: ["Swimming Pool", "Gym", "Security"],
    nearby_metro: "Sector 55 Rapid Metro",
  };

  it("passes a society whose range starts below the ceiling", () => {
    expect(societyMatchesIntent(society, parseSearchIntent("2 bhk under 50k"))).toBe(true);
    expect(societyMatchesIntent(society, parseSearchIntent("2 bhk under 20k"))).toBe(false);
  });

  it("matches amenities and metro from the society's own fields", () => {
    expect(societyMatchesIntent(society, parseSearchIntent("with swimming pool"))).toBe(true);
    expect(societyMatchesIntent(society, parseSearchIntent("with clubhouse"))).toBe(false);
    expect(societyMatchesIntent(society, parseSearchIntent("near metro"))).toBe(true);
  });
});

describe("propertyMatchesIntent", () => {
  const property = {
    bedrooms: 3, price: "₹55,000", listingType: "Rent",
    furnishedStatus: "Semi-Furnished", facing: "North-East", floor: "17",
    amenities: ["Gym"],
  };

  it("filters on bedrooms and price", () => {
    expect(propertyMatchesIntent(property, parseSearchIntent("3 bhk under 60k"))).toBe(true);
    expect(propertyMatchesIntent(property, parseSearchIntent("3 bhk under 50k"))).toBe(false);
    expect(propertyMatchesIntent(property, parseSearchIntent("2 bhk"))).toBe(false);
  });

  /**
   * "Semi-Furnished" contains the word "furnished", so a substring test offered a
   * semi-furnished flat to someone who asked for a fully furnished one.
   */
  it("compares furnishing as whole categories", () => {
    expect(propertyMatchesIntent(property, parseSearchIntent("semi furnished 3 bhk"))).toBe(true);
    expect(propertyMatchesIntent(property, parseSearchIntent("fully furnished 3 bhk"))).toBe(false);
  });

  it("filters on orientation and floor", () => {
    expect(propertyMatchesIntent(property, parseSearchIntent("north east facing 3 bhk"))).toBe(true);
    expect(propertyMatchesIntent(property, parseSearchIntent("south facing 3 bhk"))).toBe(false);
    expect(propertyMatchesIntent(property, parseSearchIntent("3 bhk on the ground floor"))).toBe(false);
  });

  it("separates what a unit answers from what a society does", () => {
    const asks = unitAsks(parseSearchIntent("north facing 3 bhk under 60k near metro"));

    expect(asks).toContain("3 BHK");
    expect(asks).toContain("North facing");
    expect(asks.join(" ")).not.toContain("metro");
  });
});
