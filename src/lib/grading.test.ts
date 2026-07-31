import { describe, expect, it } from "vitest";
import type { ProblemItem } from "@/types/content";
import { gradeAnswer } from "./grading";

const unitTuple: ProblemItem = {
  id: "u1_v_mastery",
  skillId: "u1_vectors",
  kind: "mastery",
  prompt: "Unit vector",
  answerType: "tuple",
  answer: "2/3,-1/3,2/3",
  accept: ["2/3,-1/3,2/3", "0.667,-0.333,0.667"],
  hints: {
    nudge: "n",
    technique: "t",
    nextStep: "n",
    fullSolution: "2/3,-1/3,2/3",
  },
  misconceptionTags: [],
  rubric: "(2/3,-1/3,2/3)",
  difficulty: 2,
};

describe("flexible tuple grading", () => {
  it("accepts bare comma-separated fractions", () => {
    expect(gradeAnswer(unitTuple, "2/3,-1/3,2/3").correct).toBe(true);
  });

  it("accepts parentheses around the tuple", () => {
    expect(gradeAnswer(unitTuple, "(2/3, -1/3, 2/3)").correct).toBe(true);
  });

  it("accepts angle-bracket notation", () => {
    expect(gradeAnswer(unitTuple, "⟨2/3,-1/3,2/3⟩").correct).toBe(true);
  });

  it("rejects a wrong tuple", () => {
    expect(gradeAnswer(unitTuple, "(1/3, -1/3, 2/3)").correct).toBe(false);
  });
});
