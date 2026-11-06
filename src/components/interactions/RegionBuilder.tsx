import { useMemo } from "react";
import type {
  BoundValue,
  RegionBounds,
  RegionInteraction,
  RegionOrder,
  RegionShade,
  Vec2,
} from "@/types/interactions";
import {
  defaultInnerChoices,
  formatBoundLabel,
  formatBoundTeX,
  hasVariableInner,
  isNumericBound,
} from "@/lib/interactions/regionBounds";
import { PlaneCanvas, WorldPath, usePlane } from "./PlaneCanvas";
import { DragHandle } from "./DragHandle";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: RegionInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
};

function curveY(
  id: "x" | "x2" | "sqrtx" | "1-x" | "2-x" | "0",
  x: number,
): number {
  if (id === "0") return 0;
  if (id === "x") return x;
  if (id === "x2") return x * x;
  if (id === "sqrtx") return Math.sqrt(Math.max(0, x));
  if (id === "1-x") return 1 - x;
  return 2 - x;
}

function sampleShade(shade: RegionShade, n = 48): Vec2[] {
  if (shade.kind === "rect") {
    return [
      { x: shade.x0, y: shade.y0 },
      { x: shade.x1, y: shade.y0 },
      { x: shade.x1, y: shade.y1 },
      { x: shade.x0, y: shade.y1 },
      { x: shade.x0, y: shade.y0 },
    ];
  }
  if (shade.kind === "polarSector") {
    const pts: Vec2[] = [];
    for (let i = 0; i <= n; i++) {
      const th = shade.theta0 + ((shade.theta1 - shade.theta0) * i) / n;
      pts.push({ x: shade.r1 * Math.cos(th), y: shade.r1 * Math.sin(th) });
    }
    for (let i = n; i >= 0; i--) {
      const th = shade.theta0 + ((shade.theta1 - shade.theta0) * i) / n;
      pts.push({ x: shade.r0 * Math.cos(th), y: shade.r0 * Math.sin(th) });
    }
    pts.push(pts[0]!);
    return pts;
  }
  const pts: Vec2[] = [];
  const yBot =
    shade.kind === "underCurve" ? (shade.yBottom ?? 0) : undefined;
  for (let i = 0; i <= n; i++) {
    const x = shade.x0 + ((shade.x1 - shade.x0) * i) / n;
    const y =
      shade.kind === "underCurve"
        ? curveY(shade.yTop, x)
        : curveY(shade.upper, x);
    pts.push({ x, y });
  }
  for (let i = n; i >= 0; i--) {
    const x = shade.x0 + ((shade.x1 - shade.x0) * i) / n;
    const y =
      shade.kind === "underCurve" ? yBot! : curveY(shade.lower, x);
    pts.push({ x, y });
  }
  pts.push(pts[0]!);
  return pts;
}

function RegionFill({ shade }: { shade: RegionShade }) {
  const pts = sampleShade(shade);
  return (
    <WorldPath
      points={pts}
      fill="var(--color-ink)"
      stroke="var(--color-ink)"
      width={1}
      opacity={0.12}
    />
  );
}

function AxisGuides({ bounds }: { bounds: RegionBounds }) {
  const { toScreen, grid } = usePlane();
  if (bounds.order === "rdθ") return null;
  if (bounds.order === "dydx") {
    const a = toScreen(bounds.outerLo, grid.min);
    const b = toScreen(bounds.outerHi, grid.min);
    return (
      <g>
        <line
          x1={a.sx}
          y1={28}
          x2={a.sx}
          y2={360 - 28}
          stroke="var(--color-brass)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <line
          x1={b.sx}
          y1={28}
          x2={b.sx}
          y2={360 - 28}
          stroke="var(--color-brass)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
      </g>
    );
  }
  const a = toScreen(grid.min, bounds.outerLo);
  const b = toScreen(grid.min, bounds.outerHi);
  return (
    <g>
      <line
        x1={28}
        y1={a.sy}
        x2={360 - 28}
        y2={a.sy}
        stroke="var(--color-brass)"
        strokeDasharray="4 3"
        strokeWidth={1}
      />
      <line
        x1={28}
        y1={b.sy}
        x2={360 - 28}
        y2={b.sy}
        stroke="var(--color-brass)"
        strokeDasharray="4 3"
        strokeWidth={1}
      />
    </g>
  );
}

function defaultBounds(spec: RegionInteraction): RegionBounds {
  return {
    order: spec.initial?.order ?? spec.solution.order,
    outerLo: spec.initial?.outerLo ?? spec.solution.outerLo,
    outerHi: spec.initial?.outerHi ?? spec.solution.outerHi,
    innerLo: spec.initial?.innerLo ?? spec.solution.innerLo,
    innerHi: spec.initial?.innerHi ?? spec.solution.innerHi,
  };
}

function parseBounds(spec: RegionInteraction, value: string): RegionBounds {
  try {
    const p = JSON.parse(value) as RegionBounds;
    if (p?.order) return p;
  } catch {
    /* */
  }
  return defaultBounds(spec);
}

const ORDERS: { id: RegionOrder; label: string }[] = [
  { id: "dydx", label: "dy dx" },
  { id: "dxdy", label: "dx dy" },
  { id: "rdθ", label: "r dr dθ" },
];

function ChipRow({
  label,
  choices,
  value,
  onPick,
  disabled,
}: {
  label: string;
  choices: BoundValue[];
  value: BoundValue;
  onPick: (b: BoundValue) => void;
  disabled?: boolean;
}) {
  // de-dupe while preserving order
  const seen = new Set<string>();
  const uniq = choices.filter((c) => {
    const k = String(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return (
    <div className="mt-2">
      <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-mist)] mb-1">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {uniq.map((c) => {
          const selected = String(c) === String(value);
          return (
            <button
              key={String(c)}
              type="button"
              disabled={disabled}
              onClick={() => onPick(c)}
              className={`px-2 py-1 rounded-sm border font-mono text-xs transition-colors active:scale-[0.98] ${
                selected
                  ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-on-accent)]"
                  : "border-[var(--color-panel-2)] text-[var(--color-mist)] hover:text-[var(--color-ink)]"
              }`}
            >
              {formatBoundLabel(c)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RegionBuilder({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const bounds = parseBounds(spec, value);
  const variable = hasVariableInner(spec.shade);
  const choices =
    spec.innerChoices ?? defaultInnerChoices(spec.shade);

  function set(partial: Partial<RegionBounds>) {
    onChange(JSON.stringify({ ...bounds, ...partial } satisfies RegionBounds));
  }

  const mirror = useMemo(() => {
    const f = spec.integrand ?? "f(x,y)";
    const lo = formatBoundTeX(bounds.innerLo);
    const hi = formatBoundTeX(bounds.innerHi);
    const a = formatBoundTeX(bounds.outerLo);
    const b = formatBoundTeX(bounds.outerHi);
    if (bounds.order === "dydx") {
      return `$\\displaystyle \\int_{${a}}^{${b}}\\!\\int_{${lo}}^{${hi}} ${f}\\,dy\\,dx$`;
    }
    if (bounds.order === "dxdy") {
      return `$\\displaystyle \\int_{${a}}^{${b}}\\!\\int_{${lo}}^{${hi}} ${f}\\,dx\\,dy$`;
    }
    return `$\\displaystyle \\int_{${a}}^{${b}}\\!\\int_{${lo}}^{${hi}} ${f}\\,r\\,dr\\,d\\theta$`;
  }, [bounds, spec.integrand]);

  const mid = (spec.grid.min + spec.grid.max) / 2;
  const numericInnerLo = isNumericBound(bounds.innerLo) ? bounds.innerLo : mid;
  const numericInnerHi = isNumericBound(bounds.innerHi) ? bounds.innerHi : mid;

  return (
    <div>
      
      <div className="mb-2 flex flex-wrap gap-1">
        {ORDERS.filter((o) =>
          spec.shade.kind === "polarSector" ? true : o.id !== "rdθ",
        ).map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => set({ order: o.id })}
            className={`px-2.5 py-1 rounded-sm border font-mono text-xs transition-colors ${
              bounds.order === o.id
                ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-on-accent)]"
                : "border-[var(--color-panel-2)] text-[var(--color-mist)] hover:text-[var(--color-ink)]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <PlaneCanvas grid={spec.grid}>
        <RegionFill shade={spec.shade} />
        <AxisGuides bounds={bounds} />
        {bounds.order === "dydx" && (
          <>
            <DragHandle
              x={bounds.outerLo}
              y={mid}
              axis="x"
              onChange={(x) => set({ outerLo: x })}
              disabled={disabled}
              label="a"
              color="var(--color-brass)"
            />
            <DragHandle
              x={bounds.outerHi}
              y={mid}
              axis="x"
              onChange={(x) => set({ outerHi: x })}
              disabled={disabled}
              label="b"
              color="var(--color-brass)"
            />
            {!variable && (
              <>
                <DragHandle
                  x={mid}
                  y={numericInnerLo}
                  axis="y"
                  onChange={(_, y) => set({ innerLo: y })}
                  disabled={disabled}
                  label="c"
                />
                <DragHandle
                  x={mid}
                  y={numericInnerHi}
                  axis="y"
                  onChange={(_, y) => set({ innerHi: y })}
                  disabled={disabled}
                  label="d"
                />
              </>
            )}
          </>
        )}
        {bounds.order === "dxdy" && (
          <>
            <DragHandle
              x={mid}
              y={bounds.outerLo}
              axis="y"
              onChange={(_, y) => set({ outerLo: y })}
              disabled={disabled}
              label="c"
              color="var(--color-brass)"
            />
            <DragHandle
              x={mid}
              y={bounds.outerHi}
              axis="y"
              onChange={(_, y) => set({ outerHi: y })}
              disabled={disabled}
              label="d"
              color="var(--color-brass)"
            />
            {!variable && (
              <>
                <DragHandle
                  x={numericInnerLo}
                  y={mid}
                  axis="x"
                  onChange={(x) => set({ innerLo: x })}
                  disabled={disabled}
                  label="a"
                />
                <DragHandle
                  x={numericInnerHi}
                  y={mid}
                  axis="x"
                  onChange={(x) => set({ innerHi: x })}
                  disabled={disabled}
                  label="b"
                />
              </>
            )}
          </>
        )}
        {bounds.order === "rdθ" &&
          spec.shade.kind === "polarSector" &&
          isNumericBound(bounds.innerHi) &&
          isNumericBound(bounds.innerLo) && (
            <>
              <DragHandle
                x={bounds.innerHi}
                y={0}
                onChange={(x) =>
                  set({ innerHi: Math.max(0.1, Math.hypot(x, 0)) })
                }
                disabled={disabled}
                label="R"
              />
              <DragHandle
                x={bounds.innerLo * Math.cos(bounds.outerHi)}
                y={bounds.innerLo * Math.sin(bounds.outerHi)}
                onChange={(x, y) => {
                  set({ outerHi: Math.atan2(y, x) });
                }}
                disabled={disabled}
                label="θ"
                snap={0.1}
              />
            </>
          )}
      </PlaneCanvas>

      <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs">
        {(
          [
            ["outerLo", bounds.outerLo],
            ["outerHi", bounds.outerHi],
          ] as const
        ).map(([key, val]) => (
          <label
            key={key}
            className="flex items-center gap-2 text-[var(--color-mist)]"
          >
            <span className="w-16">{key}</span>
            <input
              type="number"
              step={0.5}
              disabled={disabled}
              value={Number(val.toFixed(2))}
              onChange={(e) => set({ [key]: Number(e.target.value) })}
              className="w-full bg-[var(--color-paper)] border border-[var(--color-panel-2)] rounded-sm px-2 py-1 text-[var(--color-ink)]"
            />
          </label>
        ))}
        {!variable &&
          (
            [
              ["innerLo", bounds.innerLo],
              ["innerHi", bounds.innerHi],
            ] as const
          ).map(([key, val]) =>
            isNumericBound(val) ? (
              <label
                key={key}
                className="flex items-center gap-2 text-[var(--color-mist)]"
              >
                <span className="w-16">{key}</span>
                <input
                  type="number"
                  step={0.5}
                  disabled={disabled}
                  value={Number(val.toFixed(2))}
                  onChange={(e) => set({ [key]: Number(e.target.value) })}
                  className="w-full bg-[var(--color-paper)] border border-[var(--color-panel-2)] rounded-sm px-2 py-1 text-[var(--color-ink)]"
                />
              </label>
            ) : null,
          )}
      </div>

      {variable && choices.length > 0 && (
        <>
          <ChipRow
            label="Inner lower (c)"
            choices={choices}
            value={bounds.innerLo}
            onPick={(b) => set({ innerLo: b })}
            disabled={disabled}
          />
          <ChipRow
            label="Inner upper (d)"
            choices={choices}
            value={bounds.innerHi}
            onPick={(b) => set({ innerHi: b })}
            disabled={disabled}
          />
          <p className="mt-1 font-mono text-[10px] text-[var(--color-mist)]">
            Outer limits are constants; inner limits follow the curves — pick
            the matching expressions.
          </p>
        </>
      )}

      <SymbolMirror tex={mirror} />
    </div>
  );
}
