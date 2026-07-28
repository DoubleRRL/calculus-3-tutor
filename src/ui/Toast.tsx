import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

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

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onDone?.(), durationMs);
    return () => window.clearTimeout(t);
  }, [open, durationMs, onDone, message]);

  return (
    <AnimatePresence>
      {open && message && (
        <motion.div
          role="status"
          className="fixed inset-x-0 z-[60] flex justify-center px-4 pointer-events-none"
          style={{
            bottom: "calc(96px + env(safe-area-inset-bottom))",
          }}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: 8 }}
          transition={springOrInstant(reduced, springs.soft)}
        >
          <div className="max-w-md w-full rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] shadow-[0_8px_24px_rgba(0,0,0,0.1)] px-4 py-3 text-[13px] text-[var(--ink-1)] leading-snug pointer-events-auto">
            {message}
          </div>
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
