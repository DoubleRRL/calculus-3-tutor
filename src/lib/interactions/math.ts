import type { Vec2 } from "@/types/interactions";

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function near(a: Vec2, b: Vec2, tol = 0.35): boolean {
  return dist(a, b) <= tol;
}

export function snapToGrid(v: number, step = 0.5): number {
  return Math.round(v / step) * step;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function numClose(a: number, b: number, tol = 0.15): boolean {
  return Math.abs(a - b) <= tol;
}
