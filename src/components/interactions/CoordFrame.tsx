import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import type { CoordFrameInteraction, CoordFrameSystem, Vec3 } from "@/types/interactions";
import type { CoordFrameState } from "@/lib/interactions/grade";
import {
  cartToCyl,
  cartToSph,
  cylToCart,
  sphToCart,
  vecToThree,
} from "@/lib/interactions/vec3";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: CoordFrameInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
  mode?: "task" | "showcase";
  autoplay?: "orbit" | "drift";
};

const SYSTEM_LABELS: Record<CoordFrameSystem, string> = {
  cartesian: "Cartesian",
  cylindrical: "Cylindrical",
  spherical: "Spherical",
};

function parseState(
  spec: CoordFrameInteraction,
  value: string,
): CoordFrameState {
  try {
    const p = JSON.parse(value) as CoordFrameState;
    if (p && typeof p === "object") return p;
  } catch {
    /* */
  }
  const [x, y, z] = spec.point;
  const cyl = cartToCyl(spec.point);
  const sph = cartToSph(spec.point);
  return {
    x,
    y,
    z,
    r: cyl.r,
    theta: cyl.theta,
    rho: sph.rho,
    phi: sph.phi,
  };
}

function ringPoints(
  r: number,
  z: number,
  n = 48,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    pts.push(vecToThree([r * Math.cos(th), r * Math.sin(th), z]));
  }
  return pts;
}

function arcPoints(
  r: number,
  z: number,
  theta: number,
  n = 24,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const steps = Math.max(4, Math.ceil((Math.abs(theta) / (Math.PI * 2)) * n));
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * theta;
    pts.push(vecToThree([r * Math.cos(th), r * Math.sin(th), z]));
  }
  return pts;
}

function sphereRing(
  rho: number,
  phi: number,
  n = 48,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const z = rho * Math.cos(phi);
  const r = rho * Math.sin(phi);
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    pts.push(vecToThree([r * Math.cos(th), r * Math.sin(th), z]));
  }
  return pts;
}

function meridianArc(
  rho: number,
  theta: number,
  phi: number,
  n = 24,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const p = (i / n) * phi;
    const sinP = Math.sin(p);
    pts.push(
      vecToThree([
        rho * sinP * Math.cos(theta),
        rho * sinP * Math.sin(theta),
        rho * Math.cos(p),
      ]),
    );
  }
  return pts;
}

function Scene({
  point,
  system,
  autoRotate,
}: {
  point: Vec3;
  system: CoordFrameSystem;
  autoRotate: boolean;
}) {
  const cyl = cartToCyl(point);
  const sph = cartToSph(point);
  const pt = vecToThree(point);

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 2]} intensity={0.9} />
      <Line
        points={[vecToThree([0, 0, 0]), vecToThree([2.2, 0, 0])]}
        color="#c45c4a"
        lineWidth={1.5}
      />
      <Line
        points={[vecToThree([0, 0, 0]), vecToThree([0, 2.2, 0])]}
        color="#4a7c59"
        lineWidth={1.5}
      />
      <Line
        points={[vecToThree([0, 0, 0]), vecToThree([0, 0, 2.2])]}
        color="#4a6a9c"
        lineWidth={1.5}
      />
      {system === "cylindrical" && (
        <>
          <Line
            points={ringPoints(cyl.r, cyl.z)}
            color="#b08d57"
            lineWidth={1.5}
          />
          <Line
            points={arcPoints(cyl.r, cyl.z, cyl.theta)}
            color="#8a8278"
            lineWidth={2}
          />
          <Line
            points={[
              vecToThree([0, 0, 0]),
              vecToThree([cyl.r * Math.cos(cyl.theta), cyl.r * Math.sin(cyl.theta), 0]),
              pt,
            ]}
            color="#ddd8ce"
            lineWidth={1}
          />
        </>
      )}
      {system === "spherical" && (
        <>
          <Line points={sphereRing(sph.rho, sph.phi)} color="#b08d57" lineWidth={1.5} />
          <Line
            points={meridianArc(sph.rho, sph.theta, sph.phi)}
            color="#8a8278"
            lineWidth={2}
          />
        </>
      )}
      <mesh position={pt}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#141413" />
      </mesh>
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

function fmtRad(r: number): string {
  const pi = Math.PI;
  if (Math.abs(r) < 0.05) return "0";
  const fracs: [number, string][] = [
    [pi, "\\pi"],
    [pi / 2, "\\tfrac{\\pi}{2}"],
    [pi / 4, "\\tfrac{\\pi}{4}"],
    [pi / 3, "\\tfrac{\\pi}{3}"],
    [3 * pi / 4, "\\tfrac{3\\pi}{4}"],
  ];
  for (const [val, tex] of fracs) {
    if (Math.abs(Math.abs(r) - val) < 0.08) {
      return r < 0 ? `-${tex}` : tex;
    }
  }
  return r.toFixed(2);
}

export function CoordFrame({
  spec,
  value,
  onChange,
  disabled,
  mode = "task",
  autoplay,
}: Props) {
  const state = parseState(spec, value);
  const autoRotate = mode === "showcase" || autoplay === "orbit";

  const point: Vec3 = useMemo(() => {
    if (spec.system === "cartesian") {
      return [state.x ?? spec.point[0], state.y ?? spec.point[1], state.z ?? spec.point[2]];
    }
    if (spec.system === "cylindrical") {
      return cylToCart(
        state.r ?? cartToCyl(spec.point).r,
        state.theta ?? cartToCyl(spec.point).theta,
        state.z ?? cartToCyl(spec.point).z,
      );
    }
    return sphToCart(
      state.rho ?? cartToSph(spec.point).rho,
      state.theta ?? cartToSph(spec.point).theta,
      state.phi ?? cartToSph(spec.point).phi,
    );
  }, [spec.system, spec.point, state]);

  function emit(next: CoordFrameState) {
    if (disabled) return;
    onChange(JSON.stringify(next));
  }

  function setNum(key: keyof CoordFrameState, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    emit({ ...state, [key]: n });
  }

  function setSelected(selected: CoordFrameSystem) {
    if (disabled) return;
    emit({ ...state, selected });
  }

  const cyl = cartToCyl(point);
  const sph = cartToSph(point);

  const mirror = useMemo(() => {
    const cart = `(${point[0].toFixed(2)},\\,${point[1].toFixed(2)},\\,${point[2].toFixed(2)})`;
    if (spec.system === "cylindrical") {
      return `$\\text{Cartesian }${cart}\\quad (r,\\theta,z)=(${cyl.r.toFixed(2)},\\,${fmtRad(cyl.theta)},\\,${cyl.z.toFixed(2)})$`;
    }
    if (spec.system === "spherical") {
      return `$\\text{Cartesian }${cart}\\quad (\\rho,\\theta,\\phi)=(${sph.rho.toFixed(2)},\\,${fmtRad(sph.theta)},\\,${fmtRad(sph.phi)})$`;
    }
    return `$\\text{Cartesian }${cart}$`;
  }, [spec.system, point, cyl, sph]);

  const scrubbers = (() => {
    if (spec.system === "cartesian") {
      return (
        <>
          {(
            [
              ["x", point[0]],
              ["y", point[1]],
              ["z", point[2]],
            ] as const
          ).map(([k, val]) => (
            <label key={k} className="flex items-center gap-2 font-mono text-xs">
              <span className="w-4">{k}</span>
              <input
                type="range"
                min={-3}
                max={3}
                step={0.1}
                disabled={disabled}
                value={state[k] ?? val}
                onChange={(e) => setNum(k, e.target.value)}
                className="flex-1"
              />
              <span className="w-10 text-right">{(state[k] ?? val).toFixed(1)}</span>
            </label>
          ))}
        </>
      );
    }
    if (spec.system === "cylindrical") {
      return (
        <>
          {(
            [
              ["r", 0, 3, state.r ?? cyl.r],
              ["θ", -Math.PI, Math.PI, state.theta ?? cyl.theta],
              ["z", -3, 3, state.z ?? cyl.z],
            ] as const
          ).map(([label, min, max, val]) => (
            <label key={label} className="flex items-center gap-2 font-mono text-xs">
              <span className="w-4">{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={label === "θ" ? 0.05 : 0.1}
                disabled={disabled}
                value={val}
                onChange={(e) =>
                  setNum(
                    label === "r" ? "r" : label === "θ" ? "theta" : "z",
                    e.target.value,
                  )
                }
                className="flex-1"
              />
              <span className="w-10 text-right">
                {label === "θ" ? fmtRad(val) : val.toFixed(1)}
              </span>
            </label>
          ))}
        </>
      );
    }
    return (
      <>
        {(
          [
            ["ρ", 0, 3, state.rho ?? sph.rho],
            ["θ", -Math.PI, Math.PI, state.theta ?? sph.theta],
            ["φ", 0, Math.PI, state.phi ?? sph.phi],
          ] as const
        ).map(([label, min, max, val]) => (
          <label key={label} className="flex items-center gap-2 font-mono text-xs">
            <span className="w-4">{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={0.05}
              disabled={disabled}
              value={val}
              onChange={(e) =>
                setNum(
                  label === "ρ" ? "rho" : label === "θ" ? "theta" : "phi",
                  e.target.value,
                )
              }
              className="flex-1"
            />
            <span className="w-10 text-right">
              {label === "ρ" ? val.toFixed(1) : fmtRad(val)}
            </span>
          </label>
        ))}
      </>
    );
  })();

  return (
    <div>
      <p className="mb-2 font-mono text-[10px] text-[var(--color-mist)]">
        {SYSTEM_LABELS[spec.system]} frame · scrub coordinates · orbit to see geometry
      </p>
      <div className="h-72 w-full rounded-sm border border-[var(--color-panel-2)] overflow-hidden bg-[var(--color-paper)]">
        <Suspense
          fallback={
            <p className="p-4 font-mono text-xs text-[var(--color-mist)]">
              Loading 3D…
            </p>
          }
        >
          <Canvas camera={{ position: [3.2, 2.4, 3.2], fov: 45 }}>
            <Scene point={point} system={spec.system} autoRotate={autoRotate} />
          </Canvas>
        </Suspense>
      </div>
      <div className="mt-3 flex flex-col gap-2">{scrubbers}</div>
      {spec.task.kind === "matchSystem" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {spec.task.choices.map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => setSelected(c)}
              className={`px-3 py-1.5 rounded-sm border font-mono text-xs transition ${
                state.selected === c
                  ? "border-[var(--color-ink)] bg-[var(--color-paper)]"
                  : "border-[var(--color-panel-2)] hover:border-[var(--color-mist)]"
              }`}
            >
              {SYSTEM_LABELS[c]}
            </button>
          ))}
        </div>
      )}
      <SymbolMirror tex={mirror} />
    </div>
  );
}
