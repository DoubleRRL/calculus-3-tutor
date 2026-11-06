import { describe, expect, it } from "vitest";
import { GLOSSARY } from "./glossary";
import {
  PRIMER_SECTION_IDS,
  primerForSection,
  primerItemsForSection,
} from "./primers";
import { ALL_STEWART_SECTIONS, STEWART_BY_ID } from "./stewart";

describe("primer coverage", () => {
  it("covers every built-in section, including the optional chapter 9", () => {
    const sections = new Set(ALL_STEWART_SECTIONS.map((s) => s.id));
    expect(new Set(PRIMER_SECTION_IDS)).toEqual(sections);
    expect(PRIMER_SECTION_IDS).toContain("9.1");
    expect(PRIMER_SECTION_IDS).toContain("16.6");
  });

  it("gives every section a lesson and a practice ladder", () => {
    for (const section of ALL_STEWART_SECTIONS) {
      const lesson = primerForSection(section.id);
      expect(lesson, section.id).not.toBeNull();
      expect(lesson?.eli5.trim().length, section.id).toBeGreaterThan(20);
      expect(primerItemsForSection(section.id).length, section.id).toBeGreaterThanOrEqual(4);
    }
  });

  it("has a complete hint ladder on every item", () => {
    for (const section of ALL_STEWART_SECTIONS) {
      for (const item of primerItemsForSection(section.id)) {
        for (const key of ["nudge", "technique", "nextStep", "fullSolution"] as const) {
          expect(item.hints[key].trim().length, `${item.id}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("only references real glossary entries", () => {
    const ids = new Set(GLOSSARY.map((entry) => entry.id));
    for (const section of ALL_STEWART_SECTIONS) {
      for (const id of primerForSection(section.id)?.glossaryIds ?? []) {
        expect(ids.has(id), `${section.id}: ${id}`).toBe(true);
      }
    }
  });
});

describe("15.3 primer", () => {
  const lesson = primerForSection("15.3");
  const items = primerItemsForSection("15.3");

  it("keeps the structured example and the polar demo", () => {
    expect(lesson?.workedExample).toMatchObject({
      prompt: expect.stringContaining("unit disk"),
      solution: expect.stringContaining("\\frac{\\pi}{2}"),
    });
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
  });
});

describe("chapter 9 relabel", () => {
  it("uses the book's differential-equations sections and drops 17.x", () => {
    expect(STEWART_BY_ID["9.1"]?.title).toBe("Modeling with Differential Equations");
    expect(STEWART_BY_ID["9.2"]?.title).toBe("Direction Fields and Euler's Method");
    expect(STEWART_BY_ID["9.3"]?.title).toBe("Separable Equations");
    expect(STEWART_BY_ID["17.1"]).toBeUndefined();
    expect(STEWART_BY_ID["9.1"]?.optional).toBe(true);
  });
});
