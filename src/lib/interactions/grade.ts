import type {
  BucketsInteraction,
  ContourInteraction,
  CurveInteraction,
  QuadraticFn,
  RegionBounds,
  RegionInteraction,
  Surface3dInteraction,
  VectorInteraction,
  Vec2,
} from "@/types/interactions";
import { near, numClose, parseJsonSafe } from "./math";
import { gradientAt } from "./contourMath";
import { boundEquals } from "./regionBounds";

export type GradeOk = { correct: boolean; feedback: string };

function ok(correct: boolean, badMsg: string): GradeOk {
  return {
    correct,
    feedback: correct ? "Correct." : badMsg,
  };
}

export type VectorState = {
  tips: Record<string, Vec2>;
};

export function gradeVector(
  spec: VectorInteraction,
  raw: string,
): GradeOk {
  const state = parseJsonSafe<VectorState>(raw);
  if (!state?.tips) return ok(false, "Move the vectors, then check.");

  const tip = (id: string): Vec2 | undefined => state.tips[id];
  const task = spec.task;

  if (task.kind === "matchTip") {
    const t = tip(task.vectorId);
    if (!t) return ok(false, "Drag the labeled vector tip.");
    return ok(
      near(t, task.target, task.tolerance ?? 0.4),
      `Tip should be near (${task.target.x}, ${task.target.y}).`,
    );
  }

  if (task.kind === "orthogonal") {
    const a = tip(task.aId);
    const b = tip(task.bId);
    if (!a || !b) return ok(false, "Both vectors need tips.");
    const dot = a.x * b.x + a.y * b.y;
    return ok(
      Math.abs(dot) <= (task.tol ?? 0.35),
      "Dot product should be ~0 (orthogonal).",
    );
  }

  if (task.kind === "sum") {
    const a = tip(task.aId);
    const b = tip(task.bId);
    const r = tip(task.resultId);
    if (!a || !b || !r) return ok(false, "Place all three vectors.");
    const target = { x: a.x + b.x, y: a.y + b.y };
    return ok(
      near(r, target, task.tolerance ?? 0.45),
      "Result tip should equal the vector sum.",
    );
  }

  if (task.kind === "unitOf") {
    const src = tip(task.sourceId);
    const u = tip(task.unitId);
    if (!src || !u) return ok(false, "Place both vectors.");
    const mag = Math.hypot(src.x, src.y);
    if (mag < 1e-6) return ok(false, "Source vector is zero.");
    const unit = { x: src.x / mag, y: src.y / mag };
    const umag = Math.hypot(u.x, u.y);
    return ok(
      near(u, unit, task.tolerance ?? 0.35) && Math.abs(umag - 1) < 0.35,
      "Unit vector has length 1 in the same direction.",
    );
  }

  return ok(false, "Unknown vector task.");
}

export type RegionState = RegionBounds;

function boundsMatch(
  a: RegionBounds,
  b: RegionBounds,
  tol: number,
): boolean {
  return (
    a.order === b.order &&
    numClose(a.outerLo, b.outerLo, tol) &&
    numClose(a.outerHi, b.outerHi, tol) &&
    boundEquals(a.innerLo, b.innerLo, tol) &&
    boundEquals(a.innerHi, b.innerHi, tol)
  );
}

export function gradeRegion(
  spec: RegionInteraction,
  raw: string,
): GradeOk {
  const state = parseJsonSafe<RegionState>(raw);
  if (!state?.order) return ok(false, "Set the limits and order, then check.");
  const tol = spec.tolerance ?? 0.2;
  const candidates = [spec.solution, ...(spec.accept ?? [])];
  for (const c of candidates) {
    if (boundsMatch(state, c, tol)) {
      return ok(true, "");
    }
  }
  return ok(false, "Limits or order don't match a valid setup.");
}

export type BucketsState = {
  assignment: Record<string, string>;
};

export function gradeBuckets(
  spec: BucketsInteraction,
  raw: string,
): GradeOk {
  const state = parseJsonSafe<BucketsState>(raw);
  if (!state?.assignment) return ok(false, "Drag every card into a bucket.");
  for (const card of spec.cards) {
    const want = spec.solution[card.id];
    const got = state.assignment[card.id];
    if (!got) return ok(false, `Place “${card.label}” into a bucket.`);
    if (got !== want) {
      return ok(false, "At least one card is in the wrong bucket.");
    }
  }
  return ok(true, "");
}

export type ContourState = {
  probe: Vec2;
  direction?: Vec2;
};

export function resolveQuadratic(
  fn: ContourInteraction["fn"],
): QuadraticFn {
  if (fn.kind === "quadratic") return fn;
  if (fn.name === "paraboloid") {
    return { kind: "quadratic", a: 1, b: 1, c: 0, d: 0, e: 0, f0: 0 };
  }
  if (fn.name === "saddle") {
    return { kind: "quadratic", a: 1, b: -1, c: 0, d: 0, e: 0, f0: 0 };
  }
  // gaussian-ish bowl approx
  return { kind: "quadratic", a: 0.5, b: 0.5, c: 0, d: 0, e: 0, f0: 0 };
}

export function gradeContour(
  spec: ContourInteraction,
  raw: string,
): GradeOk {
  const state = parseJsonSafe<ContourState>(raw);
  if (!state?.probe) return ok(false, "Drag the probe point.");
  const task = spec.task;
  const q = resolveQuadratic(spec.fn);

  if (task.kind === "criticalPoint" || task.kind === "placeProbe" || task.kind === "lagrangeTangency") {
    return ok(
      near(state.probe, task.target, task.tolerance ?? 0.4),
      `Probe should be near (${task.target.x}, ${task.target.y}).`,
    );
  }

  if (task.kind === "dirDerivSign") {
    const g = gradientAt(q, state.probe);
    const dir = state.direction ?? { x: 1, y: 0 };
    const dmag = Math.hypot(dir.x, dir.y) || 1;
    const u = { x: dir.x / dmag, y: dir.y / dmag };
    const dd = g.x * u.x + g.y * u.y;
    if (task.sign === "zero") return ok(Math.abs(dd) < 0.25, "Directional derivative should be ~0.");
    if (task.sign === "neg") return ok(dd < -0.15, "Directional derivative should be negative.");
    return ok(dd > 0.15, "Directional derivative should be positive.");
  }

  return ok(false, "Unknown contour task.");
}

export type CurveState = { t: number };

export function gradeCurve(spec: CurveInteraction, raw: string): GradeOk {
  const state = parseJsonSafe<CurveState>(raw);
  if (state?.t == null || !Number.isFinite(state.t)) {
    return ok(false, "Scrub t along the curve.");
  }
  const tol = spec.task.tolerance ?? 0.25;
  if (spec.task.kind === "maxSpeed") {
    // Speed extrema often at ± endpoints of a symmetric interval.
    return ok(
      numClose(Math.abs(state.t), Math.abs(spec.task.t), tol),
      `|t| should be near ${Math.abs(spec.task.t)}.`,
    );
  }
  if (spec.task.kind === "atT" || spec.task.kind === "accelPerpVel") {
    return ok(
      numClose(state.t, spec.task.t, tol),
      `t should be near ${spec.task.t}.`,
    );
  }
  return ok(false, "Unknown curve task.");
}

export type Surface3dState =
  | { kind: "identify"; choice: string }
  | { kind: "probe"; uv: [number, number] }
  | { kind: "stokes"; seen: true };

export function gradeSurface3d(
  spec: Surface3dInteraction,
  raw: string,
): GradeOk {
  const state = parseJsonSafe<Surface3dState>(raw);
  if (!state) return ok(false, "Interact with the surface, then check.");
  if (spec.task.kind === "identify") {
    if (state.kind !== "identify") return ok(false, "Pick a surface name.");
    return ok(
      state.choice === spec.task.answer,
      `Expected: ${spec.task.answer}`,
    );
  }
  if (spec.task.kind === "stokesCompare") {
    // Lesson/demo intuition: acknowledging the equal readouts.
    if (state.kind === "stokes" || state.kind === "probe") {
      return ok(true, "");
    }
    return ok(false, "Orbit the surface and read the Stokes comparison.");
  }
  if (spec.task.kind === "divIntuition") {
    if (state.kind !== "probe") return ok(false, "Click the surface to place a probe.");
    const [tx, ty] = spec.task.target ?? [0, 0];
    const tol = spec.task.tolerance ?? 0.45;
    return ok(
      Math.hypot(state.uv[0] - tx, state.uv[1] - ty) <= tol,
      `Probe near the source at (${tx}, ${ty}).`,
    );
  }
  if (state.kind !== "probe") return ok(false, "Move the probe on the surface.");
  const [tx, ty] = spec.task.target;
  const tol = spec.task.tolerance ?? 0.35;
  return ok(
    Math.hypot(state.uv[0] - tx, state.uv[1] - ty) <= tol,
    `Probe should be near (${tx}, ${ty}).`,
  );
}

export type JacobianState = { a: number; b: number; c: number; d: number };

export function gradeJacobian(
  spec: import("@/types/interactions").JacobianInteraction,
  raw: string,
): GradeOk {
  const state = parseJsonSafe<JacobianState>(raw);
  if (
    !state ||
    typeof state.a !== "number" ||
    typeof state.b !== "number" ||
    typeof state.c !== "number" ||
    typeof state.d !== "number"
  ) {
    return ok(false, "Drag the column tips (images of î and ĵ) to set J.");
  }
  const det = Math.abs(state.a * state.d - state.b * state.c);
  return ok(
    numClose(det, Math.abs(spec.task.target), spec.task.tolerance ?? 0.15),
    `|J|=|ad−bc| should be ${Math.abs(spec.task.target)} (yours: ${det.toFixed(2)}).`,
  );
}

export type ChainTreeState = { selectedEdgeId: string | null };

export function gradeChainTree(
  spec: import("@/types/interactions").ChainTreeInteraction,
  raw: string,
): GradeOk {
  if (!spec.task) return ok(true, "");
  const state = parseJsonSafe<ChainTreeState>(raw);
  if (!state?.selectedEdgeId) {
    return ok(false, "Click the edge that matches the question.");
  }
  return ok(
    state.selectedEdgeId === spec.task.edgeId,
    `Select the edge “${spec.task.edgeId}”.`,
  );
}
