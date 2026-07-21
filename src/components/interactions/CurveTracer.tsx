import { useMemo } from "react";
import type { CurveInteraction, Vec2 } from "@/types/interactions";
import type { CurveState } from "@/lib/interactions/grade";
import {
  accelAt,
  evalCurve,
  sampleCurve,
  speedAt,
  velAt,
} from "@/lib/interactions/curveMath";
import { PlaneCanvas, WorldArrow, WorldPath, usePlane } from "./PlaneCanvas";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: CurveInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
};

function parseT(spec: CurveInteraction, value: string): number {
  try {
    const p = JSON.parse(value) as CurveState;
    if (typeof p?.t === "number") return p.t;
  } catch {
    /* */
  }
  return spec.initialT ?? (spec.tRange[0] + spec.tRange[1]) / 2;
}

function ProbeDot({ x, y }: { x: number; y: number }) {
  const { toScreen } = usePlane();
  const s = toScreen(x, y);
  return (
    <circle
      cx={s.sx}
      cy={s.sy}
      r={6}
      fill="var(--color-ink)"
      stroke="var(--color-paper)"
      strokeWidth={2}
    />
  );
}

function fieldAt(
  kind: NonNullable<CurveInteraction["field"]>,
  p: Vec2,
): Vec2 {
  if (kind === "rotate") return { x: -p.y, y: p.x };
  if (kind === "radial") return { x: p.x, y: p.y };
  return { x: 1, y: 0 };
}

export function CurveTracer({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const t = parseT(spec, value);
  const [t0, t1] = spec.tRange;
  const pts = useMemo(
    () => sampleCurve(spec.curve, t0, t1, 80),
    [spec.curve, t0, t1],
  );
  const p = evalCurve(spec.curve, t);
  const v = velAt(spec.curve, t);
  const a = accelAt(spec.curve, t);
  const speed = speedAt(spec.curve, t);
  const scaleV = 0.45;
  const scaleA = 0.25;

  const fieldSamples = useMemo(() => {
    if (!spec.field) return [];
    const out: { at: Vec2; F: Vec2 }[] = [];
    for (let i = 0; i <= 12; i++) {
      const ti = t0 + ((t1 - t0) * i) / 12;
      const at = evalCurve(spec.curve, ti);
      out.push({ at, F: fieldAt(spec.field, at) });
    }
    return out;
  }, [spec.field, spec.curve, t0, t1]);

  const F = spec.field ? fieldAt(spec.field, p) : null;
  const FdotV = F ? F.x * v.x + F.y * v.y : null;

  // Rough accumulation of F·r' along [t0, t]
  const workApprox = useMemo(() => {
    if (!spec.field) return null;
    let sum = 0;
    const n = 40;
    const tEnd = Math.max(t0, Math.min(t1, t));
    for (let i = 0; i < n; i++) {
      const ta = t0 + ((tEnd - t0) * i) / n;
      const tb = t0 + ((tEnd - t0) * (i + 1)) / n;
      const mid = (ta + tb) / 2;
      const pm = evalCurve(spec.curve, mid);
      const vm = velAt(spec.curve, mid);
      const Fm = fieldAt(spec.field, pm);
      sum += (Fm.x * vm.x + Fm.y * vm.y) * (tb - ta);
    }
    return sum;
  }, [spec.field, spec.curve, t0, t1, t]);

  function setT(next: number) {
    onChange(JSON.stringify({ t: next } satisfies CurveState));
  }

  const mirror = useMemo(() => {
    if (spec.field && F && FdotV != null && workApprox != null) {
      return `$t=${t.toFixed(2)}\\quad \\mathbf{F}=\\langle ${F.x.toFixed(2)},\\,${F.y.toFixed(2)}\\rangle\\quad \\mathbf{F}\\cdot\\mathbf{r}'=${FdotV.toFixed(2)}\\quad \\approx\\!\\int_{t_0}^{t}\\mathbf{F}\\cdot d\\mathbf{r}=${workApprox.toFixed(2)}$`;
    }
    return `$t=${t.toFixed(2)}\\quad \\mathbf{r}=\\langle ${p.x.toFixed(2)},\\,${p.y.toFixed(2)}\\rangle\\quad \\|\\mathbf{v}\\|=${speed.toFixed(2)}\\quad \\mathbf{v}=\\langle ${v.x.toFixed(2)},\\,${v.y.toFixed(2)}\\rangle\\quad \\mathbf{a}=\\langle ${a.x.toFixed(2)},\\,${a.y.toFixed(2)}\\rangle$`;
  }, [spec.field, t, p, v, a, speed, F, FdotV, workApprox]);

  return (
    <div>
      <PlaneCanvas grid={spec.grid}>
        <WorldPath points={pts} stroke="var(--color-ink)" width={2} />
        {fieldSamples.map((s, i) => {
          const mag = Math.hypot(s.F.x, s.F.y) || 1;
          const scl = 0.35 / mag;
          return (
            <WorldArrow
              key={i}
              from={s.at}
              tip={{
                x: s.at.x + s.F.x * scl,
                y: s.at.y + s.F.y * scl,
              }}
              color="var(--color-mist)"
              width={1}
            />
          );
        })}
        <WorldArrow
          from={p}
          tip={{ x: p.x + v.x * scaleV, y: p.y + v.y * scaleV }}
          color="var(--color-good)"
          label="v"
        />
        {!spec.field && (
          <WorldArrow
            from={p}
            tip={{ x: p.x + a.x * scaleA, y: p.y + a.y * scaleA }}
            color="var(--color-bad)"
            label="a"
          />
        )}
        {F && (
          <WorldArrow
            from={p}
            tip={{
              x: p.x + F.x * 0.25,
              y: p.y + F.y * 0.25,
            }}
            color="var(--color-brass)"
            label="F"
          />
        )}
        <ProbeDot x={p.x} y={p.y} />
      </PlaneCanvas>
      <label className="mt-3 flex flex-col gap-1 font-mono text-xs text-[var(--color-mist)]">
        <span>
          t = {t.toFixed(2)} ∈ [{t0}, {t1}]
        </span>
        <input
          type="range"
          min={t0}
          max={t1}
          step={0.01}
          value={t}
          disabled={disabled}
          onChange={(e) => setT(Number(e.target.value))}
          className="w-full accent-[var(--color-ink)]"
        />
      </label>
      <SymbolMirror tex={mirror} />
    </div>
  );
}
