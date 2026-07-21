import { useMemo } from "react";
import type { VectorInteraction, Vec2 } from "@/types/interactions";
import type { VectorState } from "@/lib/interactions/grade";
import { PlaneCanvas, WorldArrow } from "./PlaneCanvas";
import { DragHandle } from "./DragHandle";
import { SymbolMirror } from "./SymbolMirror";

type Props = {
  spec: VectorInteraction;
  value: string;
  onChange: (serialized: string) => void;
  disabled?: boolean;
};

function tipsFrom(spec: VectorInteraction, value: string): Record<string, Vec2> {
  try {
    const parsed = JSON.parse(value) as VectorState;
    if (parsed?.tips) return { ...Object.fromEntries(spec.vectors.map((v) => [v.id, v.tip])), ...parsed.tips };
  } catch {
    /* initial */
  }
  const tips: Record<string, Vec2> = {};
  for (const v of spec.vectors) tips[v.id] = { ...v.tip };
  return tips;
}

export function VectorPlayground({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const tips = tipsFrom(spec, value);
  const show = new Set(spec.show ?? ["magnitude", "dot"]);

  function setTip(id: string, x: number, y: number) {
    const next = { ...tips, [id]: { x, y } };
    onChange(JSON.stringify({ tips: next } satisfies VectorState));
  }

  const movable = spec.vectors.filter((v) => !v.fixed);
  const fixed = spec.vectors.filter((v) => v.fixed);

  const mirror = useMemo(() => {
    const parts: string[] = [];
    for (const v of spec.vectors) {
      const t = tips[v.id] ?? v.tip;
      const label = v.label ?? v.id;
      parts.push(
        `\\mathbf{${label}}=\\langle ${t.x.toFixed(1)},\\,${t.y.toFixed(1)}\\rangle`,
      );
      if (show.has("magnitude")) {
        const m = Math.hypot(t.x, t.y);
        parts.push(`\\|\\mathbf{${label}}\\|=${m.toFixed(2)}`);
      }
    }
    if (show.has("dot") && spec.vectors.length >= 2) {
      const a = tips[spec.vectors[0]!.id]!;
      const b = tips[spec.vectors[1]!.id]!;
      parts.push(`\\mathbf{u}\\cdot\\mathbf{v}=${(a.x * b.x + a.y * b.y).toFixed(2)}`);
    }
    if (show.has("cross") && spec.vectors.length >= 2) {
      const a = tips[spec.vectors[0]!.id]!;
      const b = tips[spec.vectors[1]!.id]!;
      parts.push(`(\\mathbf{u}\\times\\mathbf{v})_z=${(a.x * b.y - a.y * b.x).toFixed(2)}`);
    }
    if (show.has("projection") && spec.vectors.length >= 2) {
      const a = tips[spec.vectors[0]!.id]!;
      const b = tips[spec.vectors[1]!.id]!;
      const bb = b.x * b.x + b.y * b.y;
      if (bb > 1e-6) {
        const s = (a.x * b.x + a.y * b.y) / bb;
        parts.push(
          `\\mathrm{proj}_{\\mathbf{v}}\\mathbf{u}=\\langle ${(s * b.x).toFixed(2)},\\,${(s * b.y).toFixed(2)}\\rangle`,
        );
      }
    }
    return `$${parts.join("\\quad ")}$`;
  }, [tips, spec.vectors, show]);

  return (
    <div>
      
      <PlaneCanvas grid={spec.grid}>
        {fixed.map((v) => (
          <WorldArrow
            key={v.id}
            tip={tips[v.id] ?? v.tip}
            label={v.label ?? v.id}
            color="var(--color-brass)"
          />
        ))}
        {movable.map((v) => (
          <g key={v.id}>
            <WorldArrow
              tip={tips[v.id] ?? v.tip}
              label={v.label ?? v.id}
              color="var(--color-ink)"
            />
            <DragHandle
              x={(tips[v.id] ?? v.tip).x}
              y={(tips[v.id] ?? v.tip).y}
              onChange={(x, y) => setTip(v.id, x, y)}
              disabled={disabled}
              snap={spec.grid.step ?? 0.5}
              label={v.label ?? v.id}
            />
          </g>
        ))}
      </PlaneCanvas>
      <SymbolMirror tex={mirror} />
    </div>
  );
}
