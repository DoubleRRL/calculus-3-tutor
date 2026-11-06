import { useMemo, useState } from "react";
import type { RegionBounds, RegionInteraction } from "@/types/interactions";
import { RegionBuilder } from "@/components/interactions/RegionBuilder";
import { MathText } from "@/components/MathText";

function initialValue(spec: RegionInteraction): string {
  return JSON.stringify(spec.initial ?? spec.solution);
}

function boundNumber(value: RegionBounds["innerLo"]): number {
  return typeof value === "number" ? value : Number(value);
}

export function PolarRegionDemo({
  goal,
  spec,
}: {
  goal: string;
  spec: RegionInteraction;
}) {
  const [value, setValue] = useState(() => initialValue(spec));
  const [checked, setChecked] = useState(false);

  const correct = useMemo(() => {
    try {
      const bounds = JSON.parse(value) as RegionBounds;
      const target = spec.solution;
      const tol = 0.08;
      return (
        bounds.order === target.order &&
        Math.abs(bounds.outerLo - target.outerLo) <= tol &&
        Math.abs(bounds.outerHi - target.outerHi) <= tol &&
        Math.abs(boundNumber(bounds.innerLo) - boundNumber(target.innerLo)) <= tol &&
        Math.abs(boundNumber(bounds.innerHi) - boundNumber(target.innerHi)) <= tol
      );
    } catch {
      return false;
    }
  }, [spec.solution, value]);

  return (
    <div className="space-y-3 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-3">
      <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
        <MathText text={goal} />
      </p>
      <RegionBuilder
        spec={spec}
        value={value}
        onChange={(next) => {
          setValue(next);
          setChecked(false);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setChecked(true)}
          className="rounded-[var(--r-pill)] border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] hover:bg-[var(--accent-weak)]"
        >
          Check bounds
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(initialValue(spec));
            setChecked(false);
          }}
          className="rounded-[var(--r-pill)] border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--ink-3)] hover:bg-[var(--accent-weak)]"
        >
          Reset
        </button>
        {checked && (
          <span
            className={`text-[12px] ${
              correct ? "text-[var(--success)]" : "text-[var(--ink-2)]"
            }`}
          >
            {correct
              ? "Correct."
              : "Not yet. Set θ to 0→π/2 and r to 0→2."}
          </span>
        )}
      </div>
    </div>
  );
}
