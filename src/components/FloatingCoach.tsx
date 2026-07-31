import { MessageCircle, ChevronRight, X } from "lucide-react";
import type { CoachMessage } from "@/types/content";
import { CoachPanel } from "./CoachPanel";
import { Icon } from "@/ui";
import {
  AnimatePresence,
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

export function FloatingCoach({
  open,
  onOpenChange,
  pulse,
  enabled,
  busy,
  messages,
  onAsk,
  chips,
  caption,
  variant = "float",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Soft pulse when minimized after a wrong answer. */
  pulse?: boolean;
  enabled: boolean;
  busy: boolean;
  messages: CoachMessage[];
  onAsk: (q: string) => void;
  chips?: string[];
  caption?: string;
  /** `sheet` = bottom sheet (Discuss from feedback); `float` = side panel. */
  variant?: "float" | "sheet";
}) {
  const reduced = useReducedMotion();
  if (!enabled) return null;

  const bottom = "calc(100px + env(safe-area-inset-bottom))";

  if (variant === "sheet") {
    return (
      <div className="pointer-events-none fixed inset-0 z-[55]">
        <AnimatePresence>
          {open && (
            <>
              <motion.button
                type="button"
                aria-label="Close coach"
                className="pointer-events-auto absolute inset-0 bg-[var(--ink-1)]/25"
                onClick={() => onOpenChange(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={springOrInstant(reduced, { duration: 0.2 })}
              />
              <motion.div
                className="pointer-events-auto absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-[var(--r-card)] border border-b-0 border-[var(--line)] bg-[var(--card)] shadow-[0_-8px_24px_rgba(0,0,0,0.1)] p-4 pb-[calc(16px+env(safe-area-inset-bottom))]"
                initial={reduced ? false : { y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? undefined : { y: 32, opacity: 0 }}
                transition={springOrInstant(reduced, springs.ui)}
              >
                <div className="flex items-center justify-between gap-2 mb-2 max-w-xl mx-auto">
                  <p className="text-[13px] font-medium text-[var(--ink-1)]">
                    Discuss with coach
                  </p>
                  <button
                    type="button"
                    aria-label="Close coach"
                    onClick={() => onOpenChange(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-[var(--r-nav)] text-[var(--ink-3)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
                  >
                    <Icon icon={X} size={14} />
                  </button>
                </div>
                <div className="max-w-xl mx-auto">
                  <CoachPanel
                    enabled
                    busy={busy}
                    messages={messages}
                    onAsk={onAsk}
                    chips={chips}
                    caption={caption}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[45]">
      <AnimatePresence>
        {open && (
          <motion.div
            className="pointer-events-auto absolute right-3 w-[min(100%-1.5rem,20rem)] max-h-[55vh] overflow-y-auto rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] shadow-[0_8px_24px_rgba(0,0,0,0.1)] p-3"
            style={{ bottom }}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: 20 }}
            transition={springOrInstant(reduced, springs.ui)}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[13px] font-medium text-[var(--ink-1)]">Coach</p>
              <button
                type="button"
                aria-label="Minimize coach"
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--r-nav)] text-[var(--ink-3)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
              >
                <Icon icon={ChevronRight} size={14} />
              </button>
            </div>
            <CoachPanel
              enabled
              busy={busy}
              messages={messages}
              onAsk={onAsk}
              chips={chips}
              caption={caption}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          type="button"
          aria-label="Open coach"
          onClick={() => onOpenChange(true)}
          className={`pointer-events-auto absolute right-0 flex items-center gap-1.5 rounded-l-[var(--r-nav)] border border-r-0 border-[var(--line)] bg-[var(--card)] pl-2.5 pr-2 py-2.5 text-[12px] font-medium text-[var(--ink-1)] shadow-sm ${
            pulse ? "animate-pulse-soft ring-2 ring-[var(--accent)]/40" : ""
          }`}
          style={{ bottom }}
          initial={false}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          transition={springOrInstant(reduced, springs.snappy)}
        >
          <Icon icon={MessageCircle} size={14} />
          Coach
        </motion.button>
      )}
    </div>
  );
}
