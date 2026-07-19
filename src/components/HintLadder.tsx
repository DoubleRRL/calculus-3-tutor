import type { HintLadder } from "@/types/content";
import { MathText } from "./MathText";

const LABELS = ["Nudge", "Technique", "Next step", "Full solution"] as const;

export function HintLadderPanel({
  hints,
  level,
  onEscalate,
  revealCost,
}: {
  hints: HintLadder;
  level: number;
  onEscalate: () => void;
  revealCost?: boolean;
}) {
  const texts = [hints.nudge, hints.technique, hints.nextStep, hints.fullSolution];
  return (
    <div className="mt-4 space-y-3">
      {level > 0 && (
        <div className="space-y-2">
          {texts.slice(0, level).map((t, i) => (
            <div
              key={i}
              className="rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-panel)] px-3 py-2 animate-rise"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)] mb-1">
                {LABELS[i]}
                {i === 3 && revealCost ? " · mastery flag" : ""}
              </p>
              <MathText text={t} className="text-sm text-[var(--color-ink)]" />
            </div>
          ))}
        </div>
      )}
      {level < 4 && (
        <button
          type="button"
          onClick={onEscalate}
          className="font-mono text-sm text-[var(--color-ink)] underline underline-offset-2 hover:opacity-70"
        >
          {level === 0
            ? "Stuck? Get a nudge"
            : level === 3
              ? "Reveal full solution"
              : "Need more help"}
        </button>
      )}
    </div>
  );
}
