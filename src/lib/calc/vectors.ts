import { formatNumber } from "./evaluate";

export type Vec = number[];

export type VecOk = { ok: true; value: Vec | number; display: string };
export type VecErr = { ok: false; error: string };
export type VecResult = VecOk | VecErr;

/** Strip outer wrappers and split components. */
export function parseVector(raw: string): VecResult {
  let t = raw.trim();
  if (!t) return { ok: false, error: "Enter a vector" };
  const pairs: [string, string][] = [
    ["⟨", "⟩"],
    ["<", ">"],
    ["(", ")"],
    ["[", "]"],
  ];
  for (const [open, close] of pairs) {
    if (t.startsWith(open) && t.endsWith(close) && t.length > open.length + close.length) {
      t = t.slice(open.length, t.length - close.length).trim();
      break;
    }
  }
  const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 3) {
    return { ok: false, error: "Need 2 or 3 components" };
  }
  const nums: number[] = [];
  for (const p of parts) {
    // Allow simple fractions a/b
    const frac = p.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
    let n: number;
    if (frac) {
      const den = Number(frac[2]);
      if (den === 0) return { ok: false, error: "Division by zero" };
      n = Number(frac[1]) / den;
    } else {
      n = Number(p);
    }
    if (!Number.isFinite(n)) {
      return { ok: false, error: `Bad component: ${p}` };
    }
    nums.push(n);
  }
  return { ok: true, value: nums, display: formatVector(nums) };
}

export function formatVector(v: Vec): string {
  return v.map((x) => formatNumber(x)).join(",");
}

export function magnitude(v: Vec): number {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0));
}

export function vecDot(a: Vec, b: Vec): VecResult {
  if (a.length !== b.length) {
    return { ok: false, error: "Vectors must be the same dimension" };
  }
  const d = a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
  return { ok: true, value: d, display: formatNumber(d) };
}

export function vecCross(a: Vec, b: Vec): VecResult {
  if (a.length !== 3 || b.length !== 3) {
    return { ok: false, error: "Cross product needs 3D vectors" };
  }
  const c: Vec = [
    a[1]! * b[2]! - a[2]! * b[1]!,
    a[2]! * b[0]! - a[0]! * b[2]!,
    a[0]! * b[1]! - a[1]! * b[0]!,
  ];
  return { ok: true, value: c, display: formatVector(c) };
}

export function vecMagnitude(a: Vec): VecResult {
  const m = magnitude(a);
  return { ok: true, value: m, display: formatNumber(m) };
}

export function vecUnit(a: Vec): VecResult {
  const m = magnitude(a);
  if (m < 1e-12) return { ok: false, error: "Zero vector has no unit" };
  const u = a.map((x) => x / m);
  return { ok: true, value: u, display: formatVector(u) };
}

/** Angle between vectors in degrees. */
export function vecAngleDeg(a: Vec, b: Vec): VecResult {
  if (a.length !== b.length) {
    return { ok: false, error: "Vectors must be the same dimension" };
  }
  const ma = magnitude(a);
  const mb = magnitude(b);
  if (ma < 1e-12 || mb < 1e-12) {
    return { ok: false, error: "Zero vector has no angle" };
  }
  const dot = a.reduce((s, x, i) => s + x * (b[i] ?? 0), 0);
  const cos = Math.max(-1, Math.min(1, dot / (ma * mb)));
  const deg = (Math.acos(cos) * 180) / Math.PI;
  return { ok: true, value: deg, display: formatNumber(deg) };
}
