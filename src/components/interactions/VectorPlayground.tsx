import { useEffect, useMemo, useState } from "react";
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
    if (parsed?.tips)
      return {
        ...Object.fromEntries(spec.vectors.map((v) => [v.id, v.tip])),
        ...parsed.tips,
      };
  } catch {
    /* initial */
  }
  const tips: Record<string, Vec2> = {};
  for (const v of spec.vectors) tips[v.id] = { ...v.tip };
  return tips;
}

function formatTip(n: number): string {
  if (!Number.isFinite(n)) return "";
  const r = Math.round(n * 1000) / 1000;
  return String(r);
}

export function VectorPlayground({
  spec,
  value,
  onChange,
  disabled,
}: Props) {
  const tips = tipsFrom(spec, value);
  const show = new Set(spec.show ?? ["magnitude", "dot"]);
  const movable = spec.vectors.filter((v) => !v.fixed);
  const fixed = spec.vectors.filter((v) => v.fixed);

  const [drafts, setDrafts] = useState<Record<string, { x: string; y: string }>>(
    () =>
      Object.fromEntries(
        movable.map((v) => {
          const t = tips[v.id] ?? v.tip;
          return [v.id, { x: formatTip(t.x), y: formatTip(t.y) }];
        }),
      ),
  );

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const v of movable) {
        const t = tips[v.id] ?? v.tip;
        next[v.id] = { x: formatTip(t.x), y: formatTip(t.y) };
      }
      return next;
    });
  }, [value, spec.vectors]);

  function setTip(id: string, x: number, y: number) {
    const lo = spec.grid.min;
    const hi = spec.grid.max;
    const cx = Math.max(lo, Math.min(hi, x));
    const cy = Math.max(lo, Math.min(hi, y));
    const next = { ...tips, [id]: { x: cx, y: cy } };
    onChange(JSON.stringify({ tips: next } satisfies VectorState));
  }

  function commitDraft(id: string) {
    const d = drafts[id];
    if (!d) return;
    const x = Number(d.x);
    const y = Number(d.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      const t = tips[id]!;
      setDrafts((prev) => ({
        ...prev,
        [id]: { x: formatTip(t.x), y: formatTip(t.y) },
      }));
      return;
    }
    setTip(id, x, y);
  }

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
      parts.push(
        `\\mathbf{u}\\cdot\\mathbf{v}=${(a.x * b.x + a.y * b.y).toFixed(2)}`,
      );
    }
    if (show.has("cross") && spec.vectors.length >= 2) {
      const a = tips[spec.vectors[0]!.id]!;
      const b = tips[spec.vectors[1]!.id]!;
      parts.push(
        `(\\mathbf{u}\\times\\mathbf{v})_z=${(a.x * b.y - a.y * b.x).toFixed(2)}`,
      );
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
            />
          </g>
        ))}
      </PlaneCanvas>
      <SymbolMirror tex={mirror} />
      {movable.length > 0 && !disabled && (
        <div className="mt-2 space-y-1.5">
          {movable.map((v) => {
            const d = drafts[v.id] ?? { x: "", y: "" };
            const name = v.label ?? v.id;
            return (
              <div
                key={v.id}
                className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--ink-2)]"
              >
                <span className="min-w-[2rem] font-medium text-[var(--ink-1)]">
                  {name}
                </span>
                <label className="flex items-center gap-1">
                  <span className="text-[var(--ink-3)]">x</span>
                  <input
                    type="number"
                    step="any"
                    value={d.x}
                    disabled={disabled}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [v.id]: { ...d, x: e.target.value },
                      }))
                    }
                    onBlur={() => commitDraft(v.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitDraft(v.id);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-16 bg-[var(--card)] border border-[var(--line)] rounded-[var(--r-input)] px-1.5 py-1 text-[12px] tabular-nums outline-none focus:border-[var(--ink-1)]"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-[var(--ink-3)]">y</span>
                  <input
                    type="number"
                    step="any"
                    value={d.y}
                    disabled={disabled}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [v.id]: { ...d, y: e.target.value },
                      }))
                    }
                    onBlur={() => commitDraft(v.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitDraft(v.id);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="w-16 bg-[var(--card)] border border-[var(--line)] rounded-[var(--r-input)] px-1.5 py-1 text-[12px] tabular-nums outline-none focus:border-[var(--ink-1)]"
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
