import { describe, expect, it } from "vitest";
import { GLOSSARY } from "./glossary";
import { primerForSection, primerItemsForSection } from "./primers";

describe("15.3 primer", () => {
  const lesson = primerForSection("15.3");
  const items = primerItemsForSection("15.3");

  it("has a lesson, a worked example, and the polar region demo", () => {
    expect(lesson).not.toBeNull();
    expect(lesson?.skillId).toBe("u4_polar");
    expect(lesson?.workedExample?.prompt.length).toBeGreaterThan(20);
    expect(lesson?.workedExample?.solution.length).toBeGreaterThan(20);
    expect(lesson?.demo?.spec.type).toBe("region");
    expect(lesson?.demo?.spec.shade.kind).toBe("polarSector");
  });

  it("runs learn → guided → drill → mix → mastery", () => {
    expect(items.map((item) => item.kind)).toEqual([
      "learn",
      "guided",
      "drill",
      "drill",
      "mix",
      "mastery",
    ]);
    expect(items.map((item) => item.id)).toEqual([
      "u4_p_learn",
      "u4_p_guided",
      "u4_p_drill1",
      "u4_p_drill2",
      "u4_p_mix1",
      "u4_p_mastery",
    ]);
  });

  it("has a complete hint ladder on every item", () => {
    for (const item of items) {
      for (const key of ["nudge", "technique", "nextStep", "fullSolution"] as const) {
        expect(item.hints[key].trim().length, `${item.id}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("points its key terms at real glossary entries", () => {
    const ids = new Set(GLOSSARY.map((entry) => entry.id));
    for (const id of lesson?.glossaryIds ?? []) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("does not silently invent a primer for an unauthored section", () => {
    expect(primerForSection("15.4")).toBeNull();
    expect(primerItemsForSection("15.4")).toEqual([]);
  });
});
