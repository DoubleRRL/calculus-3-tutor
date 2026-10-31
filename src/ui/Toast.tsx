import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "@/lib/motion";

export function Toast({
  message,
  open,
  onDone,
  durationMs = 4200,
}: {
  message: string;
  open: boolean;
  onDone?: () => void;
  durationMs?: number;
}) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!open || paused) return;
    const t = window.setTimeout(() => onDone?.(), durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs, onDone, message, paused]);

  return (
    <AnimatePresence>
      {open && message && (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 z-[60] flex justify-center px-4 pointer-events-none"
          style={{
            bottom: "calc(96px + env(safe-area-inset-bottom))",
          }}
          initial={reduced ? false : { opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          // Exits toward the same direction it entered (spatial consistency),
          // or follows the swipe direction when flicked away.
          exit={
            reduced
              ? undefined
              : { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.14 } }
          }
          transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <motion.div
            drag={reduced ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.6, bottom: 0.2 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -24 || info.velocity.y < -300) onDone?.();
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="max-w-md w-full rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] shadow-[0_8px_24px_rgba(0,0,0,0.1)] px-4 py-3 text-[13px] text-[var(--ink-1)] leading-snug pointer-events-auto cursor-grab active:cursor-grabbing"
          >
            {message}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Imperative-friendly one-shot toast host for simple call sites. */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  return {
    toast: (m: string) => setMsg(m),
    clear: () => setMsg(null),
    node: (
      <Toast
        message={msg ?? ""}
        open={Boolean(msg)}
        onDone={() => setMsg(null)}
      />
    ),
  };
}
