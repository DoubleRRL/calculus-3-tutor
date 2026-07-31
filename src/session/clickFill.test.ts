import { describe, expect, it } from "vitest";
import { gradeAnswer } from "@/lib/grading";
import type { ProblemItem } from "@/types/content";
import {
  countBlanks,
  decodeClickFill,
  encodeClickFill,
} from "./ClickFill";

const item: ProblemItem = {
  id: "t_click",
  skillId: "u1_coords3d",
  kind: "drill",
  prompt: "Needs ___ axes; sphere uses fixed ___.",
  answerType: "clickFill",
  answer: "three|distance",
  choices: ["three", "two", "distance", "angle"],
  hints: {
    nudge: "n",
    technique: "t",
    nextStep: "n",
    fullSolution: "three|distance",
  },
  misconceptionTags: [],
  rubric: "three|distance",
  difficulty: 1,
};

describe("clickFill encoding", () => {
  it("counts blanks and round-trips pipe joins", () => {
    expect(countBlanks(item.prompt)).toBe(2);
    const encoded = encodeClickFill(["three", "distance"]);
    expect(encoded).toBe("three|distance");
    expect(decodeClickFill(encoded, 2)).toEqual(["three", "distance"]);
  });

  it("grades pipe-joined answers stably for attempts", () => {
    expect(gradeAnswer(item, "three|distance").correct).toBe(true);
    expect(gradeAnswer(item, "three|angle").correct).toBe(false);
    expect(gradeAnswer(item, "three").correct).toBe(false);
    // AttemptRecord.answerGiven must stay this string form
    const given = encodeClickFill(["three", "distance"]);
    expect(given.includes("|")).toBe(true);
    expect(gradeAnswer(item, given).correct).toBe(true);
  });
});
