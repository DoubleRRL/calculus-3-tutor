import { describe, expect, it } from "vitest";
import { evaluateExpression } from "./evaluate";

describe("evaluateExpression", () => {
  it("acos(1/sqrt(2)) in degrees is 45", async () => {
    const r = await evaluateExpression("acos(1/sqrt(2))", "deg");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Math.abs(r.value - 45)).toBeLessThan(1e-6);
      expect(r.display).toBe("45");
    }
  });

  it("supports fractions and sqrt", async () => {
    const r = await evaluateExpression("1/sqrt(2)", "deg");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Math.abs(r.value - Math.SQRT1_2)).toBeLessThan(1e-9);
    }
  });

  it("cos of 45 degrees is ~0.707", async () => {
    const r = await evaluateExpression("cos(45)", "deg");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Math.abs(r.value - Math.SQRT1_2)).toBeLessThan(1e-9);
    }
  });

  it("rad mode uses radians for acos", async () => {
    const r = await evaluateExpression("acos(1/sqrt(2))", "rad");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(Math.abs(r.value - Math.PI / 4)).toBeLessThan(1e-9);
    }
  });
});
