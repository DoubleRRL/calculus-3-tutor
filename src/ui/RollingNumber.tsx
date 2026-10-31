/** Digit-reel number: each digit rolls in from below on change.
 *  Static under reduced motion. Width is fixed per digit (no jitter). */
import { AnimatePresence, motion, useReducedMotion } from "@/lib/motion";

export function RollingNumber({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const digits = String(value).split("");
  if (reduced) {
    return (
      <span className={`tabular-nums ${className}`} role="text">
        {value}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex tabular-nums ${className}`}
      role="text"
      aria-label={String(value)}
    >
      {digits.map((d, i) => (
        <span
          key={`${digits.length - i}-${d === "0" ? i : ""}`}
          className="relative inline-block w-[0.62em] h-[1.05em] overflow-hidden"
          aria-hidden
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={d}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ y: "0.95em", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-0.95em", opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {d}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
