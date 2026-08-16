import { beforeEach, describe, expect, it } from "vitest";
import {
  briefFromFilters, briefTitle, clearDraft, COMPLETED_STEP, loadDraft, reopenBrief, saveDraft,
} from "@/lib/briefStorage";
import { EMPTY_BRIEF, type Brief } from "@/lib/briefMatch";

/**
 * Nine answers have to survive a reload, and a trip through the login screen.
 *
 * The round trip matters most: a brief is stored as flat strings because that is what the
 * saved-searches column takes, and without an exact way back it could be saved and never
 * recovered — which is most of the reason to save it.
 */

const full: Brief = {
  mode: "buy",
  purpose: "First home",
  budget: 15000000,
  bhk: [2, 3],
  where: "Paschim Vihar",
  commute: "Cyber Hub",
  timeline: "3",
  priorities: ["location", "legal", "no_emi"],
  notes: "Quiet corner unit.",
};

/** Exactly the shape saveBriefToAccount sends to the API. */
const storedFilters = {
  kind: "brief",
  city: "Delhi",
  mode: full.mode,
  purpose: full.purpose,
  budget: String(full.budget),
  bhk: full.bhk.join(","),
  where: full.where,
  commute: full.commute,
  timeline: full.timeline,
  priorities: full.priorities.join(","),
  notes: full.notes,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("the local draft", () => {
  it("comes back exactly as it was left", () => {
    saveDraft(full, 4);

    const draft = loadDraft();

    expect(draft?.step).toBe(4);
    expect(draft?.brief).toEqual(full);
  });

  it("is nothing when nothing was saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("is gone once cleared", () => {
    saveDraft(full, 4);
    clearDraft();

    expect(loadDraft()).toBeNull();
  });

  /**
   * A draft written before a question existed must still restore, with the new field
   * empty rather than undefined — otherwise adding a question breaks every saved draft.
   */
  it("survives a brief that predates a new question", () => {
    const older = { ...full } as Partial<Brief>;
    delete older.commute;
    window.localStorage.setItem("sf.brief.draft.v2", JSON.stringify({ brief: older, step: 3, at: Date.now() }));

    const draft = loadDraft();

    expect(draft?.brief.commute).toBe(EMPTY_BRIEF.commute);
    expect(draft?.brief.purpose).toBe("First home");
  });

  it("ignores a draft old enough to be confusing", () => {
    const ancient = Date.now() - 40 * 24 * 60 * 60 * 1000;
    window.localStorage.setItem("sf.brief.draft.v2", JSON.stringify({ brief: full, step: 2, at: ancient }));

    expect(loadDraft()).toBeNull();
  });

  it("ignores anything that is not a draft", () => {
    window.localStorage.setItem("sf.brief.draft.v2", "not json at all");

    expect(loadDraft()).toBeNull();
  });
});

describe("a brief stored on the account", () => {
  /** The other half of saving: without this it could be stored and never reopened. */
  it("rebuilds from its stored strings exactly", () => {
    expect(briefFromFilters(storedFilters)).toEqual(full);
  });

  it("falls back to sane values when a field is missing", () => {
    const rebuilt = briefFromFilters({ kind: "brief", mode: "rent" });

    expect(rebuilt.mode).toBe("rent");
    expect(rebuilt.bhk).toEqual([]);
    expect(rebuilt.priorities).toEqual([]);
    expect(rebuilt.budget).toBe(EMPTY_BRIEF.budget);
  });

  it("treats anything that is not a purchase as a rental", () => {
    expect(briefFromFilters({ mode: "something-else" }).mode).toBe("rent");
  });

  /** Reopening lands on the shortlist, not back on question one. */
  it("reopens past the last question", () => {
    reopenBrief(storedFilters);

    const draft = loadDraft();

    expect(draft?.step).toBe(COMPLETED_STEP);
    expect(draft?.brief).toEqual(full);
  });

  it("names itself the way its owner would recognise it", () => {
    const title = briefTitle(full, "Delhi");

    expect(title).toContain("First home");
    expect(title).toContain("Delhi");
    expect(title.length).toBeLessThanOrEqual(120);
  });
});
