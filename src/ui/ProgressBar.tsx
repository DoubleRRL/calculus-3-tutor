export function ProgressBar({
  segments,
  className = "",
}: {
  segments: ("pending" | "teach" | "correct" | "wrong" | "current")[];
  className?: string;
}) {
  return (
    <div className={`flex gap-1 items-center ${className}`}>
      {segments.map((s, i) => {
        let bg = "bg-[var(--line)]";
        let h = "h-1";
        if (s === "teach") {
          bg = "bg-[var(--ink-3)]/40";
          h = "h-0.5";
        } else if (s === "correct") bg = "bg-[var(--success)]";
        else if (s === "wrong") bg = "bg-[var(--error)]";
        else if (s === "current") bg = "bg-[var(--accent)]";
        return (
          <div
            key={i}
            className={`flex-1 ${h} rounded-full ${bg} transition-colors duration-200`}
          />
        );
      })}
    </div>
  );
}
