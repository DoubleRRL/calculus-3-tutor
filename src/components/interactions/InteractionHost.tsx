import { lazy, Suspense } from "react";
import type { InteractionSpec } from "@/types/interactions";
import { VectorPlayground } from "./VectorPlayground";
import { RegionBuilder } from "./RegionBuilder";
import { SortBuckets } from "./SortBuckets";
import { ContourExplorer } from "./ContourExplorer";
import { CurveTracer } from "./CurveTracer";
import { JacobianStretch } from "./JacobianStretch";
import { ChainRuleTree } from "./ChainRuleTree";
import { Field2d } from "./Field2d";
import { Vector3D } from "./Vector3D";
import { CoordFrame } from "./CoordFrame";

const Surface3D = lazy(() =>
  import("./Surface3D").then((m) => ({ default: m.Surface3D })),
);

export type InteractionAutoplay = "scrubT" | "orbit" | "sweepPlane" | "drift";

export type InteractionHostProps = {
  spec: InteractionSpec;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
  goal?: string;
  mode?: "task" | "showcase";
  autoplay?: InteractionAutoplay;
};

export function InteractionHost({
  spec,
  value,
  onChange,
  disabled,
  goal,
  mode = "task",
  autoplay,
}: InteractionHostProps) {
  const common = { value, onChange, disabled };
  const orbitAutoplay =
    autoplay === "orbit" || autoplay === "drift" ? autoplay : undefined;

  const widget = (() => {
    switch (spec.type) {
      case "vector":
        return <VectorPlayground spec={spec} {...common} />;
      case "region":
        return <RegionBuilder spec={spec} {...common} />;
      case "buckets":
        return <SortBuckets spec={spec} {...common} />;
      case "contour":
        return <ContourExplorer spec={spec} {...common} />;
      case "curve":
        return <CurveTracer spec={spec} {...common} />;
      case "jacobian":
        return <JacobianStretch spec={spec} {...common} />;
      case "chainTree":
        return <ChainRuleTree spec={spec} {...common} />;
      case "vector3d":
        return (
          <Vector3D
            spec={spec}
            {...common}
            mode={mode}
            autoplay={orbitAutoplay}
          />
        );
      case "coordFrame":
        return (
          <CoordFrame
            spec={spec}
            {...common}
            mode={mode}
            autoplay={orbitAutoplay}
          />
        );
      case "field2d":
        return (
          <Field2d
            spec={spec}
            {...common}
            mode={mode}
            autoplay={autoplay}
          />
        );
      case "surface3d":
        return (
          <Suspense
            fallback={
              <p className="font-mono text-xs text-[var(--color-mist)] animate-pulse-soft">
                Loading 3D explorer…
              </p>
            }
          >
            <Surface3D spec={spec} {...common} />
          </Suspense>
        );
      default:
        return (
          <p className="font-mono text-xs text-[var(--color-bad)]">
            Unknown interaction type
          </p>
        );
    }
  })();

  return (
    <div>
      {goal && (
        <p className="mb-3 text-sm text-[var(--color-ink)] leading-relaxed border-l-2 border-[var(--color-ink)] pl-3">
          {goal}
        </p>
      )}
      {widget}
    </div>
  );
}
