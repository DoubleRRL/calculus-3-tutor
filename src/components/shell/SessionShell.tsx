import { useNavigate } from "react-router-dom";
import { Flame, X } from "lucide-react";
import { ProgressBar, Icon, Pill, RollingNumber } from "@/ui";
import {
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

export function SessionShell({
  children,
  footer,
  overlay,
  segments,
  combo,
  onClose,
  title,
  skillId,
}: {
  children: React.ReactNode;
  /** Fixed bottom chrome — rendered outside animated scroll content. */
  footer?: React.ReactNode;
  /** Portals like FeedbackBar / floating coach — siblings of scroll body. */
  overlay?: React.ReactNode;
  segments: ("pending" | "teach" | "correct" | "wrong" | "current")[];
  combo: number;
  onClose?: () => void;
  title?: string;
  skillId?: string;
}) {
  const nav = useNavigate();
  const reduced = useReducedMotion();
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--bg)]">
      <header className="relative z-50 shrink-0 flex items-center gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2 bg-[var(--bg)]">
        <button
          type="button"
          aria-label="Close session"
          onClick={() => (onClose ? onClose() : nav("/"))}
          className="w-10 h-10 flex items-center justify-center rounded-[var(--r-nav)] hover:bg-[var(--accent-weak)] active:scale-[0.96]"
        >
          <Icon icon={X} size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <ProgressBar segments={segments} />
          {title && (
            <motion.p
              layoutId={
                reduced || !skillId ? undefined : `skill-${skillId}`
              }
              className="text-[12px] text-[var(--ink-3)] mt-1 truncate"
              transition={springOrInstant(reduced, springs.ui)}
            >
              {title}
            </motion.p>
          )}
        </div>
        {combo >= 3 && (
          <motion.div
            initial={reduced ? false : { scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springOrInstant(reduced, springs.snappy)}
          >
            <Pill tone="streak">
              <Icon icon={Flame} size={14} />
              <RollingNumber value={combo} />
            </Pill>
          </motion.div>
        )}
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-[calc(88px+env(safe-area-inset-bottom))]">
        <div className="max-w-xl mx-auto w-full flex flex-col justify-start py-4">
          {children}
        </div>
      </div>
      {footer}
      {overlay}
    </div>
  );
}
