/** ART: frame + motion plumbing for compositions. */
import { createContext, useContext, type ReactNode } from "react";
import { motion, useReducedMotion } from "@/lib/motion";
import { ART, type ArtTone } from "./palette";

const StillContext = createContext(false);

/** Wrap artwork to suppress all animation (e.g. mastery moment). */
export function ArtStill({ children }: { children: ReactNode }) {
  return <StillContext.Provider value={true}>{children}</StillContext.Provider>;
}

export function useArtMotion() {
  const reduced = useReducedMotion();
  const still = useContext(StillContext);
  const live = !reduced && !still;
  return {
    live,
    /** Spread onto a stroked element with pathLength={1} strokeDasharray={1}. */
    draw(delay = 0) {
      if (!live) return {};
      return {
        initial: { strokeDashoffset: 1 },
        animate: { strokeDashoffset: 0 },
        transition: { duration: 0.9, delay, ease: "easeOut" as const },
      };
    },
    /** Spread onto filled shapes for a soft fade-in. */
    fade(delay = 0) {
      if (!live) return {};
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.55, delay, ease: "easeOut" as const },
      };
    },
  };
}

/** Flat color-field frame; the composition svg letterboxes inside. */
export function ArtFrame({
  tone,
  children,
  className = "",
}: {
  tone: ArtTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-[var(--r-card)] ${className}`}
      style={{ backgroundColor: ART[tone] }}
    >
      <svg
        viewBox="0 0 240 160"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {children}
      </svg>
    </div>
  );
}

/** Self-drawing stroke. */
export function Stroke({
  d,
  w = 2.5,
  color = ART.ink,
  dashed = false,
  delay = 0,
}: {
  d: string;
  w?: number;
  color?: string;
  dashed?: boolean;
  delay?: number;
}) {
  const { draw, fade } = useArtMotion();
  if (dashed) {
    return (
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeDasharray="5 7"
        {...fade(delay)}
      />
    );
  }
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      {...draw(delay)}
    />
  );
}

/** Filled shape (blob / cut-paper). */
export function Fill({
  d,
  color,
  delay = 0,
}: {
  d: string;
  color: string;
  delay?: number;
}) {
  const { fade } = useArtMotion();
  return <motion.path d={d} fill={color} {...fade(delay)} />;
}

/** Filled dot. */
export function Dot({
  cx,
  cy,
  r = 4,
  color = ART.ink,
  delay = 0,
}: {
  cx: number;
  cy: number;
  r?: number;
  color?: string;
  delay?: number;
}) {
  const { fade } = useArtMotion();
  return <motion.circle cx={cx} cy={cy} r={r} fill={color} {...fade(delay)} />;
}

/** Stroke ring — draws itself around. */
export function Ring({
  cx,
  cy,
  r,
  w = 2.5,
  color = ART.ink,
  dashed = false,
  delay = 0,
}: {
  cx: number;
  cy: number;
  r: number;
  w?: number;
  color?: string;
  dashed?: boolean;
  delay?: number;
}) {
  const { draw, fade } = useArtMotion();
  if (dashed) {
    return (
      <motion.circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeDasharray="5 7"
        {...fade(delay)}
      />
    );
  }
  return (
    <motion.circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={w}
      pathLength={1}
      strokeDasharray={1}
      transform={`rotate(90 ${cx} ${cy})`}
      {...draw(delay)}
    />
  );
}

/** Ellipse ring (tilted orbit look), draws on. */
export function Orbit({
  cx,
  cy,
  rx,
  ry,
  tilt = 0,
  w = 2.5,
  color = ART.ink,
  delay = 0,
}: {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  tilt?: number;
  w?: number;
  color?: string;
  delay?: number;
}) {
  const { draw } = useArtMotion();
  return (
    <motion.ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="none"
      stroke={color}
      strokeWidth={w}
      pathLength={1}
      strokeDasharray={1}
      transform={`rotate(${tilt} ${cx} ${cy})`}
      {...draw(delay)}
    />
  );
}

/** Small triangle arrowhead at (x,y) pointing along angle (deg, 0 = +x). */
export function arrowTri(
  x: number,
  y: number,
  angleDeg: number,
  s = 7,
): string {
  const a = (angleDeg * Math.PI) / 180;
  const bx = x - s * Math.cos(a);
  const by = y - s * Math.sin(a);
  const px = (-s * Math.sin(a)) / 2;
  const py = (s * Math.cos(a)) / 2;
  return `M${x} ${y} L${bx + px} ${by + py} L${bx - px} ${by - py} Z`;
}
