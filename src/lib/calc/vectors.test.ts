import { describe, expect, it } from "vitest";
import {
  parseVector,
  vecAngleDeg,
  vecDot,
  vecMagnitude,
} from "./vectors";

describe("vector ops", () => {
  it("parses angle-bracket vectors", () => {
    const r = parseVector("⟨1, 0, 0⟩");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([1, 0, 0]);
  });

  it("angle between ⟨1,0,0⟩ and ⟨1,1,0⟩ is 45°", () => {
    const a = parseVector("1,0,0");
    const b = parseVector("1,1,0");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const ang = vecAngleDeg(a.value as number[], b.value as number[]);
    expect(ang.ok).toBe(true);
    if (ang.ok) {
      expect(Math.abs((ang.value as number) - 45)).toBeLessThan(1e-6);
    }
  });

  it("dot and magnitude match the mastery facts", () => {
    const a = parseVector("⟨1,0,0⟩");
    const b = parseVector("⟨1,1,0⟩");
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    const d = vecDot(a.value as number[], b.value as number[]);
    const mb = vecMagnitude(b.value as number[]);
    expect(d.ok && mb.ok).toBe(true);
    if (d.ok) expect(d.value).toBe(1);
    if (mb.ok) expect(Math.abs((mb.value as number) - Math.SQRT2)).toBeLessThan(1e-9);
  });
});
