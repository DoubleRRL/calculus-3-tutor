import type { QuadraticFn, Vec2 } from "@/types/interactions";

export function evalFn(q: QuadraticFn, p: Vec2): number {
  const { x, y } = p;
  return q.a * x * x + q.b * y * y + q.c * x * y + q.d * x + q.e * y + q.f0;
}

/** ∇f for quadratic. */
export function gradientAt(q: QuadraticFn, p: Vec2): Vec2 {
  const { x, y } = p;
  return {
    x: 2 * q.a * x + q.c * y + q.d,
    y: 2 * q.b * y + q.c * x + q.e,
  };
}

/**
 * Marching-squares contour segments on a regular grid.
 * Returns polyline segments in world coords.
 */
export function marchingSquares(
  q: QuadraticFn,
  min: number,
  max: number,
  level: number,
  res = 24,
): [Vec2, Vec2][] {
  const segs: [Vec2, Vec2][] = [];
  const step = (max - min) / res;

  const val = (i: number, j: number) => {
    const x = min + i * step;
    const y = min + j * step;
    return evalFn(q, { x, y }) - level;
  };

  const lerp = (a: number, b: number, va: number, vb: number) => {
    const t = va === vb ? 0.5 : va / (va - vb);
    return a + t * (b - a);
  };

  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const x0 = min + i * step;
      const y0 = min + j * step;
      const x1 = x0 + step;
      const y1 = y0 + step;
      const v00 = val(i, j);
      const v10 = val(i + 1, j);
      const v11 = val(i + 1, j + 1);
      const v01 = val(i, j + 1);
      const idx =
        (v00 > 0 ? 1 : 0) |
        (v10 > 0 ? 2 : 0) |
        (v11 > 0 ? 4 : 0) |
        (v01 > 0 ? 8 : 0);
      if (idx === 0 || idx === 15) continue;

      const bottom = (): Vec2 => ({
        x: lerp(x0, x1, v00, v10),
        y: y0,
      });
      const right = (): Vec2 => ({
        x: x1,
        y: lerp(y0, y1, v10, v11),
      });
      const top = (): Vec2 => ({
        x: lerp(x0, x1, v01, v11),
        y: y1,
      });
      const left = (): Vec2 => ({
        x: x0,
        y: lerp(y0, y1, v00, v01),
      });

      const push = (a: Vec2, b: Vec2) => segs.push([a, b]);

      // Standard marching-squares edge cases (simplified, no ambiguous split)
      switch (idx) {
        case 1:
        case 14:
          push(left(), bottom());
          break;
        case 2:
        case 13:
          push(bottom(), right());
          break;
        case 3:
        case 12:
          push(left(), right());
          break;
        case 4:
        case 11:
          push(right(), top());
          break;
        case 5:
          push(left(), bottom());
          push(right(), top());
          break;
        case 6:
        case 9:
          push(bottom(), top());
          break;
        case 7:
        case 8:
          push(left(), top());
          break;
        case 10:
          push(bottom(), right());
          push(left(), top());
          break;
        default:
          break;
      }
    }
  }
  return segs;
}
