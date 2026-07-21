import type { ProblemItem } from "@/types/content";
import type { InteractionSpec } from "@/types/interactions";
import type { GradeResult } from "@/lib/grading";
import {
  gradeBuckets,
  gradeChainTree,
  gradeContour,
  gradeCurve,
  gradeJacobian,
  gradeRegion,
  gradeSurface3d,
  gradeVector,
} from "./grade";

export function gradeInteraction(
  spec: InteractionSpec,
  raw: string,
): GradeResult {
  switch (spec.type) {
    case "vector":
      return gradeVector(spec, raw);
    case "region":
      return gradeRegion(spec, raw);
    case "buckets":
      return gradeBuckets(spec, raw);
    case "contour":
      return gradeContour(spec, raw);
    case "curve":
      return gradeCurve(spec, raw);
    case "surface3d":
      return gradeSurface3d(spec, raw);
    case "jacobian":
      return gradeJacobian(spec, raw);
    case "chainTree":
      return gradeChainTree(spec, raw);
    default:
      return { correct: false, feedback: "Unknown interaction type." };
  }
}

/** Human-readable snapshot for the coach prompt. */
export function describeInteractionState(
  spec: InteractionSpec,
  raw: string,
): string {
  if (!raw.trim()) return "(no interaction state yet)";
  try {
    const state = JSON.parse(raw);
    switch (spec.type) {
      case "vector": {
        const tips = state.tips ?? {};
        return Object.entries(tips)
          .map(([id, t]) => {
            const v = t as { x: number; y: number };
            return `${id}=⟨${v.x.toFixed(2)}, ${v.y.toFixed(2)}⟩`;
          })
          .join("; ");
      }
      case "region":
        return `order=${state.order}, outer=[${state.outerLo},${state.outerHi}], inner=[${state.innerLo},${state.innerHi}]`;
      case "buckets":
        return `assignment=${JSON.stringify(state.assignment ?? {})}`;
      case "contour":
        return `probe=(${state.probe?.x?.toFixed?.(2)}, ${state.probe?.y?.toFixed?.(2)}), dir=(${state.direction?.x?.toFixed?.(2) ?? "?"}, ${state.direction?.y?.toFixed?.(2) ?? "?"})`;
      case "curve":
        return `t=${Number(state.t).toFixed(3)}`;
      case "surface3d":
        return JSON.stringify(state);
      case "jacobian":
        return `J=[[${state.a},${state.b}],[${state.c},${state.d}]], |J|=${Math.abs(state.a * state.d - state.b * state.c)}`;
      case "chainTree":
        return `selectedEdge=${state.selectedEdgeId ?? "none"}`;
      default:
        return raw.slice(0, 200);
    }
  } catch {
    return raw.slice(0, 200);
  }
}

export function itemHasInteraction(
  item: ProblemItem,
): item is ProblemItem & { interaction: InteractionSpec } {
  return item.answerType === "interactive" && Boolean(item.interaction);
}
