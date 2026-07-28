import type { ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-[var(--ink-1)]/25"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={springOrInstant(reduced, { duration: 0.2 })}
          />
          <motion.div
            className="relative w-full md:max-w-md max-h-[80vh] overflow-y-auto bg-[var(--card)] rounded-t-[var(--r-card)] md:rounded-[var(--r-card)] border border-[var(--line)] shadow-[0_8px_24px_rgba(0,0,0,0.08)] p-4"
            initial={
              reduced
                ? false
                : { opacity: 0, y: 28, scale: 0.98 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              reduced
                ? undefined
                : { opacity: 0, y: 20, scale: 0.98 }
            }
            transition={springOrInstant(reduced, springs.ui)}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              {title ? (
                <h3 className="text-[14px] font-medium text-[var(--ink-1)]">
                  {title}
                </h3>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink-1)]"
              >
                Close
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
