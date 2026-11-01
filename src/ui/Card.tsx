import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
  id,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`bg-[var(--card)] border border-[var(--line)] rounded-[var(--r-card)] ${
        padded ? "p-4" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
