import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

type Variant = "primary" | "success" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className = "",
  children,
  disabled,
  type = "button",
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const base =
    "inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-medium rounded-[var(--r-pill)] disabled:opacity-40 disabled:pointer-events-none";
  const variants: Record<Variant, string> = {
    primary: "bg-[var(--accent)] text-[var(--on-accent)]",
    success: "bg-[var(--success)] text-white",
    ghost:
      "bg-transparent text-[var(--ink-1)] border border-[var(--line-2)] hover:bg-[var(--accent-weak)]",
    danger: "bg-[var(--error)] text-white",
  };
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${className}`}
      whileTap={reduced || disabled ? undefined : { scale: 0.98 }}
      transition={springOrInstant(reduced, springs.snappy)}
      {...(rest as Record<string, unknown>)}
    >
      {children}
    </motion.button>
  );
}
