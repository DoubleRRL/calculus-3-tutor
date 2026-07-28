import type { ReactNode } from "react";

export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "streak" | "crown" | "accent";
  className?: string;
}) {
  const tones = {
    neutral: "bg-[var(--accent-weak)] text-[var(--ink-2)]",
    streak: "bg-[var(--error-weak)] text-[var(--streak)]",
    crown: "bg-[var(--success-weak)] text-[var(--crown)]",
    accent: "bg-[var(--accent)] text-[var(--on-accent)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--r-pill)] text-[12px] font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
