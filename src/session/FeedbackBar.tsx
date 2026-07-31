import { MathText } from "@/components/MathText";
import { Button } from "@/ui";
import {
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

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
      initial={reduced ? false : { y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={springOrInstant(reduced, springs.ui)}
    >
      <div className="max-w-xl mx-auto">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p
            className={`text-[14px] font-medium ${
              correct ? "text-[var(--success)]" : "text-[var(--error)]"
            }`}
          >
            {correct ? "Correct" : "Not quite"}
          </p>
          {correct && xpEarned > 0 && (
            <motion.span
              className="text-[13px] font-medium text-[var(--success)]"
              initial={reduced ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={springOrInstant(reduced, springs.snappy)}
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
