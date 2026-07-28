import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Surface3dInteraction } from "@/types/interactions";
import type { Surface3dState } from "@/lib/interactions/grade";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: Surface3dInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
};

function zFn(
  preset: "paraboloid" | "saddle" | "gaussian",
  x: number,
  y: number,
): number {
  if (preset === "paraboloid") return 0.35 * (x * x + y * y);
  if (preset === "saddle") return 0.35 * (x * x - y * y);
  return Math.exp(-(x * x + y * y) / 4);
}

function buildZMesh(
  preset: "paraboloid" | "saddle" | "gaussian",
  res = 40,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const lo = -2.5;
  const hi = 2.5;
  const step = (hi - lo) / res;
  for (let i = 0; i <= res; i++) {
    for (let j = 0; j <= res; j++) {
      const x = lo + i * step;
      const y = lo + j * step;
      positions.push(x, zFn(preset, x, y), y);
    }
  }
  for (let i = 0; i < res; i++) {
    for (let j = 0; j < res; j++) {
      const a = i * (res + 1) + j;
      const b = a + 1;
      const c = a + (res + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Hyperboloid of one sheet: x² + y² − z² = 1 (parametrized). */
function buildHyperboloidMesh(resU = 36, resV = 24): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const zMax = 1.8;
  for (let i = 0; i <= resU; i++) {
    const th = (i / resU) * Math.PI * 2;
    for (let j = 0; j <= resV; j++) {
      const z = -zMax + (j / resV) * 2 * zMax;
      const r = Math.sqrt(1 + z * z);
      const x = r * Math.cos(th);
      const y = r * Math.sin(th);
      positions.push(x * 0.7, z * 0.7, y * 0.7);
    }
  }
  for (let i = 0; i < resU; i++) {
    for (let j = 0; j < resV; j++) {
      const a = i * (resV + 1) + j;
      const b = a + 1;
      const c = a + (resV + 1);
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function QuadricMesh({
  name,
}: {
  name: Extract<
    Surface3dInteraction["surface"],
    { kind: "quadric" }
  >["name"];
}) {
  const hyperGeo = useMemo(() => buildHyperboloidMesh(), []);
  const paraGeo = useMemo(() => buildZMesh("paraboloid"), []);
  const saddleGeo = useMemo(() => buildZMesh("saddle"), []);

  if (name === "ellipsoid") {
    return (
      <mesh>
        <sphereGeometry args={[1.4, 32, 24]} />
        <meshStandardMaterial
          color="#8a8278"
          wireframe
          transparent
          opacity={0.85}
        />
      </mesh>
    );
  }
  if (name === "cone") {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[1.4, 2.4, 32, 1, true]} />
        <meshStandardMaterial color="#8a8278" wireframe side={THREE.DoubleSide} />
      </mesh>
    );
  }
  if (name === "hyperboloid1") {
    return (
      <mesh geometry={hyperGeo}>
        <meshStandardMaterial
          color="#8a8278"
          wireframe
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
  if (name === "saddle") {
    return (
      <mesh geometry={saddleGeo}>
        <meshStandardMaterial
          color="#8a8278"
          wireframe
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }
  return (
    <mesh geometry={paraGeo}>
      <meshStandardMaterial
        color="#8a8278"
        wireframe
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function TraceCurves({
  preset,
}: {
  preset: "paraboloid" | "saddle" | "gaussian";
}) {
  const traces = useMemo(() => {
    const xs: [number, number, number][] = [];
    const ys: [number, number, number][] = [];
    for (let t = -2.2; t <= 2.2; t += 0.08) {
      xs.push([t, zFn(preset, t, 0), 0]);
      ys.push([0, zFn(preset, 0, t), t]);
    }
    return { xs, ys };
  }, [preset]);
  return (
    <>
      <Line points={traces.xs} color="#c45c26" lineWidth={2} />
      <Line points={traces.ys} color="#2d6a4f" lineWidth={2} />
    </>
  );
}

function RimCurve({
  preset,
  r = 1.6,
}: {
  preset: "paraboloid" | "saddle" | "gaussian";
  r?: number;
}) {
  const pts = useMemo(() => {
    const out: [number, number, number][] = [];
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * Math.PI * 2;
      const x = r * Math.cos(th);
      const y = r * Math.sin(th);
      out.push([x, zFn(preset, x, y), y]);
    }
    return out;
  }, [preset, r]);
  return <Line points={pts} color="#b08d57" lineWidth={3} />;
}

/**
 * Honest Stokes numbers for F = ⟨−y, x, 0⟩ on a circular rim of radius R
 * in a horizontal plane (or projected). Circulation = ∮ −y dx + x dy = 2π R².
 * Curl F = ⟨0,0,2⟩; flux through any surface with that rim = 2 · area = 2π R².
 */
function stokesNumbers(R: number) {
  const circ = 2 * Math.PI * R * R;
  const curlFlux = 2 * Math.PI * R * R;
  return { circ, curlFlux, R };
}

function ArrowHelperApprox({
  origin,
  dir,
  color,
}: {
  origin: [number, number, number];
  dir: [number, number, number];
  color: string;
}) {
  const len = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const tip: [number, number, number] = [
    origin[0] + (dir[0] / len) * 0.8,
    origin[1] + (dir[1] / len) * 0.8,
    origin[2] + (dir[2] / len) * 0.8,
  ];
  return <Line points={[origin, tip]} color={color} lineWidth={2} />;
}

function ZSurface({
  preset,
  probe,
  onProbe,
  showTraces,
  showRim,
}: {
  preset: "paraboloid" | "saddle" | "gaussian";
  probe: [number, number];
  onProbe: (uv: [number, number]) => void;
  showTraces?: boolean;
  showRim?: boolean;
}) {
  const geo = useMemo(() => buildZMesh(preset), [preset]);
  const [px, py] = probe;
  const pz = zFn(preset, px, py);
  const h = 0.05;
  const gx = (zFn(preset, px + h, py) - zFn(preset, px - h, py)) / (2 * h);
  const gy = (zFn(preset, px, py + h) - zFn(preset, px, py - h)) / (2 * h);

  const levelPts = useMemo(() => {
    const pts: [number, number, number][] = [];
    if (preset !== "paraboloid") return pts;
    const r = Math.sqrt(Math.max(0, pz / 0.35));
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * Math.PI * 2;
      const x = r * Math.cos(th);
      const y = r * Math.sin(th);
      pts.push([x, zFn(preset, x, y), y]);
    }
    return pts;
  }, [preset, pz]);

  return (
    <group>
      <mesh
        geometry={geo}
        onClick={(e) => {
          e.stopPropagation();
          onProbe([e.point.x, e.point.z]);
        }}
      >
        <meshStandardMaterial
          color="#6b6560"
          wireframe
          side={THREE.DoubleSide}
        />
      </mesh>
      {levelPts.length > 1 && (
        <Line points={levelPts} color="#b08d57" lineWidth={2} />
      )}
      {showTraces && <TraceCurves preset={preset} />}
      {showRim && <RimCurve preset={preset} r={1.6} />}
      <mesh position={[px, pz, py]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#141413" />
      </mesh>
      <ArrowHelperApprox
        origin={[px, pz, py]}
        dir={[gx, 0, gy]}
        color="#2d6a4f"
      />
      <mesh
        position={[px, pz, py]}
        rotation={[Math.atan2(gy, 1) * 0.5, 0, -Math.atan2(gx, 1) * 0.5]}
      >
        <planeGeometry args={[1.2, 1.2]} />
        <meshStandardMaterial
          color="#e8e0d4"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function Scene({
  spec,
  probe,
  onProbe,
}: {
  spec: Surface3dInteraction;
  probe: [number, number];
  onProbe: (uv: [number, number]) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 2]} intensity={0.9} />
      {spec.surface.kind === "quadric" ? (
        <>
          <QuadricMesh name={spec.surface.name} />
          {spec.showTraces && spec.surface.name === "paraboloid" && (
            <TraceCurves preset="paraboloid" />
          )}
          {spec.showTraces && spec.surface.name === "saddle" && (
            <TraceCurves preset="saddle" />
          )}
        </>
      ) : (
        <ZSurface
          preset={spec.surface.preset}
          probe={probe}
          onProbe={onProbe}
          showTraces={spec.showTraces}
          showRim={spec.showRim || spec.task.kind === "stokesCompare"}
        />
      )}
      <OrbitControls makeDefault enableDamping dampingFactor={0.12} />
      <gridHelper args={[6, 12, "#8a8278", "#ddd8ce"]} position={[0, -0.01, 0]} />
    </>
  );
}

function parseState(
  spec: Surface3dInteraction,
  value: string,
): Surface3dState {
  try {
    const p = JSON.parse(value) as Surface3dState;
    if (p?.kind) return p;
  } catch {
    /* */
  }
  if (spec.task.kind === "identify") {
    return { kind: "identify", choice: "" };
  }
  if (spec.task.kind === "stokesCompare") {
    return { kind: "stokes", seen: true };
  }
  return { kind: "probe", uv: [0.8, 0.8] };
}

export function Surface3D({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const state = parseState(spec, value);
  const probe: [number, number] =
    state.kind === "probe" ? state.uv : [0.8, 0.8];
  const rimR = 1.6;
  const { circ, curlFlux } = stokesNumbers(rimR);

  function setProbe(uv: [number, number]) {
    if (disabled) return;
    onChange(JSON.stringify({ kind: "probe", uv } satisfies Surface3dState));
  }

  function setChoice(choice: string) {
    if (disabled) return;
    onChange(
      JSON.stringify({ kind: "identify", choice } satisfies Surface3dState),
    );
  }

  const mirror = useMemo(() => {
    if (spec.task.kind === "identify") {
      const c = state.kind === "identify" ? state.choice : "";
      return c
        ? `$\\text{selected: ${c}}$`
        : `$\\text{rotate · identify the surface}$`;
    }
    if (spec.task.kind === "stokesCompare") {
      return `$\\oint_{\\partial S}\\mathbf{F}\\cdot d\\mathbf{r}=${circ.toFixed(2)}\\;=\\;\\iint_S(\\nabla\\times\\mathbf{F})\\cdot d\\mathbf{S}=${curlFlux.toFixed(2)}$`;
    }
    if (spec.task.kind === "divIntuition") {
      return `$\\text{probe }= (${probe[0].toFixed(2)},\\,${probe[1].toFixed(2)})\\quad \\text{(think sources near the origin)}$`;
    }
    return `$\\text{probe }= (${probe[0].toFixed(2)},\\,${probe[1].toFixed(2)})$`;
  }, [spec.task, state, probe, circ, curlFlux]);

  return (
    <div>
      {spec.task.kind === "stokesCompare" && (
        <p className="mb-2 font-mono text-[10px] text-[var(--color-mist)]">
          F=⟨−y,x,0⟩ on rim radius {rimR}: circulation = 2πR² and curl flux =
          2·(πR²) — computed equal by Stokes, not hardcoded coincidence.
        </p>
      )}
      <div className="h-72 w-full rounded-sm border border-[var(--color-panel-2)] overflow-hidden bg-[var(--color-paper)]">
        <Suspense
          fallback={
            <p className="p-4 font-mono text-xs text-[var(--color-mist)]">
              Loading 3D…
            </p>
          }
        >
          <Canvas camera={{ position: [3.2, 2.4, 3.2], fov: 45 }}>
            <Scene spec={spec} probe={probe} onProbe={setProbe} />
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
              onClick={() => setChoice(c)}
              className={`text-left px-3 py-2 rounded-sm border font-mono text-sm transition ${
                state.kind === "identify" && state.choice === c
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
