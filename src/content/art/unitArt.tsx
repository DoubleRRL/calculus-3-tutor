/** ART: one composition per unit. */
import type { ComponentType } from "react";
import type { UnitId } from "@/types/content";
import { ART } from "./palette";
import { Fill, Dot, Ring, Orbit } from "./ArtFrame";
import { Piece, Sprig, Arch, Pebbles, ProfileFace, FigureReach, Ray } from "./primitives";

export type ArtProps = { className?: string };

/** Foundations — profile + sprout + rising seeds. */
function DiagnosticArt({ className }: ArtProps) {
  return (
    <Piece tone="cream" className={className}>
      <ProfileFace x={96} y={54} s={1.5} />
      <Sprig x={148} y={66} s={1.05} angle={8} color={ART.sage} delay={0.35} />
      <Dot cx={62} cy={122} r={3} color={ART.terracotta} delay={0.5} />
      <Dot cx={73} cy={112} r={3.5} color={ART.terracotta} delay={0.65} />
      <Dot cx={86} cy={104} r={4} color={ART.terracotta} delay={0.8} />
    </Piece>
  );
}

/** Vectors & 3-space — arch, sphere, axes. */
function Unit1Art({ className }: ArtProps) {
  return (
    <Piece tone="terracotta" className={className}>
      <Arch x={84} y={40} w={80} h={88} delay={0.15} />
      <Dot cx={54} cy={124} r={14} color={ART.cream} delay={0.45} />
      <Ring cx={54} cy={124} r={19} w={2} delay={0.55} />
      <Ray x1={30} y1={138} x2={30} y2={50} delay={0.7} />
      <Ray x1={30} y1={138} x2={146} y2={138} delay={0.85} />
      <Ray x1={30} y1={138} x2={78} y2={96} delay={1.0} />
    </Piece>
  );
}

/** Vector functions — pebble stack wound by orbit ribbons (TNB vibe). */
function Unit2Art({ className }: ArtProps) {
  return (
    <Piece tone="lavender" className={className}>
      <Pebbles
        items={[
          [120, 120, 32, 17],
          [120, 92, 23, 13],
          [120, 68, 15, 9],
        ]}
        baseDelay={0.1}
      />
      <Orbit cx={120} cy={92} rx={46} ry={13} tilt={-12} delay={0.55} />
      <Orbit cx={120} cy={66} rx={30} ry={9} tilt={14} delay={0.75} />
      <Dot cx={166} cy={84} r={4} color={ART.terracotta} delay={0.95} />
    </Piece>
  );
}

/** Partial derivatives — contour hill with a climber on top. */
function Unit3Art({ className }: ArtProps) {
  return (
    <Piece tone="sage" className={className}>
      <Orbit cx={120} cy={112} rx={64} ry={26} w={2} delay={0.1} />
      <Orbit cx={120} cy={112} rx={44} ry={17} w={2} delay={0.3} />
      <Dot cx={120} cy={112} r={16} color={ART.paper} delay={0.5} />
      <Dot cx={120} cy={112} r={4} color={ART.terracotta} delay={0.7} />
      <FigureReach x={120} y={86} s={0.85} delay={0.6} />
    </Piece>
  );
}

/** Multiple integrals — stacked slabs. */
function Unit4Art({ className }: ArtProps) {
  const slab = (y: number, dx: number) =>
    `M${72 + dx} ${y} L${152 + dx} ${y} L${168 + dx} ${y + 14} L${88 + dx} ${y + 14} Z`;
  return (
    <Piece tone="ochre" className={className}>
      <Fill d={slab(58, 0)} color={ART.cream} delay={0.1} />
      <Fill d={slab(76, 4)} color={ART.paper} delay={0.3} />
      <Fill d={slab(94, 8)} color={ART.cream} delay={0.5} />
      <Fill d={slab(112, 12)} color={ART.paper} delay={0.7} />
      <Dot cx={178} cy={58} r={4} color={ART.terracotta} delay={0.9} />
    </Piece>
  );
}

/** Vector calculus — sprig threaded through a loop. */
function Unit5Art({ className }: ArtProps) {
  return (
    <Piece tone="blush" className={className}>
      <Orbit cx={120} cy={82} rx={54} ry={30} tilt={-10} w={3} delay={0.1} />
      <Sprig x={120} y={128} s={1.15} color={ART.paper} delay={0.45} />
      <Dot cx={120} cy={44} r={3.5} color={ART.terracotta} delay={0.75} />
    </Piece>
  );
}

export const UNIT_ART: Partial<Record<UnitId, ComponentType<ArtProps>>> = {
  diagnostic: DiagnosticArt,
  unit1: Unit1Art,
  unit2: Unit2Art,
  unit3: Unit3Art,
  unit4: Unit4Art,
  unit5: Unit5Art,
};
