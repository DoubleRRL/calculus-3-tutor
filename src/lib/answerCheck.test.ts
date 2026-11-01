import { describe, expect, it } from "vitest";
import { compareAnswers, normalizeAnswer } from "./answerCheck";

async function check(student: string, expected: string) {
  return compareAnswers(student, expected);
}

describe("answer normalization", () => {
  it("accepts plain math, LaTeX, and palette symbols", () => {
    expect(normalizeAnswer("\\frac{\\pi}{4}")).toBe("((pi)/(4))");
    expect(normalizeAnswer("π/4")).toBe("pi/4");
    expect(normalizeAnswer("√(2)")).toBe("sqrt(2)");
    expect(normalizeAnswer("z = x^2 + y^2")).toBe("x^2 + y^2");
    expect(normalizeAnswer("⟨1, 2, 3⟩")).toBe("[1, 2, 3]");
    expect(normalizeAnswer("pi")).toBe(normalizeAnswer("π"));
  });
});

describe("final answer comparison", () => {
  it("matches equivalent numbers", async () => {
    expect((await check("1/2", "0.5")).verdict).toBe("correct");
    expect((await check("\\frac{\\pi}{4}", "0.785398")).verdict).toBe("correct");
    expect((await check("pi/4", "π/4")).verdict).toBe("correct");
  });

  it("matches equivalent expressions by sampling", async () => {
    expect((await check("sin(x)^2 + cos(x)^2", "1")).verdict).toBe("correct");
    expect((await check("sqrt(x)", "x^(1/2)")).verdict).toBe("correct");
    expect((await check("x^2 + 2x + 1", "(x+1)^2")).verdict).toBe("correct");
  });

  it("rejects different functions", async () => {
    expect((await check("2x", "3x")).verdict).toBe("wrong");
    expect((await check("1/(x-1)", "1/(1-x)")).verdict).toBe("wrong");
    expect((await check("x^2", "x^3")).verdict).toBe("wrong");
  });

  it("compares vectors componentwise", async () => {
    expect((await check("(1, 2, 3)", "<1,2,3>")).verdict).toBe("correct");
    expect((await check("(1, 2, 3)", "(1, 2, 4)")).verdict).toBe("wrong");
  });

  it("handles word answers", async () => {
    expect((await check("DNE", "does not exist")).verdict).toBe("correct");
    expect((await check("diverges", "converges")).verdict).toBe("wrong");
    expect((await check("see graph", "4")).verdict).toBe("unknown");
  });

  it("returns unknown when it cannot parse", async () => {
    expect((await check("some sentence here", "4")).verdict).toBe("unknown");
  });
});
