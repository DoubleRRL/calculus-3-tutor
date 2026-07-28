import type { LucideIcon } from "lucide-react";

export function Icon({
  icon: I,
  size = 14,
  className = "",
}: {
  icon: LucideIcon;
  size?: 14 | 20;
  className?: string;
}) {
  return <I size={size} strokeWidth={1.5} className={className} aria-hidden />;
}
