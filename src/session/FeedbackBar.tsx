import { MathText } from "@/components/MathText";
import { Button } from "@/ui";
import { motion, tweens, useReducedMotion } from "@/lib/motion";

/** Drawn checkmark — purposeful success feedback, ~250ms. */
function SuccessCheck() {
  const reduced = useReducedMotion();
  return (
    <svg
      viewBox="0 0 18 18"
      className="w-[18px] h-[18px] shrink-0"
      aria-hidden
    >
      <motion.path
        d="M3 9.5 L7.5 14 L15 4.5"
        fill="none"
        stroke="var(--success)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        initial={reduced ? false : { strokeDashoffset: 1 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
      />
    </svg>
  );
}

export function FeedbackBar({
  correct,
  feedback,
  xpEarned,
  onContinue,
  onDiscuss,
}: {
  correct: boolean;
  feedback: string;
  xpEarned: number;
  onContinue: () => void;
  onDiscuss?: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      layoutId={reduced ? undefined : "session-action"}
      className={`fixed inset-x-0 bottom-0 z-50 border-t px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] ${
        correct
          ? "bg-[var(--success-weak)] border-[var(--success)]/20"
          : "bg-[var(--error-weak)] border-[var(--error)]/20"
      }`}
      initial={reduced ? false : { y: 14, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduced ? { duration: 0 } : tweens.fast}
    >
      <div className="max-w-xl mx-auto">
        <div
          aria-live="polite"
          className="flex items-center justify-between gap-3 mb-2"
        >
          <p
            className={`flex items-center gap-1.5 text-[14px] font-medium ${
              correct ? "text-[var(--success)]" : "text-[var(--error)]"
            }`}
          >
            {correct && <SuccessCheck />}
            {correct ? "Correct" : "Not quite"}
          </p>
          {correct && xpEarned > 0 && (
            <motion.span
              className="text-[13px] font-medium text-[var(--success)] tabular-nums"
              initial={reduced ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              +{xpEarned} XP
            </motion.span>
          )}
        </div>
        <div className="text-[13px] text-[var(--ink-2)] mb-3">
          <MathText text={feedback} />
        </div>
        <div className="flex gap-2">
          {onDiscuss && (
            <Button variant="ghost" className="shrink-0" onClick={onDiscuss}>
              Discuss
            </Button>
          )}
          <Button
            variant={correct ? "success" : "primary"}
            className="flex-1"
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
