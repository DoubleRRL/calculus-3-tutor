import { describe, expect, it } from "vitest";
import { normalizeMathDelimiters } from "./MathText";

describe("normalizeMathDelimiters", () => {
  it("converts \\[ \\] to $$", () => {
    expect(normalizeMathDelimiters(String.raw`\[a + b\]`)).toBe("$$a + b$$");
  });

  it("converts \\( \\) to $", () => {
    expect(normalizeMathDelimiters(String.raw`hi \(x\) there`)).toBe(
      "hi $x$ there",
    );
  });

  it("unwraps math fences", () => {
    expect(normalizeMathDelimiters("```math\n\\mathbf{i}\n```")).toBe(
      "$$\\mathbf{i}$$",
    );
  });
});
