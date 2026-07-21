import { useMemo, useState } from "react";
import type { ChainTreeInteraction } from "@/types/interactions";
import { MathText } from "@/components/MathText";
import { prefersReducedMotion } from "@/lib/spring";

type Props = {
  spec: ChainTreeInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
};

export type ChainTreeState = { selectedEdgeId: string | null };

function parseState(value: string): ChainTreeState {
  try {
    const p = JSON.parse(value) as ChainTreeState;
    if (p && "selectedEdgeId" in p) return p;
  } catch {
    /* */
  }
  return { selectedEdgeId: null };
}

export function ChainRuleTree({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const state = parseState(value);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const activeId = hoverId ?? state.selectedEdgeId;

  const activeEdge = useMemo(
    () => spec.edges.find((e) => e.id === activeId) ?? null,
    [spec.edges, activeId],
  );

  const activeNodeIds = useMemo(() => {
    if (!activeEdge) return new Set<string>();
    return new Set([activeEdge.from, activeEdge.to]);
  }, [activeEdge]);

  function selectEdge(id: string) {
    if (disabled) return;
    onChange(
      JSON.stringify({ selectedEdgeId: id } satisfies ChainTreeState),
    );
  }

  const W = 360;
  const H = 220;

  return (
    <div>
      <p className="mb-2 font-mono text-[10px] text-[var(--color-mist)]">
        Hover or focus an edge — the tooltip names the rule on that branch.
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-paper)]"
        role="img"
        aria-label="Chain rule dependency tree"
      >
        {spec.edges.map((e) => {
          const from = spec.nodes.find((n) => n.id === e.from)!;
          const to = spec.nodes.find((n) => n.id === e.to)!;
          const lit = activeId === e.id;
          return (
            <g key={e.id}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={lit ? "var(--color-ink)" : "var(--color-panel-2)"}
                strokeWidth={lit ? 3 : 1.5}
                opacity={activeId && !lit ? 0.35 : 1}
                style={{
                  transition: prefersReducedMotion()
                    ? undefined
                    : "stroke-width 120ms ease, opacity 120ms ease",
                }}
              />
              {/* hit target */}
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="transparent"
                strokeWidth={14}
                style={{ cursor: disabled ? "default" : "pointer" }}
                tabIndex={disabled ? -1 : 0}
                role="button"
                aria-label={`${e.label}: ${e.rule}`}
                onMouseEnter={() => setHoverId(e.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(e.id)}
                onBlur={() => setHoverId(null)}
                onClick={() => selectEdge(e.id)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    selectEdge(e.id);
                  }
                }}
              />
              <text
                x={(from.x + to.x) / 2}
                y={(from.y + to.y) / 2 - 8}
                textAnchor="middle"
                className="fill-[var(--color-brass)] pointer-events-none"
                style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                opacity={activeId && !lit ? 0.4 : 1}
              >
                {e.label}
              </text>
            </g>
          );
        })}
        {spec.nodes.map((n) => {
          const strong = activeNodeIds.has(n.id);
          return (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r={strong ? 22 : 18}
                fill={strong ? "var(--color-ink)" : "var(--color-panel)"}
                stroke="var(--color-ink)"
                strokeWidth={1.5}
                opacity={activeId && !strong ? 0.4 : 1}
                style={{
                  transition: prefersReducedMotion()
                    ? undefined
                    : "r 120ms ease, opacity 120ms ease",
                }}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className={
                  strong
                    ? "fill-[var(--color-on-accent)]"
                    : "fill-[var(--color-ink)]"
                }
                style={{ fontSize: 13, fontFamily: "var(--font-mono)" }}
                opacity={activeId && !strong ? 0.4 : 1}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        className={`mt-3 min-h-[3.5rem] rounded-sm border px-3 py-2 text-sm transition-opacity ${
          activeEdge
            ? "border-[var(--color-ink)] bg-[var(--color-panel)] text-[var(--color-ink)]"
            : "border-[var(--color-panel-2)] bg-[var(--color-panel)] text-[var(--color-mist)]"
        }`}
      >
        {activeEdge ? (
          <>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)] mb-1">
              {activeEdge.rule}
            </p>
            <MathText text={activeEdge.tip} />
          </>
        ) : (
          <p className="font-mono text-xs">
            Hover an edge to see which rule fires on that branch.
          </p>
        )}
      </div>
    </div>
  );
}

/** Default z=f(x,y), x(t), y(t) tree for lessons. */
export const CHAIN_PRESET_Z_XY_T: Pick<
  ChainTreeInteraction,
  "nodes" | "edges" | "preset"
> = {
  preset: "z_xy_t",
  nodes: [
    { id: "z", label: "z", x: 180, y: 36 },
    { id: "x", label: "x", x: 100, y: 110 },
    { id: "y", label: "y", x: 260, y: 110 },
    { id: "t", label: "t", x: 180, y: 184 },
  ],
  edges: [
    {
      id: "z_x",
      from: "z",
      to: "x",
      label: "∂z/∂x",
      rule: "partial",
      tip: "Hold $y$ fixed; differentiate $z$ wrt $x$. Contributes $f_x$ in $\\frac{dz}{dt}$.",
    },
    {
      id: "z_y",
      from: "z",
      to: "y",
      label: "∂z/∂y",
      rule: "partial",
      tip: "Hold $x$ fixed; differentiate $z$ wrt $y$. Contributes $f_y$ in $\\frac{dz}{dt}$.",
    },
    {
      id: "x_t",
      from: "x",
      to: "t",
      label: "dx/dt",
      rule: "chain",
      tip: "Chain: multiply the upstream partial by $\\frac{dx}{dt}$.",
    },
    {
      id: "y_t",
      from: "y",
      to: "t",
      label: "dy/dt",
      rule: "chain",
      tip: "Chain: multiply the upstream partial by $\\frac{dy}{dt}$.",
    },
  ],
};
