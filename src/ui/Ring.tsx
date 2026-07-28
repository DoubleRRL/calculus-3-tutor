export function Ring({
  value,
  max,
  size = 72,
  stroke = 6,
  label,
  sub,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  label: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max <= 0 ? 0 : Math.min(1, value / max);
  const offset = c * (1 - pct);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 400ms cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[14px] font-medium tabular-nums text-[var(--ink-1)] leading-none">
          {label}
        </span>
        {sub && (
          <span className="text-[12px] text-[var(--ink-3)] mt-0.5">{sub}</span>
        )}
      </div>
    </div>
  );
}
