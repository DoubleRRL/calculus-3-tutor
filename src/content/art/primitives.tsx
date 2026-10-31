/** ART: shared motifs (sprig, arch, pebbles, figures, rays). */
import type { ReactNode } from "react";
import { motion } from "@/lib/motion";
import { ART, type ArtTone } from "./palette";
import {
  ArtFrame,
  Stroke,
  Fill,
  Dot,
  arrowTri,
  useArtMotion,
} from "./ArtFrame";

export function Piece({
  tone,
  className,
  children,
}: {
  tone: ArtTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <ArtFrame tone={tone} className={className}>
      {children}
    </ArtFrame>
  );
}

/** Botanical sprig — base at (x,y), tip ~40·s units up. Group fade-in. */
export function Sprig({
  x,
  y,
  s = 1,
  angle = 0,
  color = ART.ink,
  delay = 0,
}: {
  x: number;
  y: number;
  s?: number;
  angle?: number;
  color?: string;
  delay?: number;
}) {
  const { fade } = useArtMotion();
  return (
    <motion.g
      transform={`translate(${x} ${y}) rotate(${angle}) scale(${s})`}
      {...fade(delay)}
    >
      <path
        d="M0 0 C -5 -12, 5 -26, 0 -40"
        fill="none"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <path
        d="M-1.5 -16 C -6 -20, -10 -22, -13 -27"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M1 -24 C 6 -27, 9 -30, 11 -35"
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={-14} cy={-28} r={2.6} fill={color} />
      <circle cx={12} cy={-36} r={2.6} fill={color} />
      <circle cx={0} cy={-42} r={3} fill={color} />
    </motion.g>
  );
}

/** Cut-paper arch (rounded-top block). */
export function Arch({
  x,
  y,
  w,
  h,
  color = ART.paper,
  delay = 0,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  delay?: number;
}) {
  const d = `M${x} ${y + h} L${x} ${y + h * 0.42} C ${x} ${y + h * 0.08}, ${
    x + w
  } ${y + h * 0.08}, ${x + w} ${y + h * 0.42} L${x + w} ${y + h} Z`;
  return <Fill d={d} color={color} delay={delay} />;
}

/** Stacked pebbles — irregular ellipses, cut-paper fill. */
export function Pebbles({
  items,
  color = ART.paper,
  baseDelay = 0,
}: {
  items: [number, number, number, number][];
  color?: string;
  baseDelay?: number;
}) {
  const { fade } = useArtMotion();
  return (
    <>
      {items.map(([cx, cy, rx, ry], i) => (
        <motion.ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={color}
          {...fade(baseDelay + i * 0.15)}
        />
      ))}
    </>
  );
}

/** Single-line profile face looking left; (x,y) ≈ forehead anchor. */
export function ProfileFace({
  x,
  y,
  s = 1,
  delay = 0,
}: {
  x: number;
  y: number;
  s?: number;
  delay?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Stroke
        d="M0 -22 C 14 -24, 22 -12, 19 2 C 18 10, 12 18, 4 22"
        w={2.2 / s}
        delay={delay}
      />
      <Stroke
        d="M0 -22 C -8 -20, -11 -12, -9 -6 C -8 -2, -13 0, -12 3 C -11 6, -7 6, -8 9 C -9 12, -5 13, -6 16 C -7 19, -2 21, 4 22"
        w={2.2 / s}
        delay={delay + 0.25}
      />
      <Dot cx={-4} cy={-8} r={1.8 / s} delay={delay + 0.5} />
    </g>
  );
}

/** One-line figure reaching up; feet at (x,y). */
export function FigureReach({
  x,
  y,
  s = 1,
  delay = 0,
}: {
  x: number;
  y: number;
  s?: number;
  delay?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Stroke d="M2 -34 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0" w={2.2 / s} delay={delay} />
      <Stroke d="M0 -28 C 3 -20, -2 -12, 0 -4" w={2.4 / s} delay={delay + 0.15} />
      <Stroke d="M1 -25 C 7 -29, 11 -33, 13 -39" w={2.2 / s} delay={delay + 0.3} />
      <Stroke d="M0 -23 C -5 -20, -8 -17, -11 -13" w={2.2 / s} delay={delay + 0.4} />
      <Stroke d="M0 -4 C -4 2, -8 4, -12 5" w={2.4 / s} delay={delay + 0.5} />
      <Stroke d="M0 -4 C 3 3, 6 6, 11 8" w={2.4 / s} delay={delay + 0.6} />
    </g>
  );
}

/** Radial tick burst. */
export function Sunburst({
  cx,
  cy,
  r = 16,
  n = 8,
  color = ART.ink,
  delay = 0,
}: {
  cx: number;
  cy: number;
  r?: number;
  n?: number;
  color?: string;
  delay?: number;
}) {
  const { fade } = useArtMotion();
  const ticks = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return {
      x1: cx + Math.cos(a) * r * 0.62,
      y1: cy + Math.sin(a) * r * 0.62,
      x2: cx + Math.cos(a) * r,
      y2: cy + Math.sin(a) * r,
    };
  });
  return (
    <motion.g {...fade(delay)}>
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x1}
          y1={t.y1}
          x2={t.x2}
          y2={t.y2}
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      ))}
    </motion.g>
  );
}

/** Straight ray with optional arrowhead. */
export function Ray({
  x1,
  y1,
  x2,
  y2,
  color = ART.ink,
  w = 2.5,
  head = true,
  headColor,
  delay = 0,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  w?: number;
  head?: boolean;
  headColor?: string;
  delay?: number;
}) {
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <>
      <Stroke d={`M${x1} ${y1} L${x2} ${y2}`} w={w} color={color} delay={delay} />
      {head && (
        <Fill
          d={arrowTri(x2, y2, angle, 8)}
          color={headColor ?? color}
          delay={delay + 0.2}
        />
      )}
    </>
  );
}
