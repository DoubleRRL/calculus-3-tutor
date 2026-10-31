import { useNavigate } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { BADGE_DEFS, checkpointNudge } from "@/lib/store";
import { Button, Card } from "@/ui";

export function ExamPage() {
  const { readiness, state } = useApp();
  const nav = useNavigate();
  const recent = state.examScores.slice(-3);
  const recentCheckpoints = state.checkpointScores.slice(-3);
  const earned = new Set(state.badges);
  const nudge = checkpointNudge(state);

  return (
    <div className="animate-rise space-y-4 max-w-xl">
      <div>
        <h1 className="text-[24px] font-medium text-[var(--ink-1)]">Exams</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          Checkpoints keep learned topics fresh; the sim measures full-course
          readiness.
        </p>
      </div>

      <Card className="space-y-3">
        <div>
          <p className="text-[14px] font-medium text-[var(--ink-1)]">
            Checkpoint
          </p>
          <p className="text-[13px] text-[var(--ink-2)] mt-1">
            10 mixed items · only topics you've seen · no hints, no coach
          </p>
          <p className="text-[13px] text-[var(--ink-3)] mt-1 tabular-nums">
            Covers {nudge.coveredSkills} topic{nudge.coveredSkills === 1 ? "" : "s"}
            {nudge.dueCount > 0 && ` · ${nudge.dueCount} due for recall`}
          </p>
          {recentCheckpoints.length > 0 && (
            <p className="text-[13px] text-[var(--ink-3)] mt-1 tabular-nums">
              Recent: {recentCheckpoints.map((n) => `${n}%`).join(" · ")}
            </p>
          )}
        </div>
        <Button
          className="w-full"
          variant={nudge.show ? undefined : "ghost"}
          onClick={() => nav("/s/checkpoint")}
        >
          {nudge.show ? "Checkpoint ready — start" : "Start checkpoint"}
        </Button>
      </Card>

      <Card>
        <p className="text-[14px] font-medium text-[var(--ink-1)]">
          Full exam sim
        </p>
        <p className="text-[13px] text-[var(--ink-2)] mt-1">
          20 items across all units · Readiness {readiness.examReadiness}%
        </p>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          Mastery {readiness.masteryPct}% · Retention{" "}
          {readiness.retentionPct}%
        </p>
        {recent.length > 0 && (
          <p className="text-[13px] text-[var(--ink-3)] mt-2 tabular-nums">
            Recent: {recent.map((n) => `${n}%`).join(" · ")}
          </p>
        )}
        <Button
          className="w-full mt-3"
          variant="ghost"
          onClick={() => nav("/s/exam")}
        >
          Start exam sim
        </Button>
      </Card>

      <Card>
        <p className="text-[12px] text-[var(--ink-3)] mb-2">Milestones</p>
        <ul className="space-y-1.5">
          {BADGE_DEFS.map((b) => {
            const on = earned.has(b.id);
            return (
              <li
                key={b.id}
                className={`text-[13px] ${
                  on ? "text-[var(--ink-1)]" : "text-[var(--ink-3)]"
                }`}
              >
                {on ? "●" : "○"} {b.label}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
