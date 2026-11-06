import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { GridRange } from "@/types/interactions";

export type PlaneTransform = {
  toScreen: (x: number, y: number) => { sx: number; sy: number };
  toWorld: (sx: number, sy: number) => { x: number; y: number };
  width: number;
  height: number;
  pad: number;
  grid: GridRange;
};

const PlaneCtx = createContext<PlaneTransform | null>(null);

export function usePlane(): PlaneTransform {
  const ctx = useContext(PlaneCtx);
  if (!ctx) throw new Error("usePlane must be inside PlaneCanvas");
  return ctx;
}

type Props = {
  grid: GridRange;
  width?: number;
  height?: number;
  pad?: number;
  children?: ReactNode;
  className?: string;
};

export function PlaneCanvas({
  grid,
  width = 360,
  height = 360,
  pad = 28,
  children,
  className = "",
}: Props) {
  const transform = useMemo<PlaneTransform>(() => {
    const span = grid.max - grid.min || 1;
    const innerW = width - 2 * pad;
    const innerH = height - 2 * pad;
    return {
      width,
      height,
      pad,
      grid,
      toScreen: (x, y) => ({
        sx: pad + ((x - grid.min) / span) * innerW,
        sy: pad + ((grid.max - y) / span) * innerH,
      }),
      toWorld: (sx, sy) => ({
        x: grid.min + ((sx - pad) / innerW) * span,
        y: grid.max - ((sy - pad) / innerH) * span,
      }),
    };
  }, [grid, width, height, pad]);

  const step = grid.step ?? 1;
  const ticks: number[] = [];
  for (let t = Math.ceil(grid.min / step) * step; t <= grid.max + 1e-9; t += step) {
    ticks.push(Number(t.toFixed(6)));
  }

  return (
    <PlaneCtx.Provider value={transform}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className={`max-w-full touch-none select-none rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-paper)] ${className}`}
        style={{ aspectRatio: `${width} / ${height}` }}
        role="img"
      >
        {/* grid */}
        {ticks.map((t) => {
          const v = transform.toScreen(t, grid.min);
          const h = transform.toScreen(grid.min, t);
          const axis = Math.abs(t) < 1e-9;
          return (
            <g key={t}>
              <line
                x1={v.sx}
                y1={pad}
                x2={v.sx}
                y2={height - pad}
                stroke="var(--color-panel-2)"
                strokeWidth={axis ? 1.5 : 0.75}
                opacity={axis ? 1 : 0.7}
              />
              <line
                x1={pad}
                y1={h.sy}
                x2={width - pad}
                y2={h.sy}
                stroke="var(--color-panel-2)"
                strokeWidth={axis ? 1.5 : 0.75}
                opacity={axis ? 1 : 0.7}
              />
              {Math.abs(t) > 1e-9 && (
                <>
                  <text
                    x={v.sx}
                    y={height - pad + 14}
                    textAnchor="middle"
                    className="fill-[var(--color-mist)]"
                    style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  >
                    {t}
                  </text>
                  <text
                    x={pad - 8}
                    y={h.sy + 3}
                    textAnchor="end"
                    className="fill-[var(--color-mist)]"
                    style={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
                  >
                    {t}
                  </text>
                </>
              )}
            </g>
          );
        })}
        {children}
      </svg>
    </PlaneCtx.Provider>
  );
}

/** SVG arrow from origin (or from) to tip in world coords. */
export function WorldArrow({
  tip,
  from = { x: 0, y: 0 },
  color = "var(--color-ink)",
  width = 2,
  label,
}: {
  tip: { x: number; y: number };
  from?: { x: number; y: number };
  color?: string;
  width?: number;
  label?: string;
}) {
  const { toScreen } = usePlane();
  const a = toScreen(from.x, from.y);
  const b = toScreen(tip.x, tip.y);
  const dx = b.sx - a.sx;
  const dy = b.sy - a.sy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const ah = 8;
  const aw = 5;
  const p1x = b.sx - ux * ah - uy * aw;
  const p1y = b.sy - uy * ah + ux * aw;
  const p2x = b.sx - ux * ah + uy * aw;
  const p2y = b.sy - uy * ah - ux * aw;
  return (
    <g>
      <line
        x1={a.sx}
        y1={a.sy}
        x2={b.sx - ux * 4}
        y2={b.sy - uy * 4}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
      <polygon
        points={`${b.sx},${b.sy} ${p1x},${p1y} ${p2x},${p2y}`}
        fill={color}
      />
      {label && (
        <text
          x={b.sx + ux * 10}
          y={b.sy + uy * 10}
          className="fill-[var(--color-ink)]"
          style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function WorldPath({
  points,
  stroke = "var(--color-ink)",
  fill = "none",
  width = 1.5,
  opacity = 1,
}: {
  points: { x: number; y: number }[];
  stroke?: string;
  fill?: string;
  width?: number;
  opacity?: number;
}) {
  const { toScreen } = usePlane();
  if (points.length < 2) return null;
  const d = points
    .map((p, i) => {
      const s = toScreen(p.x, p.y);
      return `${i === 0 ? "M" : "L"}${s.sx},${s.sy}`;
    })
    .join(" ");
  return (
    <path
      d={d}
      stroke={stroke}
      fill={fill}
      strokeWidth={width}
      opacity={opacity}
      strokeLinejoin="round"
    />
  );
}

export function usePlanePointer() {
  const plane = usePlane();
  const clientToWorld = useCallback(
    (svg: SVGSVGElement, clientX: number, clientY: number) => {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const sp = pt.matrixTransform(ctm.inverse());
      return plane.toWorld(sp.x, sp.y);
    },
    [plane],
  );
  return { ...plane, clientToWorld };
}
