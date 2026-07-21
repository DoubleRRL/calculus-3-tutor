import { useMemo } from "react";
import type { ContourInteraction, Vec2 } from "@/types/interactions";
import type { ContourState } from "@/lib/interactions/grade";
import { resolveQuadratic } from "@/lib/interactions/grade";
import { evalFn, gradientAt, marchingSquares } from "@/lib/interactions/contourMath";
import { PlaneCanvas, WorldArrow, WorldPath, usePlane } from "./PlaneCanvas";
import { DragHandle } from "./DragHandle";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: ContourInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
};

function parseState(spec: ContourInteraction, value: string): ContourState {
  try {
    const p = JSON.parse(value) as ContourState;
    if (p?.probe) return p;
  } catch {
    /* */
  }
  return {
    probe: spec.initialProbe ?? { x: 1, y: 1 },
    direction: { x: 1, y: 0 },
  };
}

function Contours({
  q,
  levels,
  min,
  max,
}: {
  q: ReturnType<typeof resolveQuadratic>;
  levels: number[];
  min: number;
  max: number;
}) {
  const segs = useMemo(() => {
    const all: [Vec2, Vec2][] = [];
    for (const L of levels) {
      all.push(...marchingSquares(q, min, max, L, 48));
    }
    return all;
  }, [q, levels, min, max]);

  const { toScreen } = usePlane();
  return (
    <g>
      {segs.map((s, i) => {
        const a = toScreen(s[0].x, s[0].y);
        const b = toScreen(s[1].x, s[1].y);
        return (
          <line
            key={i}
            x1={a.sx}
            y1={a.sy}
            x2={b.sx}
            y2={b.sy}
            stroke="var(--color-mist)"
            strokeWidth={1}
            opacity={0.85}
          />
        );
      })}
    </g>
  );
}

function ConstraintOverlay({
  constraint,
}: {
  constraint: NonNullable<ContourInteraction["constraint"]>;
}) {
  if (constraint.kind === "circle") {
    const pts: Vec2[] = [];
    for (let i = 0; i <= 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      pts.push({
        x: constraint.cx + constraint.r * Math.cos(th),
        y: constraint.cy + constraint.r * Math.sin(th),
      });
    }
    return <WorldPath points={pts} stroke="var(--color-brass)" width={2} />;
  }
  // ax+by=c line across grid — sample
  const pts: Vec2[] = [];
  for (let t = -6; t <= 6; t += 0.25) {
    if (Math.abs(constraint.b) > 1e-6) {
      pts.push({ x: t, y: (constraint.c - constraint.a * t) / constraint.b });
    } else if (Math.abs(constraint.a) > 1e-6) {
      pts.push({ x: constraint.c / constraint.a, y: t });
    }
  }
  return <WorldPath points={pts} stroke="var(--color-brass)" width={2} />;
}

export function ContourExplorer({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const state = parseState(spec, value);
  const q = resolveQuadratic(spec.fn);
  const levels = spec.levels ?? [-2, -1, 0, 1, 2, 3, 4];
  const g = gradientAt(q, state.probe);
  const fval = evalFn(q, state.probe);
  const dir = state.direction ?? { x: 1, y: 0 };
  const dmag = Math.hypot(dir.x, dir.y) || 1;
  const u = { x: dir.x / dmag, y: dir.y / dmag };
  const dd = g.x * u.x + g.y * u.y;
  const gTip = {
    x: state.probe.x + g.x * 0.35,
    y: state.probe.y + g.y * 0.35,
  };
  const dirTip = {
    x: state.probe.x + u.x * 1.2,
    y: state.probe.y + u.y * 1.2,
  };

  function set(partial: Partial<ContourState>) {
    onChange(JSON.stringify({ ...state, ...partial } satisfies ContourState));
  }

  const mirror = useMemo(() => {
    return `$f(${state.probe.x.toFixed(2)},${state.probe.y.toFixed(2)})=${fval.toFixed(2)}\\quad \\nabla f=\\langle ${g.x.toFixed(2)},\\,${g.y.toFixed(2)}\\rangle\\quad D_{\\mathbf{u}}f=${dd.toFixed(2)}$`;
  }, [state.probe, fval, g, dd]);

  return (
    <div>
      
      <PlaneCanvas grid={spec.grid}>
        <Contours
          q={q}
          levels={levels}
          min={spec.grid.min}
          max={spec.grid.max}
        />
        {spec.constraint && <ConstraintOverlay constraint={spec.constraint} />}
        <WorldArrow
          from={state.probe}
          tip={gTip}
          color="var(--color-good)"
          label="∇f"
        />
        <WorldArrow
          from={state.probe}
          tip={dirTip}
          color="var(--color-brass)"
          label="u"
        />
        <DragHandle
          x={state.probe.x}
          y={state.probe.y}
          onChange={(x, y) => set({ probe: { x, y } })}
          disabled={disabled}
          snap={spec.grid.step ?? 0.25}
          label="p"
        />
        <DragHandle
          x={dirTip.x}
          y={dirTip.y}
          onChange={(x, y) =>
            set({
              direction: {
                x: x - state.probe.x,
                y: y - state.probe.y,
              },
            })
          }
          disabled={disabled}
          snap={0.25}
          color="var(--color-brass)"
          label="u"
        />
      </PlaneCanvas>
      <SymbolMirror tex={mirror} />
    </div>
  );
}
