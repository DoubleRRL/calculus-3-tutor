import type { HintLadder } from "@/types/content";
import { TUTOR_MODE_ORDER, type TutorMode, type TutorState } from "@/types/tutor";
import { MODE_LABEL, ladderSource, openedModes } from "@/lib/tutorMachine";
import { MathText } from "@/components/MathText";
import { Icon } from "@/ui";
import { ChevronRight } from "lucide-react";

/**
 * The learner-visible ladder.
 *
 * Replaces a four-tap "get a nudge" button. The rung advances on its own when
 * the app detects a stall, or immediately when the learner says they are stuck.
 *
 * Text rungs show the authored hint directly, so "ask a smaller question" works
 * with no model call at all — the content already contains it.
 */
export function LadderRail({
  hints,
  tutor,
  onEscalate,
  disabled,
}: {
  hints: HintLadder;
  tutor: TutorState;
  onEscalate: () => void;
  disabled?: boolean;
}) {
  const current = tutor.mode;
  const atEnd = current === "reveal";
  const source = ladderSource(hints, current);
  const spent = openedModes(tutor);

  return (
    <div className="mt-4 space-y-2.5">
      <div className="flex items-center gap-2">
        <ol className="flex items-center gap-1" aria-label="Help level">
          {TUTOR_MODE_ORDER.map((m) => {
            const isCurrent = m === current;
            const isSpent = spent.includes(m);
            return (
              <li
                key={m}
                aria-current={isCurrent ? "step" : undefined}
                title={MODE_LABEL[m]}
                className={`h-1.5 rounded-full transition-[width,background-color] ${
                  isCurrent ? "w-6 bg-[var(--accent)]" : "w-3 bg-[var(--line-2)]"
                } ${isSpent && !isCurrent ? "opacity-60" : ""}`}
              />
            );
          })}
        </ol>
        <p className="text-[11px] text-[var(--ink-3)]">{MODE_LABEL[current]}</p>
      </div>

      {source && (
        <div className="animate-rise rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-panel)] px-3 py-2">
          {current === "reveal" && (
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)]">
              Full solution · mastery flag
            </p>
          )}
          <MathText text={source} className="text-sm text-[var(--color-ink)]" />
        </div>
      )}

      {!atEnd && (
        <button
          type="button"
          onClick={onEscalate}
          disabled={disabled}
          className="inline-flex items-center gap-1 font-mono text-sm text-[var(--color-ink)] underline underline-offset-2 hover:opacity-70 disabled:opacity-40"
        >
          {current === "talk" ? "Stuck? Get a nudge" : "Still stuck? Give me more"}
          <Icon icon={ChevronRight} size={14} />
        </button>
      )}
    </div>
  );
}

/** True when the ladder has reached the rung that costs the mastery flag. */
export function ladderRevealed(tutor: TutorState): boolean {
  return tutor.mode === "reveal";
}

export type { TutorMode };