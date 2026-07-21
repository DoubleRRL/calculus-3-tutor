import type { BoundValue, RegionShade } from "@/types/interactions";

export function isNumericBound(b: BoundValue): b is number {
  return typeof b === "number";
}

export function boundEquals(a: BoundValue, b: BoundValue, tol: number): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) <= tol;
  }
  return String(a) === String(b);
}

/** KaTeX fragment for a bound in an integral mirror. */
export function formatBoundTeX(b: BoundValue): string {
  if (typeof b === "number") {
    return Number.isInteger(b) ? String(b) : b.toFixed(2);
  }
  const map: Record<string, string> = {
    "0": "0",
    x: "x",
    y: "y",
    x2: "x^{2}",
    y2: "y^{2}",
    sqrtx: "\\sqrt{x}",
    sqrty: "\\sqrt{y}",
    "1-x": "1-x",
    "2-x": "2-x",
    "1-y": "1-y",
    "2-y": "2-y",
  };
  return map[b] ?? b;
}

/** Chip label (plain / light math). */
export function formatBoundLabel(b: BoundValue): string {
  if (typeof b === "number") return String(b);
  const map: Record<string, string> = {
    "0": "0",
    x: "x",
    y: "y",
    x2: "x²",
    y2: "y²",
    sqrtx: "√x",
    sqrty: "√y",
    "1-x": "1−x",
    "2-x": "2−x",
    "1-y": "1−y",
    "2-y": "2−y",
  };
  return map[b] ?? b;
}

/** Variable-bound regions need expression chips, not numeric inner handles. */
export function hasVariableInner(shade: RegionShade): boolean {
  return shade.kind === "underCurve" || shade.kind === "between";
}

export function defaultInnerChoices(shade: RegionShade): BoundValue[] {
  if (shade.kind === "underCurve") {
    return [0, shade.yTop, "x", "x2", "1-x", "2-x", shade.x1];
  }
  if (shade.kind === "between") {
    return [0, shade.lower, shade.upper, "x", "x2", "1-x", shade.x1];
  }
  return [];
}
