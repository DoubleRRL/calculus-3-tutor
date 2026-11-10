import { describe, expect, it } from "vitest";
import { isPrimerMastered, type PrimerMasteryAttempt } from "./primerMastery";

function attempt(
  kind: string,
  overrides: Partial<PrimerMasteryAttempt> = {},
): PrimerMasteryAttempt {
  return {
    kind,
    correct: true,
    usedHint: false,
    revealed: false,
    ...overrides,
  };
}

describe("isPrimerMastered", () => {
  it("rejects one clean mastery item on its own", () => {
    expect(isPrimerMastered([attempt("mastery")])).toBe(false);
  });

  it("accepts a clean mastery item plus one other clean item", () => {
    expect(isPrimerMastered([attempt("drill"), attempt("mastery")])).toBe(true);
  });

  it("rejects a hinted mastery item", () => {
    expect(
      isPrimerMastered([
        attempt("drill"),
        attempt("mastery", { usedHint: true }),
      ]),
    ).toBe(false);
  });

  it("rejects a revealed mastery item", () => {
    expect(
      isPrimerMastered([
        attempt("drill"),
        attempt("mastery", { revealed: true }),
      ]),
    ).toBe(false);
  });

  it("does not count hinted or revealed items as independent checks", () => {
    expect(
      isPrimerMastered([
        attempt("drill", { usedHint: true }),
        attempt("guided", { revealed: true }),
        attempt("mastery"),
      ]),
    ).toBe(false);
  });

  it("rejects a ladder with no mastery item", () => {
    expect(isPrimerMastered([attempt("drill"), attempt("mix")])).toBe(false);
  });
});
