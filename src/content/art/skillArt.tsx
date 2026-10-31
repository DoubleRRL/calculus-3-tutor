/** ART: one composition per course skill, keyed by skillId.
 *  Missing ids simply render null (see index.tsx). */
import type { ComponentType } from "react";
import { motion } from "@/lib/motion";
import { ART } from "./palette";
import { Stroke, Fill, Dot, Ring, Orbit, useArtMotion } from "./ArtFrame";
import {
  Piece,
  Sprig,
  Arch,
  Sunburst,
  FigureReach,
  Ray,
  Pebbles,
} from "./primitives";
import type { ArtProps } from "./unitArt";

/* ── Unit 1 · Vectors & 3-Space ──────────────────────────────────── */

/** Two points in space, distance between. */
function Coords3dArt({ className }: ArtProps) {
  return (
    <Piece tone="cream" className={className}>
      <Dot cx={74} cy={108} r={5} color={ART.terracotta} delay={0.1} />
      <Ring cx={74} cy={108} r={13} dashed delay={0.2} />
      <Dot cx={168} cy={52} r={5} color={ART.sage} delay={0.35} />
      <Ring cx={168} cy={52} r={13} dashed delay={0.45} />
      <Stroke d="M84 100 L158 60" dashed delay={0.6} />
    </Piece>
  );
}

/** Arrow bundle from one origin. */
function VectorsArt({ className }: ArtProps) {
  return (
    <Piece tone="terracotta" className={className}>
      <Dot cx={66} cy={116} r={5} color={ART.paper} delay={0.1} />
      <Ray x1={66} y1={116} x2={148} y2={44} delay={0.25} />
      <Ray x1={66} y1={116} x2={162} y2={100} delay={0.45} />
      <Ray x1={66} y1={116} x2={112} y2={38} delay={0.65} />
    </Piece>
  );
}

/** Two directions meeting at a dot. */
function DotProductArt({ className }: ArtProps) {
  return (
    <Piece tone="lavender" className={className}>
      <Stroke d="M48 44 C 72 58, 94 68, 112 78" delay={0.1} />
      <Stroke d="M192 116 C 168 102, 146 92, 128 82" delay={0.3} />
      <Dot cx={120} cy={80} r={7} color={ART.terracotta} delay={0.55} />
    </Piece>
  );
}

/** Woven grid — the cross product plait. */
function CrossProductArt({ className }: ArtProps) {
  return (
    <Piece tone="sage" className={className}>
      <Stroke d="M90 40 L90 120" delay={0.1} />
      <Stroke d="M120 40 L120 120" delay={0.2} />
      <Stroke d="M150 40 L150 120" delay={0.3} />
      <Stroke d="M60 66 L180 66" delay={0.4} />
      <Stroke d="M60 96 L180 96" delay={0.5} />
      <Dot cx={135} cy={96} r={5} color={ART.terracotta} delay={0.7} />
    </Piece>
  );
}

/** Tilted plane pierced by a line. */
function LinesPlanesArt({ className }: ArtProps) {
  return (
    <Piece tone="ochre" className={className}>
      <Fill
        d="M56 104 L128 76 L188 96 L116 124 Z"
        color={ART.paper}
        delay={0.1}
      />
      <Stroke d="M96 28 L160 132" delay={0.4} />
      <Dot cx={118} cy={80} r={4} color={ART.terracotta} delay={0.6} />
      <Dot cx={142} cy={106} r={4} color={ART.terracotta} delay={0.75} />
    </Piece>
  );
}

/** Quadric family — dome, cone, vase silhouettes. */
function QuadricsArt({ className }: ArtProps) {
  return (
    <Piece tone="blush" className={className}>
      <Stroke d="M40 118 C 54 62, 82 62, 96 118" delay={0.1} />
      <Fill d="M112 118 L140 64 L168 118 Z" color={ART.paper} delay={0.25} />
      <Stroke d="M112 118 L140 64 L168 118" delay={0.35} />
      <Stroke d="M190 118 C 202 100, 178 84, 192 64" delay={0.5} />
      <Stroke d="M222 118 C 210 100, 234 84, 220 64" delay={0.6} />
    </Piece>
  );
}

/** Concentric coordinate rings. */
function CylSphArt({ className }: ArtProps) {
  return (
    <Piece tone="cream" className={className}>
      <Ring cx={120} cy={80} r={48} dashed delay={0.1} />
      <Ring cx={120} cy={80} r={34} delay={0.3} />
      <Ring cx={120} cy={80} r={20} delay={0.5} />
      <Stroke d="M120 24 L120 36" delay={0.65} />
      <Stroke d="M120 124 L120 136" delay={0.7} />
      <Stroke d="M56 80 L68 80" delay={0.75} />
      <Stroke d="M172 80 L184 80" delay={0.8} />
      <Dot cx={120} cy={80} r={4} color={ART.terracotta} delay={0.9} />
    </Piece>
  );
}

/* ── Unit 2 · Vector Functions ───────────────────────────────────── */

/** Flowing ribbon with direction. */
function VectorFnArt({ className }: ArtProps) {
  return (
    <Piece tone="terracotta" className={className}>
      <Fill
        d="M48 100 C 90 52, 140 128, 192 70 L192 86 C 140 144, 90 68, 48 116 Z"
        color={ART.paper}
        delay={0.1}
      />
      <Stroke d="M48 108 C 90 60, 140 136, 190 79" delay={0.45} />
      <Fill d="M198 74 L182 74 L191 88 Z" color={ART.ink} delay={0.7} />
    </Piece>
  );
}

/** Curve measured by chords + knots. */
function ArcLengthArt({ className }: ArtProps) {
  return (
    <Piece tone="lavender" className={className}>
      <Stroke d="M40 116 C 80 60, 150 60, 200 104" w={3} delay={0.1} />
      {[0.4, 0.5, 0.6, 0.7].map((d, i) => (
        <Dot
          key={i}
          cx={[66, 103, 143, 178][i]!}
          cy={[88, 72, 72, 88][i]!}
          r={3.5}
          color={ART.terracotta}
          delay={d}
        />
      ))}
      <Stroke
        d="M40 116 L66 88 L103 72 L143 72 L178 88 L200 104"
        dashed
        delay={0.85}
      />
    </Piece>
  );
}

/** Runner with looped trail. */
function MotionArt({ className }: ArtProps) {
  return (
    <Piece tone="sage" className={className}>
      <Stroke
        d="M36 96 C 60 60, 96 60, 104 84 C 110 102, 88 108, 84 94 C 80 80, 104 70, 128 78"
        dashed
        delay={0.1}
      />
      <FigureReach x={152} y={110} s={1.15} delay={0.4} />
      <Dot cx={196} cy={62} r={4} color={ART.terracotta} delay={0.8} />
    </Piece>
  );
}

/** TNB — pebble stack wound by a ring with three riders. */
function CurvatureArt({ className }: ArtProps) {
  return (
    <Piece tone="ochre" className={className}>
      <Pebbles
        items={[
          [120, 118, 26, 14],
          [120, 94, 19, 11],
          [120, 73, 12, 8],
        ]}
        baseDelay={0.1}
      />
      <Orbit cx={120} cy={94} rx={38} ry={11} tilt={-10} delay={0.55} />
      <Dot cx={155} cy={87} r={3.5} color={ART.terracotta} delay={0.75} />
      <Dot cx={85} cy={100} r={3.5} color={ART.sage} delay={0.85} />
      <Dot cx={121} cy={106} r={3.5} color={ART.lavender} delay={0.95} />
    </Piece>
  );
}

/* ── Unit 3 · Partial Derivatives ────────────────────────────────── */

/** Topographic level curves. */
function FunctionsArt({ className }: ArtProps) {
  return (
    <Piece tone="cream" className={className}>
      <Stroke
        d="M120 36 C158 34 182 58 178 88 C174 116 148 132 118 130 C88 128 62 108 64 78 C66 52 88 38 120 36 Z"
        w={2}
        delay={0.1}
      />
      <Stroke
        d="M120 56 C144 55 160 70 157 90 C154 108 136 118 118 116 C100 114 84 102 86 84 C88 68 100 57 120 56 Z"
        w={2}
        delay={0.3}
      />
      <Dot cx={119} cy={86} r={6} color={ART.terracotta} delay={0.55} />
    </Piece>
  );
}

/** Three paths approaching an open circle — never touching. */
function LimitsArt({ className }: ArtProps) {
  return (
    <Piece tone="terracotta" className={className}>
      <Ring cx={120} cy={84} r={14} delay={0.1} />
      <Stroke d="M36 60 C 70 62, 92 72, 102 78" delay={0.3} />
      <Stroke d="M204 108 C 170 106, 148 96, 138 90" delay={0.5} />
      <Stroke d="M120 28 C 118 44, 119 56, 120 66" delay={0.7} />
    </Piece>
  );
}

/** Loaf being sliced. */
function PartialsArt({ className }: ArtProps) {
  return (
    <Piece tone="lavender" className={className}>
      <Fill
        d="M56 116 C 60 72, 96 56, 124 56 C 152 56 184 74 188 116 Z"
        color={ART.paper}
        delay={0.1}
      />
      <Stroke d="M100 62 L100 116" w={2} delay={0.35} />
      <Stroke d="M124 56 L124 116" w={3} color={ART.terracotta} delay={0.5} />
      <Stroke d="M148 62 L148 116" w={2} delay={0.65} />
    </Piece>
  );
}

/** Chain rule as a branching sprig. */
function ChainArt({ className }: ArtProps) {
  return (
    <Piece tone="sage" className={className}>
      <Stroke d="M120 128 C 120 112, 120 104, 120 92" w={3} delay={0.1} />
      <Stroke d="M120 92 C 108 84, 100 78, 92 68" delay={0.25} />
      <Stroke d="M120 92 C 132 84, 140 78, 148 68" delay={0.35} />
      <Stroke d="M92 68 C 86 62, 82 56, 80 48" delay={0.5} />
      <Stroke d="M92 68 C 98 60, 102 54, 106 46" delay={0.6} />
      <Stroke d="M148 68 C 142 60, 138 54, 134 46" delay={0.7} />
      <Stroke d="M148 68 C 154 62, 158 56, 160 48" delay={0.8} />
      {[
        [80, 44],
        [106, 42],
        [134, 42],
        [160, 44],
      ].map(([x, y], i) => (
        <Dot key={i} cx={x} cy={y} r={3.5} color={ART.terracotta} delay={0.9 + i * 0.05} />
      ))}
    </Piece>
  );
}

/** Gradient — arrows climbing contours toward the peak sun. */
function GradientArt({ className }: ArtProps) {
  return (
    <Piece tone="ochre" className={className}>
      <Stroke d="M40 128 C 80 108, 160 108, 200 128" w={2} delay={0.1} />
      <Stroke d="M56 112 C 90 96, 150 96, 184 112" w={2} delay={0.2} />
      <Stroke d="M76 96 C 100 84, 140 84, 164 96" w={2} delay={0.3} />
      <Ray x1={96} y1={104} x2={88} y2={88} headColor={ART.ink} delay={0.5} />
      <Ray x1={124} y1={100} x2={124} y2={86} headColor={ART.ink} delay={0.6} />
      <Ray x1={152} y1={104} x2={160} y2={88} headColor={ART.ink} delay={0.7} />
      <Sunburst cx={204} cy={34} r={16} color={ART.rust} delay={0.85} />
      <Dot cx={120} cy={80} r={4} color={ART.terracotta} delay={0.8} />
    </Piece>
  );
}

/** Valley ball vs summit ball. */
function ExtremaArt({ className }: ArtProps) {
  return (
    <Piece tone="cream" className={className}>
      <Stroke d="M36 64 C 60 116, 92 116, 116 84" w={3} delay={0.1} />
      <Dot cx={76} cy={107} r={6} color={ART.sage} delay={0.3} />
      <Stroke d="M132 116 C 156 64, 188 64, 212 116" w={3} delay={0.5} />
      <Dot cx={171} cy={73} r={6} color={ART.terracotta} delay={0.7} />
    </Piece>
  );
}

/** Figure roped to two posts. */
function LagrangeArt({ className }: ArtProps) {
  return (
    <Piece tone="terracotta" className={className}>
      <Stroke d="M56 60 L56 124" w={3} delay={0.1} />
      <Stroke d="M184 60 L184 124" w={3} delay={0.2} />
      <Dot cx={56} cy={58} r={4} color={ART.paper} delay={0.3} />
      <Dot cx={184} cy={58} r={4} color={ART.paper} delay={0.35} />
      <Stroke d="M56 66 C 84 92, 104 96, 113 97" delay={0.45} />
      <Stroke d="M184 66 C 156 92, 136 96, 127 97" delay={0.55} />
      <Dot cx={120} cy={97} r={8} color={ART.sage} delay={0.7} />
      <Dot cx={120} cy={83} r={4} color={ART.sage} delay={0.8} />
    </Piece>
  );
}

/* ── Unit 4 · Multiple Integrals ─────────────────────────────────── */

/** Dome over shaded grid cells. */
function DoubleRectArt({ className }: ArtProps) {
  const cell = (x: number, top: number) =>
    `M${x} ${top} L${x + 30} ${top} L${x + 30} 112 L${x} 112 Z`;
  return (
    <Piece tone="lavender" className={className}>
      <Fill d={cell(45, 92)} color={ART.paper} delay={0.3} />
      <Fill d={cell(75, 66)} color={ART.cream} delay={0.42} />
      <Fill d={cell(105, 56)} color={ART.paper} delay={0.54} />
      <Fill d={cell(135, 66)} color={ART.cream} delay={0.66} />
      <Fill d={cell(165, 92)} color={ART.paper} delay={0.78} />
      <Stroke d="M44 112 C 84 48, 156 48, 196 112" w={3} delay={0.1} />
      {[75, 105, 135, 165].map((x, i) => (
        <Stroke key={x} d={`M${x} ${[92, 62, 56, 66][i]!} L${x} 112`} w={1.8} delay={0.9 + i * 0.04} />
      ))}
    </Piece>
  );
}

/** Region between two curves, sliced both ways. */
function BoundsArt({ className }: ArtProps) {
  return (
    <Piece tone="sage" className={className}>
      <Fill
        d="M44 60 C 90 44, 150 76, 196 56 L196 108 C 150 88, 90 120, 44 104 Z"
        color={ART.paper}
        delay={0.3}
      />
      <Stroke d="M44 60 C 90 44, 150 76, 196 56" w={2.5} delay={0.1} />
      <Stroke d="M44 104 C 90 120, 150 88, 196 108" w={2.5} delay={0.2} />
      <Stroke d="M120 62 L120 101" w={3} color={ART.terracotta} delay={0.6} />
      <Stroke d="M64 84 L176 81" dashed delay={0.75} />
    </Piece>
  );
}

/** Polar rose. */
function PolarArt({ className }: ArtProps) {
  const { fade } = useArtMotion();
  const petals = [
    [146, 82, 0],
    [133, 104, 60],
    [107, 104, 120],
    [94, 82, 180],
    [107, 60, 240],
    [133, 60, 300],
  ] as const;
  return (
    <Piece tone="blush" className={className}>
      {petals.map(([cx, cy, tilt], i) => (
        <motion.ellipse
          key={i}
          cx={cx}
          cy={cy}
          rx={16}
          ry={10}
          transform={`rotate(${tilt} ${cx} ${cy})`}
          fill={i % 2 === 0 ? ART.paper : ART.terracotta}
          {...fade(0.15 + i * 0.08)}
        />
      ))}
      <Dot cx={120} cy={82} r={6} color={ART.ochre} delay={0.7} />
    </Piece>
  );
}

/** Slabs around a solid core. */
function TripleArt({ className }: ArtProps) {
  const slab = (y: number, dx: number) =>
    `M${70 + dx} ${y} L${150 + dx} ${y} L${166 + dx} ${y + 13} L${86 + dx} ${y + 13} Z`;
  return (
    <Piece tone="ochre" className={className}>
      <Fill d={slab(64, 0)} color={ART.cream} delay={0.1} />
      <Fill d={slab(86, 5)} color={ART.paper} delay={0.3} />
      <Fill d={slab(108, 10)} color={ART.cream} delay={0.5} />
      <Fill
        d="M128 74 C 140 74 148 82 147 93 C 146 104 137 111 127 110 C 117 109 110 101 111 91 C 112 81 118 74 128 74 Z"
        color={ART.lavender}
        delay={0.75}
      />
    </Piece>
  );
}

/** Wireframe globe. */
function CylSphIntArt({ className }: ArtProps) {
  return (
    <Piece tone="cream" className={className}>
      <Ring cx={120} cy={82} r={44} delay={0.1} />
      <Orbit cx={120} cy={66} rx={34} ry={9} delay={0.3} />
      <Orbit cx={120} cy={98} rx={34} ry={9} delay={0.45} />
      <Orbit cx={120} cy={82} rx={14} ry={44} delay={0.6} />
      <Dot cx={146} cy={60} r={4} color={ART.terracotta} delay={0.8} />
    </Piece>
  );
}

/** Grid stretched from two corners. */
function JacobianArt({ className }: ArtProps) {
  return (
    <Piece tone="terracotta" className={className}>
      <Stroke d="M84 48 C 76 76, 92 104, 84 132" w={2} delay={0.1} />
      <Stroke d="M120 44 C 112 76, 128 104, 120 136" w={2} delay={0.2} />
      <Stroke d="M156 48 C 148 76, 164 104, 156 132" w={2} delay={0.3} />
      <Stroke d="M60 66 C 100 58, 140 74, 180 66" w={2} delay={0.4} />
      <Stroke d="M60 106 C 100 98, 140 114, 180 106" w={2} delay={0.5} />
      <Dot cx={50} cy={42} r={7} color={ART.paper} delay={0.65} />
      <Dot cx={190} cy={128} r={7} color={ART.paper} delay={0.75} />
      <Stroke d="M40 34 L46 40" w={2} color={ART.paper} delay={0.85} />
      <Stroke d="M200 136 L194 130" w={2} color={ART.paper} delay={0.9} />
    </Piece>
  );
}

/* ── Unit 5 · Vector Calculus ────────────────────────────────────── */

/** A field of sprigs leaning together. */
function FieldsArt({ className }: ArtProps) {
  return (
    <Piece tone="sage" className={className}>
      <Sprig x={52} y={128} s={0.7} angle={14} color={ART.paper} delay={0.1} />
      <Sprig x={86} y={130} s={0.95} angle={14} color={ART.paper} delay={0.25} />
      <Sprig x={120} y={128} s={0.8} angle={14} color={ART.paper} delay={0.4} />
      <Sprig x={154} y={130} s={1.05} angle={14} color={ART.paper} delay={0.55} />
      <Sprig x={188} y={128} s={0.75} angle={14} color={ART.paper} delay={0.7} />
    </Piece>
  );
}

/** Winding path with footprints and a flag. */
function LineIntArt({ className }: ArtProps) {
  return (
    <Piece tone="lavender" className={className}>
      <Stroke
        d="M40 120 C 70 70, 110 130, 140 84 C 158 58, 180 56, 198 46"
        w={3}
        delay={0.1}
      />
      <Dot cx={66} cy={92} r={2.5} color={ART.terracotta} delay={0.4} />
      <Dot cx={75} cy={101} r={2.5} color={ART.terracotta} delay={0.48} />
      <Dot cx={104} cy={108} r={2.5} color={ART.terracotta} delay={0.56} />
      <Dot cx={113} cy={114} r={2.5} color={ART.terracotta} delay={0.64} />
      <Dot cx={138} cy={86} r={2.5} color={ART.terracotta} delay={0.72} />
      <Dot cx={147} cy={92} r={2.5} color={ART.terracotta} delay={0.8} />
      <Dot cx={199} cy={42} r={5} color={ART.rust} delay={0.9} />
    </Piece>
  );
}

/** Ball returns to its starting height on a closed loop. */
function ConservativeArt({ className }: ArtProps) {
  return (
    <Piece tone="blush" className={className}>
      <Orbit cx={120} cy={86} rx={56} ry={34} w={3} delay={0.1} />
      <Stroke d="M44 122 L196 122" dashed delay={0.3} />
      <Dot cx={176} cy={86} r={7} color={ART.sage} delay={0.5} />
      <Stroke d="M64 86 L50 86" w={2} delay={0.7} />
      <Stroke d="M176 86 L190 86" w={2} delay={0.8} />
    </Piece>
  );
}

/** Closed region with a leaf inside. */
function GreenArt({ className }: ArtProps) {
  return (
    <Piece tone="sage" className={className}>
      <Fill
        d="M120 40 C154 38 178 60 175 88 C172 114 148 130 118 128 C90 126 66 106 68 78 C70 54 90 42 120 40 Z"
        color={ART.paper}
        delay={0.1}
      />
      <Stroke
        d="M120 40 C154 38 178 60 175 88 C172 114 148 130 118 128 C90 126 66 106 68 78 C70 54 90 42 120 40 Z"
        w={2.5}
        delay={0.3}
      />
      <Fill
        d="M120 98 C 106 90, 106 72, 120 62 C 134 72, 134 90, 120 98 Z"
        color={ART.terracotta}
        delay={0.55}
      />
      <Stroke d="M120 95 L120 66" w={2} color={ART.paper} delay={0.75} />
    </Piece>
  );
}

/** Pinwheel — curl with radiating hints. */
function CurlDivArt({ className }: ArtProps) {
  return (
    <Piece tone="ochre" className={className}>
      <Dot cx={120} cy={82} r={6} color={ART.terracotta} delay={0.1} />
      <Stroke d="M120 80 C 128 66, 142 62, 154 68" w={3} delay={0.25} />
      <Stroke d="M122 84 C 136 92, 140 106, 134 118" w={3} delay={0.4} />
      <Stroke d="M118 84 C 110 98, 96 102, 84 96" w={3} delay={0.55} />
      <Stroke d="M118 80 C 104 72, 100 58, 106 46" w={3} delay={0.7} />
      <Dot cx={157} cy={69} r={3} color={ART.rust} delay={0.85} />
      <Dot cx={133} cy={121} r={3} color={ART.rust} delay={0.9} />
      <Dot cx={81} cy={97} r={3} color={ART.rust} delay={0.95} />
      <Dot cx={105} cy={43} r={3} color={ART.rust} delay={1.0} />
    </Piece>
  );
}

/** Rain passing through an umbrella surface. */
function SurfaceArt({ className }: ArtProps) {
  return (
    <Piece tone="cream" className={className}>
      <Fill d="M60 84 C 60 52, 180 52, 180 84 Z" color={ART.paper} delay={0.1} />
      <Stroke d="M60 84 C 60 52, 180 52, 180 84" w={2.5} delay={0.25} />
      <Stroke d="M120 84 L120 128" delay={0.4} />
      <Ray x1={96} y1={40} x2={96} y2={64} color={ART.rust} headColor={ART.rust} delay={0.55} />
      <Ray x1={96} y1={92} x2={96} y2={118} color={ART.rust} headColor={ART.rust} delay={0.65} />
      <Ray x1={144} y1={40} x2={144} y2={64} color={ART.rust} headColor={ART.rust} delay={0.75} />
      <Ray x1={144} y1={92} x2={144} y2={118} color={ART.rust} headColor={ART.rust} delay={0.85} />
    </Piece>
  );
}

/** Cloth draped over a wire loop. */
function StokesArt({ className }: ArtProps) {
  return (
    <Piece tone="terracotta" className={className}>
      <Orbit cx={120} cy={112} rx={48} ry={14} delay={0.1} />
      <Fill
        d="M76 108 C 74 84, 96 60, 122 58 C 150 56, 168 78, 164 104 C 150 112, 90 114, 76 108 Z"
        color={ART.paper}
        delay={0.3}
      />
      <Stroke d="M84 118 C 104 126, 140 126, 158 117" w={2.5} delay={0.6} />
      <Fill d="M164 115 L152 111 L156 123 Z" color={ART.ink} delay={0.8} />
    </Piece>
  );
}

/** Radiating sun — pure divergence. */
function DivergenceArt({ className }: ArtProps) {
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return {
      x1: 120 + Math.cos(a) * 24,
      y1: 82 + Math.sin(a) * 24,
      x2: 120 + Math.cos(a) * 44,
      y2: 82 + Math.sin(a) * 44,
    };
  });
  return (
    <Piece tone="lavender" className={className}>
      <Dot cx={120} cy={82} r={16} color={ART.ochre} delay={0.1} />
      {rays.map((r, i) => (
        <Ray key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} w={2.5} delay={0.3 + i * 0.06} />
      ))}
    </Piece>
  );
}

/** Three arches, middle favored. */
function TheoremPickArt({ className }: ArtProps) {
  return (
    <Piece tone="blush" className={className}>
      <Arch x={44} y={64} w={40} h={64} delay={0.1} />
      <Arch x={100} y={48} w={40} h={80} delay={0.3} />
      <Arch x={156} y={64} w={40} h={64} delay={0.5} />
      <Dot cx={120} cy={34} r={5} color={ART.terracotta} delay={0.7} />
    </Piece>
  );
}

export const SKILL_ART: Record<string, ComponentType<ArtProps>> = {
  u1_coords3d: Coords3dArt,
  u1_vectors: VectorsArt,
  u1_dot: DotProductArt,
  u1_cross: CrossProductArt,
  u1_lines_planes: LinesPlanesArt,
  u1_quadrics: QuadricsArt,
  u1_cyl_sph: CylSphArt,
  u2_vector_fn: VectorFnArt,
  u2_arc_length: ArcLengthArt,
  u2_motion: MotionArt,
  u2_curvature: CurvatureArt,
  u3_functions: FunctionsArt,
  u3_limits: LimitsArt,
  u3_partials: PartialsArt,
  u3_chain: ChainArt,
  u3_gradient: GradientArt,
  u3_extrema: ExtremaArt,
  u3_lagrange: LagrangeArt,
  u4_double_rect: DoubleRectArt,
  u4_bounds: BoundsArt,
  u4_polar: PolarArt,
  u4_triple: TripleArt,
  u4_cyl_sph_int: CylSphIntArt,
  u4_jacobian: JacobianArt,
  u5_fields: FieldsArt,
  u5_line: LineIntArt,
  u5_conservative: ConservativeArt,
  u5_green: GreenArt,
  u5_curl_div: CurlDivArt,
  u5_surface: SurfaceArt,
  u5_stokes: StokesArt,
  u5_divergence: DivergenceArt,
  u5_theorem_pick: TheoremPickArt,
};
