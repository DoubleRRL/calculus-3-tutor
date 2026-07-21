/** Interruptible spring: update from current velocity, never restart a canned curve. */

export type SpringConfig = {
  stiffness: number;
  damping: number;
  mass?: number;
  precision?: number;
};

export const DEFAULT_SPRING: SpringConfig = {
  stiffness: 280,
  damping: 22,
  mass: 1,
  precision: 0.01,
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animate `from` toward `to` with a damped spring.
 * Calls `onUpdate` each frame. Returns a cancel function.
 * If reduced motion is preferred, jumps to `to` immediately.
 */
export function animateSpring(
  from: number,
  to: number,
  onUpdate: (value: number) => void,
  config: SpringConfig = DEFAULT_SPRING,
  onComplete?: () => void,
): () => void {
  if (prefersReducedMotion() || Math.abs(to - from) < (config.precision ?? 0.01)) {
    onUpdate(to);
    onComplete?.();
    return () => {};
  }

  const stiffness = config.stiffness;
  const damping = config.damping;
  const mass = config.mass ?? 1;
  const precision = config.precision ?? 0.01;

  let x = from;
  let v = 0;
  let raf = 0;
  let last = performance.now();
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) return;
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    const force = -stiffness * (x - to) - damping * v;
    const a = force / mass;
    v += a * dt;
    x += v * dt;
    onUpdate(x);
    if (Math.abs(x - to) < precision && Math.abs(v) < precision) {
      onUpdate(to);
      onComplete?.();
      return;
    }
    raf = requestAnimationFrame(step);
  };

  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

/** 2D spring toward a point. */
export function animateSpring2(
  from: { x: number; y: number },
  to: { x: number; y: number },
  onUpdate: (p: { x: number; y: number }) => void,
  config: SpringConfig = DEFAULT_SPRING,
  onComplete?: () => void,
): () => void {
  if (prefersReducedMotion()) {
    onUpdate(to);
    onComplete?.();
    return () => {};
  }

  let x = from.x;
  let y = from.y;
  let vx = 0;
  let vy = 0;
  let raf = 0;
  let last = performance.now();
  let cancelled = false;
  const stiffness = config.stiffness;
  const damping = config.damping;
  const mass = config.mass ?? 1;
  const precision = config.precision ?? 0.01;

  const step = (now: number) => {
    if (cancelled) return;
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    const fx = -stiffness * (x - to.x) - damping * vx;
    const fy = -stiffness * (y - to.y) - damping * vy;
    vx += (fx / mass) * dt;
    vy += (fy / mass) * dt;
    x += vx * dt;
    y += vy * dt;
    onUpdate({ x, y });
    if (
      Math.hypot(x - to.x, y - to.y) < precision &&
      Math.hypot(vx, vy) < precision
    ) {
      onUpdate(to);
      onComplete?.();
      return;
    }
    raf = requestAnimationFrame(step);
  };

  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}
