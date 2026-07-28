import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { skillById } from "@/content";
import { lessonForSkill } from "@/content/lessons";
import { MathText } from "@/components/MathText";
import { Button, Card } from "@/ui";

export function SkillSheetPage() {
  const { skillId = "" } = useParams();
  const { state } = useApp();
  const nav = useNavigate();
  const skill = skillById(skillId);
  const lesson = lessonForSkill(skillId);
  const prog = state.skills[skillId];

  if (!skill) return <Navigate to="/path" replace />;

  if (!prog?.unlocked) {
    const missing = skill.prerequisites.filter((p) => !state.skills[p]?.mastered);
    return (
      <div className="animate-rise space-y-4">
        <Link to="/path" className="text-[13px] text-[var(--ink-3)]">
          ← Path
        </Link>
        <h1 className="text-[24px] font-medium">{skill.title}</h1>
        <p className="text-[14px] text-[var(--ink-2)]">
          Locked. Master{" "}
          {missing.map((id) => skillById(id)?.title ?? id).join(", ")} first.
        </p>
      </div>
    );
  }

  const crowns = state.crowns[skillId] ?? 0;
  const grokked = state.grokked.includes(skillId);
  const dueAt = state.reviews[skillId]?.dueAt;
  const reviewLabel =
    dueAt == null
      ? null
      : dueAt <= Date.now()
        ? "Review due now"
        : `Next review in ${Math.max(1, Math.round((dueAt - Date.now()) / 86_400_000))}d`;

  return (
    <div className="animate-rise space-y-4 max-w-xl">
      <Link to="/path" className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink-1)]">
        ← Path
      </Link>
      <div>
        <h1 className="text-[24px] font-medium text-[var(--ink-1)]">{skill.title}</h1>
        <p className="text-[13px] text-[var(--ink-2)] mt-1">{skill.objective}</p>
        <div className="flex gap-1 mt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i < crowns ? "bg-[var(--crown)]" : "bg-[var(--line)]"
              }`}
            />
          ))}
        </div>
        {reviewLabel && (
          <p className="text-[12px] text-[var(--ink-3)] mt-2">{reviewLabel}</p>
        )}
      </div>

      {lesson && (
        <Card>
          <p className="text-[12px] text-[var(--ink-3)] mb-2">ELI5</p>
          <div className="text-[14px] text-[var(--ink-1)] leading-relaxed">
            <MathText text={lesson.eli5} />
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        <Button
          className="w-full"
          onClick={() =>
            nav(grokked ? `/s/skill/${skillId}` : `/s/skill/${skillId}`)
          }
        >
          {grokked ? "Practice" : "Learn"}
        </Button>
        {grokked && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => nav(`/s/skill/${skillId}?teach=1`)}
          >
            Recap teach deck
          </Button>
        )}
      </div>
    </div>
  );
}
