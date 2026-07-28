import type { Field2dPreset, Vec2 } from "@/types/interactions";

export function fieldAt(preset: Field2dPreset, p: Vec2): Vec2 {
  if (preset === "rotate") return { x: -p.y, y: p.x };
  if (preset === "radial") return { x: p.x, y: p.y };
  if (preset === "shear") return { x: p.y, y: 0 };
  return { x: 1, y: 0 };
}

const FD_H = 0.05;

export function curlZAt(preset: Field2dPreset, p: Vec2): number {
  const Fyp = fieldAt(preset, { x: p.x + FD_H, y: p.y }).y;
  const Fym = fieldAt(preset, { x: p.x - FD_H, y: p.y }).y;
  const Fxp = fieldAt(preset, { x: p.x, y: p.y + FD_H }).x;
  const Fxm = fieldAt(preset, { x: p.x, y: p.y - FD_H }).x;
  return (Fyp - Fym) / (2 * FD_H) - (Fxp - Fxm) / (2 * FD_H);
}

export function divAt(preset: Field2dPreset, p: Vec2): number {
  const Fxp = fieldAt(preset, { x: p.x + FD_H, y: p.y }).x;
  const Fxm = fieldAt(preset, { x: p.x - FD_H, y: p.y }).x;
  const Fyp = fieldAt(preset, { x: p.x, y: p.y + FD_H }).y;
  const Fym = fieldAt(preset, { x: p.x, y: p.y - FD_H }).y;
  return (Fxp - Fxm) / (2 * FD_H) + (Fyp - Fym) / (2 * FD_H);
}

export function fieldLabel(preset: Field2dPreset): string {
  if (preset === "rotate") return "\\mathbf{F}=\\langle -y,\\,x\\rangle";
  if (preset === "radial") return "\\mathbf{F}=\\langle x,\\,y\\rangle";
  if (preset === "shear") return "\\mathbf{F}=\\langle y,\\,0\\rangle";
  return "\\mathbf{F}=\\langle 1,\\,0\\rangle";
}

export const DEFAULT_PATH_A: Vec2 = { x: -1.5, y: -1 };
export const DEFAULT_PATH_B: Vec2 = { x: 1.5, y: 1 };

export function linePath(a: Vec2, b: Vec2, samples = 32): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    pts.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
  }
  return pts;
}

/** Semicircle arc from a to b (bulges to the left of chord a→b). */
export function arcPath(a: Vec2, b: Vec2, samples = 40): Vec2[] {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const r = Math.hypot(a.x - b.x, a.y - b.y) / 2;
  if (r < 1e-9) return [a, b];
  let a0 = Math.atan2(a.y - cy, a.x - cx);
  let a1 = Math.atan2(b.y - cy, b.x - cx);
  if (a1 <= a0) a1 += Math.PI * 2;
  const pts: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const ang = a0 + t * (a1 - a0);
    pts.push({ x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) });
  }
  return pts;
}

export function buildPath(kind: "line" | "arc", a: Vec2, b: Vec2): Vec2[] {
  return kind === "line" ? linePath(a, b) : arcPath(a, b);
}

export function workAlong(points: Vec2[], preset: Field2dPreset): number {
  let w = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    const F = fieldAt(preset, mid);
    w += F.x * (p1.x - p0.x) + F.y * (p1.y - p0.y);
  }
  return w;
}
