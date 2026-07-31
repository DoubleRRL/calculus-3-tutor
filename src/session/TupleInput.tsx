import { useEffect, useState } from "react";
import { MathText } from "@/components/MathText";

export function tupleArity(answer: string): number {
  return answer
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export function encodeTupleSlots(slots: string[]): string {
  return slots.map((s) => s.trim()).join(",");
}

export function decodeTupleSlots(raw: string, n: number): string[] {
  const parts = raw.split(",").map((s) => s.trim());
  return Array.from({ length: n }, (_, i) => parts[i] ?? "");
}

export function TupleInput({
  answerCanonical,
  labels,
  skeleton,
  value,
  onChange,
  locked,
  correct,
}: {
  answerCanonical: string;
  labels?: string[];
  skeleton?: string;
  value: string;
  onChange: (v: string) => void;
  locked: boolean;
  correct: boolean;
}) {
  const n = Math.max(1, tupleArity(answerCanonical));
  const slotLabels =
    labels && labels.length === n
      ? labels
      : Array.from({ length: n }, (_, i) => String(i + 1));
  const displaySkeleton =
    skeleton ?? (labels?.length === n ? `⟨${labels.join(", ")}⟩` : null);

  const [slots, setSlots] = useState(() => decodeTupleSlots(value, n));

  useEffect(() => {
    setSlots(decodeTupleSlots(value, n));
  }, [value, n]);

  function updateSlot(i: number, text: string) {
    const next = [...slots];
    next[i] = text;
    setSlots(next);
    onChange(encodeTupleSlots(next));
  }

  return (
    <div className="space-y-3">
      {displaySkeleton && (
        <p className="text-[13px] text-[var(--ink-3)]">
          Format: <MathText text={displaySkeleton} />
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        {slotLabels.map((label, i) => {
          const filled = Boolean(slots[i]?.trim());
          let border =
            "border-[var(--line)] focus:border-[var(--ink-1)]";
          if (locked) {
            if (correct) {
              border =
                "border-[var(--success)] bg-[var(--success-weak)] text-[var(--success)]";
            } else if (filled) {
              border =
                "border-[var(--error)] bg-[var(--error-weak)] text-[var(--error)]";
            } else {
              border = "border-[var(--line)] opacity-60";
            }
          }
          return (
            <label key={`${label}-${i}`} className="flex flex-col gap-1 min-w-0">
              <span className="text-[11px] uppercase tracking-wide text-[var(--ink-3)] px-0.5">
                {label}
              </span>
              <input
                value={slots[i] ?? ""}
                onChange={(e) => updateSlot(i, e.target.value)}
                disabled={locked}
                inputMode="text"
                autoComplete="off"
                aria-label={`Component ${label}`}
                className={`w-[5.5rem] sm:w-24 bg-[var(--card)] border rounded-[var(--r-input)] px-2.5 py-2.5 text-[14px] tabular-nums outline-none disabled:opacity-80 ${border}`}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
