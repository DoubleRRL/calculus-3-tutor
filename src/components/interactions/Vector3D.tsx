import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import type { Vector3dInteraction, Vec3 } from "@/types/interactions";
import type { Vector3dState } from "@/lib/interactions/grade";
import { cross, dot, mag, vecToThree } from "@/lib/interactions/vec3";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: Vector3dInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
  mode?: "task" | "showcase";
  autoplay?: "orbit" | "drift";
};

const ORIGIN: Vec3 = [0, 0, 0];
const DEFAULT_COLORS = ["#b08d57", "#2d6a4f", "#5c4d7d"];

function parseState(value: string): Vector3dState {
  try {
    const p = JSON.parse(value) as Vector3dState;
    if (p && typeof p === "object") return p;
  } catch {
    /* */
  }
  return {};
}

function AxisLine({
  dir,
  color,
  len = 2.2,
}: {
  dir: Vec3;
  color: string;
  len?: number;
}) {
  const tip = vecToThree([dir[0] * len, dir[1] * len, dir[2] * len]);
  return <Line points={[vecToThree(ORIGIN), tip]} color={color} lineWidth={1.5} />;
}

function VectorLine({ v, color }: { v: Vec3; color: string }) {
  return (
    <Line
      points={[vecToThree(ORIGIN), vecToThree(v)]}
      color={color}
      lineWidth={2.5}
    />
  );
}

function Scene({
  spec,
  vectors,
  autoRotate,
}: {
  spec: Vector3dInteraction;
  vectors: Vec3[];
  autoRotate: boolean;
}) {
  const show = new Set(spec.show ?? ["cross", "dot"]);
  const u = vectors[0];
  const v = vectors[1];
  const crossVec = u && v ? cross(u, v) : null;

  const parallelogramPts = useMemo(() => {
    if (!show.has("parallelogram") || !u || !v) return null;
    const a = u;
    const b = v;
    const sum: Vec3 = [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    return [
      vecToThree(ORIGIN),
      vecToThree(a),
      vecToThree(sum),
      vecToThree(b),
      vecToThree(ORIGIN),
    ] as [number, number, number][];
  }, [show, u, v]);

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 2]} intensity={0.9} />
      <AxisLine dir={[1, 0, 0]} color="#c45c4a" />
      <AxisLine dir={[0, 1, 0]} color="#4a7c59" />
      <AxisLine dir={[0, 0, 1]} color="#4a6a9c" />
      {spec.vectors.map((vec, i) => (
        <VectorLine
          key={vec.id}
          v={vectors[i] ?? vec.components}
          color={vec.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]!}
        />
      ))}
      {show.has("cross") && crossVec && (
        <VectorLine v={crossVec} color="#8a8278" />
      )}
      {parallelogramPts && (
        <Line points={parallelogramPts} color="#b08d57" lineWidth={1.5} />
      )}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.12}
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
      />
      <gridHelper args={[6, 12, "#8a8278", "#ddd8ce"]} position={[0, -0.01, 0]} />
    </>
  );
}

export function Vector3D({
  spec,
  value,
  onChange,
  disabled,
  mode = "task",
  autoplay,
}: Props) {
  const state = parseState(value);
  const vectors = spec.vectors.map((v) => v.components);
  const show = new Set(spec.show ?? ["cross", "dot"]);
  const autoRotate =
    spec.autoOrbit === true ||
    mode === "showcase" ||
    autoplay === "orbit";

  function setSelected(selected: string) {
    if (disabled) return;
    onChange(JSON.stringify({ selected } satisfies Vector3dState));
  }

  const u = vectors[0];
  const v = vectors[1];
  const crossVec = u && v ? cross(u, v) : null;

  const mirror = useMemo(() => {
    const parts: string[] = [];
    for (let i = 0; i < spec.vectors.length; i++) {
      const vec = spec.vectors[i]!;
      const c = vectors[i]!;
      const label = vec.label ?? vec.id;
      parts.push(
        `\\mathbf{${label}}=\\langle ${c[0].toFixed(2)},\\,${c[1].toFixed(2)},\\,${c[2].toFixed(2)}\\rangle`,
      );
      parts.push(`\\|\\mathbf{${label}}\\|=${mag(c).toFixed(2)}`);
    }
    if (show.has("dot") && u && v) {
      parts.push(`\\mathbf{u}\\cdot\\mathbf{v}=${dot(u, v).toFixed(2)}`);
    }
    if (show.has("cross") && crossVec) {
      parts.push(
        `\\mathbf{u}\\times\\mathbf{v}=\\langle ${crossVec[0].toFixed(2)},\\,${crossVec[1].toFixed(2)},\\,${crossVec[2].toFixed(2)}\\rangle`,
      );
      parts.push(`\\|\\mathbf{u}\\times\\mathbf{v}\\|=${mag(crossVec).toFixed(2)}`);
    }
    if (spec.task.kind === "identify" && state.selected) {
      parts.push(`\\text{selected: ${state.selected}}`);
    }
    return parts.length ? `$${parts.join("\\quad ")}$` : "$\\text{orbit · read components}$";
  }, [spec.vectors, spec.task, vectors, show, u, v, crossVec, state.selected]);

  return (
    <div>
      <div className="h-72 w-full rounded-sm border border-[var(--color-panel-2)] overflow-hidden bg-[var(--color-paper)]">
        <Suspense
          fallback={
            <p className="p-4 font-mono text-xs text-[var(--color-mist)]">
              Loading 3D…
            </p>
          }
        >
          <Canvas camera={{ position: [3.2, 2.4, 3.2], fov: 45 }}>
            <Scene spec={spec} vectors={vectors} autoRotate={autoRotate} />
          </Canvas>
        </Suspense>
      </div>
      {spec.task.kind === "identify" && (
        <div className="mt-3 flex flex-col gap-2">
          {spec.task.choices.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => setSelected(c)}
              className={`text-left px-3 py-2 rounded-sm border font-mono text-sm transition ${
                state.selected === c
                  ? "border-[var(--color-ink)] bg-[var(--color-paper)]"
                  : "border-[var(--color-panel-2)] hover:border-[var(--color-mist)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}
      <SymbolMirror tex={mirror} />
    </div>
  );
}
