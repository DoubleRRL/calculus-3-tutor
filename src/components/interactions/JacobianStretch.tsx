import { useMemo } from "react";
import type { JacobianInteraction } from "@/types/interactions";
import { PlaneCanvas, WorldPath } from "./PlaneCanvas";
import { DragHandle } from "./DragHandle";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: JacobianInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
};

/** Student's linear map: columns are images of î and ĵ. */
export type JacobianState = {
  a: number;
  b: number;
  c: number;
  d: number;
};

function parseState(value: string, spec: JacobianInteraction): JacobianState {
  try {
    const p = JSON.parse(value) as Partial<JacobianState>;
    if (
      typeof p?.a === "number" &&
      typeof p?.b === "number" &&
      typeof p?.c === "number" &&
      typeof p?.d === "number"
    ) {
      return { a: p.a, b: p.b, c: p.c, d: p.d };
    }
  } catch {
    /* */
  }
  return { a: spec.a, b: spec.b, c: spec.c, d: spec.d };
}

export function JacobianStretch({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const state = parseState(value, spec);
  const { a, b, c, d } = state;
  const det = a * d - b * c;
  const absJ = Math.abs(det);

  const unitUv = useMemo(
    () => [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
    ],
    [],
  );

  const xyPara = useMemo(
    () => [
      { x: 0, y: 0 },
      { x: a, y: c },
      { x: a + b, y: c + d },
      { x: b, y: d },
      { x: 0, y: 0 },
    ],
    [a, b, c, d],
  );

  function set(partial: Partial<JacobianState>) {
    onChange(JSON.stringify({ ...state, ...partial } satisfies JacobianState));
  }

  const mirror = useMemo(() => {
    const fmt = (n: number) =>
      Math.abs(n - Math.round(n)) < 1e-6 ? String(Math.round(n)) : n.toFixed(2);
    return `$J=\\begin{pmatrix}${fmt(a)}&${fmt(b)}\\\\${fmt(c)}&${fmt(d)}\\end{pmatrix}\\quad |J|=${absJ.toFixed(2)}\\quad \\mathrm{area}_{xy}=|J|\\cdot 1$`;
  }, [a, b, c, d, absJ]);

  return (
    <div>
      <p className="mb-2 font-mono text-[10px] text-[var(--color-mist)]">
        Unit square in $(u,v)$ maps to the parallelogram spanned by the column
        vectors. Drag each tip in the $xy$-plane to change $J$; $|J|$ is the area
        stretch.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)] mb-1">
            uv-plane (unit square)
          </p>
          <PlaneCanvas grid={{ min: -0.5, max: 2, step: 0.5 }} height={280}>
            <WorldPath
              points={unitUv}
              fill="var(--color-ink)"
              stroke="var(--color-ink)"
              width={1.5}
              opacity={0.15}
            />
          </PlaneCanvas>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)] mb-1">
            xy-plane (drag column tips)
          </p>
          <PlaneCanvas grid={{ min: -4, max: 4, step: 1 }} height={280}>
            <WorldPath
              points={xyPara}
              fill="var(--color-brass)"
              stroke="var(--color-ink)"
              width={1.5}
              opacity={0.2}
            />
            {/* column 1: image of î = (a,c) */}
            <WorldPath
              points={[
                { x: 0, y: 0 },
                { x: a, y: c },
              ]}
              stroke="var(--color-ink)"
              width={2}
              opacity={0.85}
            />
            {/* column 2: image of ĵ = (b,d) */}
            <WorldPath
              points={[
                { x: 0, y: 0 },
                { x: b, y: d },
              ]}
              stroke="var(--color-brass)"
              width={2}
              opacity={0.85}
            />
            <DragHandle
              x={a}
              y={c}
              onChange={(x, y) => set({ a: x, c: y })}
              disabled={disabled}
              snap={0.25}
              label="î→"
              r={10}
            />
            <DragHandle
              x={b}
              y={d}
              onChange={(x, y) => set({ b: x, d: y })}
              disabled={disabled}
              snap={0.25}
              label="ĵ→"
              color="var(--color-brass)"
              r={10}
            />
          </PlaneCanvas>
        </div>
      </div>
      <SymbolMirror tex={mirror} />
    </div>
  );
}
