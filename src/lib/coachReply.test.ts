import { describe, expect, it } from "vitest";
import { parseCoachReply } from "./coachReply";

describe("parseCoachReply", () => {
  it("reads both headers and strips them from the visible text", () => {
    const r = parseCoachReply(
      "V: wrong\nQ: What is the first component of r prime?\nNot quite — differentiate each slot.",
    );
    expect(r.structured).toBe(true);
    expect(r.verdict).toBe("wrong");
    expect(r.question).toBe("What is the first component of r prime?");
    expect(r.text).toBe("Not quite — differentiate each slot.");
  });

  it("accepts a correct verdict and its synonyms", () => {
    expect(parseCoachReply("V: correct\nQ: -\nYes.").verdict).toBe("correct");
    expect(parseCoachReply("V: right\nQ: -\nYes.").verdict).toBe("correct");
    expect(parseCoachReply("V: incorrect\nQ: -\nNo.").verdict).toBe("wrong");
  });

  it("treats a dash as 'asked nothing'", () => {
    for (const dash of ["-", "--", "none", "N/A", "nothing", ""]) {
      expect(parseCoachReply(`V: empty\nQ: ${dash}\nHere is the rule.`).question).toBe("");
    }
  });

  it("keeps only the first sentence of a rambling Q line", () => {
    const r = parseCoachReply(
      "V: wrong\nQ: What is the derivative? Also consider the bounds. And the sign.\nTry that.",
    );
    expect(r.question).toBe("What is the derivative?");
  });

  it("caps an absurdly long question line", () => {
    const r = parseCoachReply(`V: wrong\nQ: ${"why ".repeat(200)}\nTry.`);
    expect(r.question.length).toBeLessThanOrEqual(200);
  });

  it("skips blank lines before the headers", () => {
    const r = parseCoachReply("\n\nV: wrong\nQ: What is u dot v?\nTry it.");
    expect(r.verdict).toBe("wrong");
    expect(r.question).toBe("What is u dot v?");
  });

  it("tolerates a full-width colon", () => {
    const r = parseCoachReply("V：wrong\nQ：What is the flux?\nTry.");
    expect(r.verdict).toBe("wrong");
    expect(r.question).toBe("What is the flux?");
  });

  it("falls back to whole-reply prose when the model ignores the format", () => {
    const raw = "Not quite. What is the first component of r prime?";
    const r = parseCoachReply(raw);
    expect(r.structured).toBe(false);
    expect(r.verdict).toBeNull();
    expect(r.question).toBe("");
    expect(r.text).toBe(raw);
  });

  it("does not treat a mid-text 'V:' as a header", () => {
    const raw = "First, recall the chain rule.\nV: is a vector\nThen substitute.";
    const r = parseCoachReply(raw);
    expect(r.structured).toBe(false);
    expect(r.text).toBe(raw);
  });

  it("handles a verdict-only reply with no body", () => {
    const r = parseCoachReply("V: wrong\nQ: What is the gradient?");
    expect(r.verdict).toBe("wrong");
    expect(r.question).toBe("What is the gradient?");
    expect(r.text).toBe("");
  });

  it("survives an empty reply without throwing", () => {
    const r = parseCoachReply("");
    expect(r.text).toBe("");
    expect(r.question).toBe("");
    expect(r.structured).toBe(false);
  });

  it("survives headers only", () => {
    const r = parseCoachReply("V: empty\nQ: -");
    expect(r.verdict).toBe("empty");
    expect(r.text).toBe("");
  });

  it("ignores an unrecognised verdict word", () => {
    const r = parseCoachReply("V: banana\nQ: What is curl?\nTry.");
    expect(r.verdict).toBeNull();
    expect(r.question).toBe("What is curl?");
  });

  it("never returns a question containing a header marker", () => {
    const r = parseCoachReply("V: wrong\nQ: why is V: wrong here?\nTry.");
    expect(r.question.startsWith("V:")).toBe(false);
  });
});