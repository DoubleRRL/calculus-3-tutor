import { describe, expect, it } from "vitest";
import type { PrimerItem } from "@/types/primer";
import { gradePrimerAnswer } from "./primerGrade";

function item(overrides: Partial<PrimerItem>): PrimerItem {
  return {
    id: "test",
    skillId: "u4_polar",
    kind: "drill",
    prompt: "test",
    answerType: "numeric",
    answer: "1",
    hints: {
      nudge: "n",
      technique: "t",
      nextStep: "s",
      fullSolution: "f",
    },
    misconceptionTags: [],
    rubric: "1",
    difficulty: 1,
    ...overrides,
  };
}

describe("primer grading", () => {
  it("accepts numeric answers with tolerance", () => {
    expect(gradePrimerAnswer(item({ answer: "0.5" }), "0.5").correct).toBe(true);
    expect(gradePrimerAnswer(item({ answer: "3.14" }), "3.15").correct).toBe(true);
    expect(gradePrimerAnswer(item({ answer: "3.14" }), "3.5").correct).toBe(false);
  });

  it("accepts exact answers through the accept list", () => {
    const pi = item({ answerType: "exact", answer: "\\pi", accept: ["pi", "π"] });
    expect(gradePrimerAnswer(pi, "pi").correct).toBe(true);
    expect(gradePrimerAnswer(pi, "π").correct).toBe(true);
    expect(gradePrimerAnswer(pi, "\\pi").correct).toBe(true);
    expect(gradePrimerAnswer(pi, "3").correct).toBe(false);
  });

  it("grades choices and click-fill slots", () => {
    const choice = item({
      answerType: "choice",
      answer: "circular",
      choices: ["rectangular", "circular"],
    });
    expect(gradePrimerAnswer(choice, "circular").correct).toBe(true);
    expect(gradePrimerAnswer(choice, "rectangular").correct).toBe(false);

    const fill = item({
      answerType: "clickFill",
      answer: "three|distance",
      choices: ["three", "two", "distance", "angle"],
    });
    expect(gradePrimerAnswer(fill, "three|distance").correct).toBe(true);
    expect(gradePrimerAnswer(fill, "distance|three").correct).toBe(false);
  });

  it("grades ordered and unordered tuples", () => {
    const ordered = item({ answerType: "tuple", answer: "1,2,3" });
    expect(gradePrimerAnswer(ordered, "1,2,3").correct).toBe(true);
    expect(gradePrimerAnswer(ordered, "3,2,1").correct).toBe(false);

    const unordered = item({
      answerType: "tuple",
      answer: "1,2,3",
      tupleUnordered: true,
    });
    expect(gradePrimerAnswer(unordered, "3,1,2").correct).toBe(true);
  });
});
