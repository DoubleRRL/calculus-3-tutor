/** Interaction specs for visual/conceptual problem items. */

export type Vec2 = { x: number; y: number };

export type GridRange = {
  min: number;
  max: number;
  step?: number;
};

export type VectorTask =
  | { kind: "matchTip"; vectorId: string; target: Vec2; tolerance?: number }
  | { kind: "orthogonal"; aId: string; bId: string; tol?: number }
  | { kind: "sum"; aId: string; bId: string; resultId: string; tolerance?: number }
  | { kind: "unitOf"; sourceId: string; unitId: string; tolerance?: number };

export type VectorInteraction = {
  type: "vector";
  grid: GridRange;
  vectors: {
    id: string;
    tip: Vec2;
    fixed?: boolean;
    label?: string;
  }[];
  task: VectorTask;
  show?: ("dot" | "cross" | "projection" | "magnitude")[];
};

export type RegionOrder = "dydx" | "dxdy" | "rdθ";

/**
 * Outer limits stay numeric (drag handles).
 * Inner limits may be numeric (rectangles/polar) or a curve expression (Type I/II).
 */
export type BoundValue =
  | number
  | "0"
  | "x"
  | "y"
  | "x2"
  | "y2"
  | "sqrtx"
  | "sqrty"
  | "1-x"
  | "2-x"
  | "1-y"
  | "2-y";

export type RegionShade =
  | { kind: "rect"; x0: number; x1: number; y0: number; y1: number }
  | {
      kind: "underCurve";
      x0: number;
      x1: number;
      yTop: "x" | "x2" | "sqrtx" | "1-x" | "2-x";
      yBottom?: number;
    }
  | {
      kind: "between";
      x0: number;
      x1: number;
      upper: "x" | "x2" | "1-x" | "2-x" | "sqrtx";
      lower: "0" | "x" | "x2";
    }
  | {
      kind: "polarSector";
      r0: number;
      r1: number;
      theta0: number;
      theta1: number;
    };

export type RegionBounds = {
  order: RegionOrder;
  outerLo: number;
  outerHi: number;
  innerLo: BoundValue;
  innerHi: BoundValue;
};

export type RegionInteraction = {
  type: "region";
  grid: GridRange;
  shade: RegionShade;
  integrand?: string;
  initial?: Partial<RegionBounds>;
  solution: RegionBounds;
  accept?: RegionBounds[];
  /** Snap tolerance for numeric limits. */
  tolerance?: number;
  /**
   * Chips offered for innerLo/innerHi when the region has variable bounds.
   * Defaults derived from the shade if omitted.
   */
  innerChoices?: BoundValue[];
};

export type BucketsInteraction = {
  type: "buckets";
  buckets: { id: string; label: string }[];
  cards: { id: string; label: string }[];
  /** cardId → bucketId */
  solution: Record<string, string>;
};

/** f = ax² + by² + cxy + dx + ey + f0 */
export type QuadraticFn = {
  kind: "quadratic";
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f0: number;
};

export type ContourTask =
  | { kind: "criticalPoint"; target: Vec2; tolerance?: number }
  | { kind: "placeProbe"; target: Vec2; tolerance?: number }
  | { kind: "dirDerivSign"; sign: "neg" | "pos" | "zero" }
  | { kind: "lagrangeTangency"; target: Vec2; tolerance?: number };

export type ContourInteraction = {
  type: "contour";
  grid: GridRange;
  fn: QuadraticFn | { kind: "preset"; name: "paraboloid" | "saddle" | "gaussian" };
  levels?: number[];
  constraint?:
    | { kind: "circle"; cx: number; cy: number; r: number }
    | { kind: "line"; a: number; b: number; c: number };
  initialProbe?: Vec2;
  task: ContourTask;
};

export type CurveDef =
  | { kind: "circle"; r: number; cx?: number; cy?: number }
  | { kind: "line"; x0: number; y0: number; vx: number; vy: number }
  | { kind: "parabola"; a?: number }
  | { kind: "helix2d"; a: number; b: number };

export type CurveTask =
  | { kind: "atT"; t: number; tolerance?: number }
  | { kind: "maxSpeed"; t: number; tolerance?: number }
  | { kind: "accelPerpVel"; t: number; tolerance?: number };

export type CurveInteraction = {
  type: "curve";
  grid: GridRange;
  curve: CurveDef;
  tRange: [number, number];
  initialT?: number;
  task: CurveTask;
  /** Sample vector field along the curve (line-integral intuition). */
  field?: "rotate" | "radial" | "uniform";
};

export type Surface3dInteraction = {
  type: "surface3d";
  surface:
    | {
        kind: "quadric";
        name:
          | "ellipsoid"
          | "hyperboloid1"
          | "paraboloid"
          | "cone"
          | "saddle";
      }
    | { kind: "zfn"; preset: "paraboloid" | "saddle" | "gaussian" };
  /** Draw xy / xz / yz cross-section traces (partials / quadric intuition). */
  showTraces?: boolean;
  /** Draw boundary rim for Stokes demos. */
  showRim?: boolean;
  /** Field used for Stokes rim/flux computation. */
  stokesField?: "rotate" | "radial";
  task:
    | { kind: "identify"; answer: string; choices: string[] }
    | { kind: "probeAt"; target: [number, number]; tolerance?: number }
    /** Show equal circulation vs curl-flux readouts (Stokes intuition). */
    | { kind: "stokesCompare" }
    /** Emphasize sources: probe near origin of a radial-ish surface. */
    | { kind: "divIntuition"; target?: [number, number]; tolerance?: number };
};

/** Linear map (u,v) → (au+bv, cu+dv); |J| = |ad−bc|. Spec a–d are the initial matrix; student edits via drag. */
export type JacobianInteraction = {
  type: "jacobian";
  /** Initial matrix [[a,b],[c,d]] (columns = images of î, ĵ). */
  a: number;
  b: number;
  c: number;
  d: number;
  task: { kind: "matchDet"; target: number; tolerance?: number };
};

export type ChainTreeEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  rule: string;
  tip: string;
};

export type ChainTreeInteraction = {
  type: "chainTree";
  preset: "z_xy_t";
  nodes: { id: string; label: string; x: number; y: number }[];
  edges: ChainTreeEdge[];
  task?: { kind: "clickEdge"; edgeId: string };
};

export type Vec3 = [number, number, number];

export type Vector3dTask =
  | { kind: "explore" }
  | { kind: "matchCross"; target: Vec3; tolerance?: number }
  | { kind: "identify"; answer: string; choices: string[] };

export type Vector3dInteraction = {
  type: "vector3d";
  vectors: {
    id: string;
    components: Vec3;
    fixed?: boolean;
    label?: string;
    color?: string;
  }[];
  show?: ("cross" | "dot" | "parallelogram")[];
  task: Vector3dTask;
  autoOrbit?: boolean;
};

export type CoordFrameSystem = "cartesian" | "cylindrical" | "spherical";

export type CoordFrameInteraction = {
  type: "coordFrame";
  system: CoordFrameSystem;
  /** Point in cartesian for display; student can scrub params */
  point: Vec3;
  task:
    | { kind: "explore" }
    | { kind: "matchSystem"; answer: CoordFrameSystem; choices: CoordFrameSystem[] }
    | {
        kind: "readCoords";
        expect: {
          r?: number;
          theta?: number;
          z?: number;
          rho?: number;
          phi?: number;
        };
        tol?: number;
      };
};

export type Field2dPreset = "rotate" | "radial" | "uniform" | "shear";

export type Field2dTask =
  | { kind: "explore" }
  | { kind: "probeCurlDiv"; expect: "curl" | "div" | "neither" }
  | {
      kind: "twoPath";
      pathA: "line" | "arc";
      pathB: "line" | "arc";
      expectEqual: boolean;
    };

export type Field2dInteraction = {
  type: "field2d";
  grid: GridRange;
  field: Field2dPreset;
  mode?: "arrows" | "curlProbe" | "divProbe" | "twoPath";
  task: Field2dTask;
};

export type InteractionSpec =
  | VectorInteraction
  | RegionInteraction
  | BucketsInteraction
  | ContourInteraction
  | CurveInteraction
  | Surface3dInteraction
  | JacobianInteraction
  | ChainTreeInteraction
  | Vector3dInteraction
  | CoordFrameInteraction
  | Field2dInteraction;
