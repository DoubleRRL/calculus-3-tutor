import type { CurveDef, Vec2 } from "@/types/interactions";

export function evalCurve(curve: CurveDef, t: number): Vec2 {
  if (curve.kind === "circle") {
    const cx = curve.cx ?? 0;
    const cy = curve.cy ?? 0;
    return { x: cx + curve.r * Math.cos(t), y: cy + curve.r * Math.sin(t) };
  }
  if (curve.kind === "line") {
    return {
      x: curve.x0 + curve.vx * t,
      y: curve.y0 + curve.vy * t,
    };
  }
  if (curve.kind === "parabola") {
    const a = curve.a ?? 0.25;
    return { x: t, y: a * t * t };
  }
  // helix2d / Archimedean-ish spiral
  return {
    x: curve.a * t * Math.cos(curve.b * t),
    y: curve.a * t * Math.sin(curve.b * t),
  };
}

/** Numerical velocity. */
export function velAt(curve: CurveDef, t: number, h = 1e-4): Vec2 {
  const a = evalCurve(curve, t - h);
  const b = evalCurve(curve, t + h);
  return { x: (b.x - a.x) / (2 * h), y: (b.y - a.y) / (2 * h) };
}

export function accelAt(curve: CurveDef, t: number, h = 1e-4): Vec2 {
  const a = velAt(curve, t - h, h);
  const b = velAt(curve, t + h, h);
  return { x: (b.x - a.x) / (2 * h), y: (b.y - a.y) / (2 * h) };
}

export function speedAt(curve: CurveDef, t: number): number {
  const v = velAt(curve, t);
  return Math.hypot(v.x, v.y);
}

export function sampleCurve(
  curve: CurveDef,
  t0: number,
  t1: number,
  n = 64,
): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    pts.push(evalCurve(curve, t));
  }
  return pts;
}
