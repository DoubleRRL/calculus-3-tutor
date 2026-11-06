import { MathText } from "@/components/MathText";

/** Live KaTeX mirror of interaction state. */
export function SymbolMirror({
  tex,
  className = "",
}: {
  tex: string;
  className?: string;
}) {
  return (
    <div
      className={`mt-3 rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-panel)] px-3 py-2 font-mono text-sm text-[var(--color-ink)] ${className}`}
    >
      <MathText text={tex} />
    </div>
  );
}
