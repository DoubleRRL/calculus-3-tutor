import { useNavigate } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { Button, Card } from "@/ui";

export function ExamPage() {
  const { readiness, state } = useApp();
  const nav = useNavigate();
  const recent = state.examScores.slice(-3);

  return (
    <div className="animate-rise space-y-4 max-w-xl">
      <div>
        <h1 className="text-[24px] font-medium text-[var(--ink-1)]">Exam sim</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          20 items · no hints · no coach
        </p>
      </div>
      <Card>
        <p className="text-[14px] font-medium text-[var(--ink-1)]">
          Readiness {readiness.examReadiness}%
        </p>
        <p className="text-[13px] text-[var(--ink-2)] mt-1">
          Mastery {readiness.masteryPct}% · Retention {readiness.retentionPct}%
        </p>
        {recent.length > 0 && (
          <p className="text-[13px] text-[var(--ink-3)] mt-2 tabular-nums">
            Recent: {recent.map((n) => `${n}%`).join(" · ")}
          </p>
        )}
      </Card>
      <Button className="w-full" onClick={() => nav("/s/exam")}>
        Start exam sim
      </Button>
    </div>
  );
}
