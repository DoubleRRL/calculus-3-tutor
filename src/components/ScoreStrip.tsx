import type { ReadinessSnapshot } from "@/types/content";

export function ScoreStrip({
  snap,
  milestone,
  streak,
  goalMet,
}: {
  snap: ReadinessSnapshot;
  milestone?: string;
  streak?: number;
  goalMet?: boolean;
}) {
  const cells = [
    {
      label: "Mastery",
      value: `${snap.masteryPct}%`,
      sub: `${snap.masteredSkills}/${snap.totalSkills}`,
    },
    {
      label: "Retention",
      value: `${snap.retentionPct}%`,
      sub: `${snap.dueReviews} due`,
    },
    {
      label: "Exam ready",
      value: `${snap.examReadiness}%`,
      sub: streak != null ? `${streak} day streak` : "rolling",
    },
  ];
  return (
    <div className="mb-6">
      <div className="grid grid-cols-3 gap-4 mb-3">
        {cells.map((c) => (
          <div key={c.label} className="border-b border-[var(--color-panel-2)] pb-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-mist)]">
              {c.label}
            </p>
            <p className="font-display text-2xl text-[var(--color-ink)] mt-1">{c.value}</p>
            <p className="font-mono text-xs text-[var(--color-brass)] mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>
      {(milestone || goalMet) && (
        <p className="font-mono text-xs text-[var(--color-brass)]">
          {goalMet ? "Daily goal met · " : ""}
          {milestone}
        </p>
      )}
    </div>
  );
}
