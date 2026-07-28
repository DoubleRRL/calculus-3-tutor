import { useEffect, useMemo, useRef } from "react";
import type { Field2dInteraction, Vec2 } from "@/types/interactions";
import type { Field2dState } from "@/lib/interactions/grade";
import {
  DEFAULT_PATH_A,
  DEFAULT_PATH_B,
  buildPath,
  curlZAt,
  divAt,
  fieldAt,
  fieldLabel,
  workAlong,
} from "@/lib/interactions/fieldMath";
import { PlaneCanvas, WorldArrow, WorldPath, usePlane } from "./PlaneCanvas";
import { DragHandle } from "./DragHandle";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: Field2dInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
  mode?: "task" | "showcase";
  autoplay?: "scrubT" | "orbit" | "sweepPlane" | "drift";
};

function resolveMode(spec: Field2dInteraction): NonNullable<Field2dInteraction["mode"]> {
  if (spec.mode) return spec.mode;
  if (spec.task.kind === "twoPath") return "twoPath";
  if (spec.task.kind === "probeCurlDiv") return "curlProbe";
  return "arrows";
}

function parseState(value: string): Field2dState {
  try {
    const p = JSON.parse(value) as Field2dState;
    if (p && typeof p === "object") return p;
  } catch {
    /* initial */
  }
  return { probe: { x: 1, y: 0.5 } };
}

function FieldArrows({
  preset,
  grid,
}: {
  preset: Field2dInteraction["field"];
  grid: Field2dInteraction["grid"];
}) {
  const step = grid.step ?? 1;
  const samples: { at: Vec2; F: Vec2 }[] = [];
  for (let x = grid.min; x <= grid.max + 1e-9; x += step) {
    for (let y = grid.min; y <= grid.max + 1e-9; y += step) {
      const at = { x, y };
      const F = fieldAt(preset, at);
      const mag = Math.hypot(F.x, F.y) || 1;
      const scl = (step * 0.38) / mag;
      samples.push({ at, F: { x: F.x * scl, y: F.y * scl } });
    }
  }
  return (
    <>
      {samples.map((s, i) => (
        <WorldArrow
          key={i}
          from={s.at}
          tip={{ x: s.at.x + s.F.x, y: s.at.y + s.F.y }}
          color="var(--color-mist)"
          width={1}
        />
      ))}
    </>
  );
}

function EndpointDot({ p, label }: { p: Vec2; label: string }) {
  const { toScreen } = usePlane();
  const s = toScreen(p.x, p.y);
  return (
    <g>
      <circle
        cx={s.sx}
        cy={s.sy}
        r={5}
        fill="var(--color-brass)"
        stroke="var(--color-paper)"
        strokeWidth={2}
      />
      <text
        x={s.sx + 8}
        y={s.sy - 8}
        className="fill-[var(--color-ink)]"
        style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
      >
        {label}
      </text>
    </g>
  );
}

function PathEndpoints({ a, b }: { a: Vec2; b: Vec2 }) {
  return (
    <g>
      <EndpointDot p={a} label="A" />
      <EndpointDot p={b} label="B" />
    </g>
  );
}

function ChoiceChips({
  choices,
  value,
  onPick,
  disabled,
}: {
  choices: { id: string; label: string }[];
  value?: string;
  onPick: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c.id)}
          className={`rounded-[var(--r-input)] border px-3 py-2 text-[13px] font-mono transition ${
            value === c.id
              ? "border-[var(--color-ink)] bg-[var(--color-panel)] text-[var(--ink-1)]"
              : "border-[var(--color-panel-2)] text-[var(--ink-2)] hover:border-[var(--color-ink)]"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function Field2d({
  spec,
  value,
  onChange,
  disabled,
  mode = "task",
  autoplay,
}: Props) {
  const state = parseState(value);
  const probe = state.probe ?? { x: 1, y: 0.5 };
  const widgetMode = resolveMode(spec);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const pathA = DEFAULT_PATH_A;
  const pathB = DEFAULT_PATH_B;

  const pathPts = useMemo(() => {
    if (widgetMode !== "twoPath" || spec.task.kind !== "twoPath") return null;
    const task = spec.task;
    return {
      a: buildPath(task.pathA, pathA, pathB),
      b: buildPath(task.pathB, pathA, pathB),
    };
  }, [widgetMode, spec.task, pathA, pathB]);

  const pathWorks = useMemo(() => {
    if (!pathPts) return undefined;
    return {
      a: workAlong(pathPts.a, spec.field),
      b: workAlong(pathPts.b, spec.field),
    };
  }, [pathPts, spec.field]);

  useEffect(() => {
    if (!pathWorks) return;
    const cur = parseState(value);
    if (
      cur.pathWorks?.a === pathWorks.a &&
      cur.pathWorks?.b === pathWorks.b
    ) {
      return;
    }
    onChangeRef.current(
      JSON.stringify({ ...cur, pathWorks } satisfies Field2dState),
    );
  }, [pathWorks, spec, value]);

  useEffect(() => {
    if (mode !== "showcase" || autoplay !== "drift" || disabled) return;
    if (widgetMode !== "curlProbe" && widgetMode !== "divProbe") return;
    let raf = 0;
    const t0 = performance.now();
    const R = 1.2;
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      onChangeRef.current(
        JSON.stringify({
          probe: { x: R * Math.cos(t * 0.45), y: R * Math.sin(t * 0.45) },
        } satisfies Field2dState),
      );
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, autoplay, disabled, widgetMode]);

  function commit(partial: Partial<Field2dState>) {
    onChange(JSON.stringify({ ...state, ...partial } satisfies Field2dState));
  }

  const curl = curlZAt(spec.field, probe);
  const div = divAt(spec.field, probe);
  const F = fieldAt(spec.field, probe);

  const mirror = useMemo(() => {
    const base = fieldLabel(spec.field);
    if (widgetMode === "curlProbe") {
      return `$${base}\\quad (\\nabla\\times\\mathbf{F})_z\\approx ${curl.toFixed(2)}$`;
    }
    if (widgetMode === "divProbe") {
      return `$${base}\\quad \\nabla\\cdot\\mathbf{F}\\approx ${div.toFixed(2)}$`;
    }
    if (widgetMode === "twoPath" && pathWorks) {
      return `$${base}\\quad W_A\\approx ${pathWorks.a.toFixed(2)}\\quad W_B\\approx ${pathWorks.b.toFixed(2)}$`;
    }
    return `$${base}\\quad \\mathbf{F}(${probe.x.toFixed(1)},${probe.y.toFixed(1)})=\\langle ${F.x.toFixed(2)},\\,${F.y.toFixed(2)}\\rangle$`;
  }, [spec.field, widgetMode, curl, div, pathWorks, probe, F]);

  const showProbe =
    widgetMode === "curlProbe" || widgetMode === "divProbe";

  return (
    <div>
      <PlaneCanvas grid={spec.grid}>
        <FieldArrows preset={spec.field} grid={spec.grid} />
        {widgetMode === "twoPath" && pathPts && (
          <>
            <WorldPath
              points={pathPts.a}
              stroke="var(--color-ink)"
              width={2}
            />
            <WorldPath
              points={pathPts.b}
              stroke="var(--color-brass)"
              width={2}
              opacity={0.9}
            />
            <PathEndpoints a={pathA} b={pathB} />
          </>
        )}
        {showProbe && (
          <>
            <WorldArrow
              from={probe}
              tip={{
                x: probe.x + F.x * 0.28,
                y: probe.y + F.y * 0.28,
              }}
              color="var(--color-ink)"
              width={2}
            />
            <DragHandle
              x={probe.x}
              y={probe.y}
              onChange={(x, y) => commit({ probe: { x, y } })}
              disabled={disabled || (mode === "showcase" && autoplay === "drift")}
              snap={spec.grid.step ?? 0.25}
              label="p"
            />
          </>
        )}
      </PlaneCanvas>
      <SymbolMirror tex={mirror} />
      {spec.task.kind === "probeCurlDiv" && mode === "task" && (
        <ChoiceChips
          choices={[
            { id: "curl", label: "Has curl" },
            { id: "div", label: "Has divergence" },
            { id: "neither", label: "Neither" },
          ]}
          value={state.choice}
          onPick={(choice) => commit({ choice })}
          disabled={disabled}
        />
      )}
      {spec.task.kind === "twoPath" && mode === "task" && (
        <ChoiceChips
          choices={[
            { id: "equal", label: "Equal work" },
            { id: "unequal", label: "Unequal work" },
          ]}
          value={state.choice}
          onPick={(choice) => commit({ choice })}
          disabled={disabled}
        />
      )}
    </div>
  );
}
