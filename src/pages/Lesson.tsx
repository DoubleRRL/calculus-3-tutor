import { useRef, useState, useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { skillById } from "@/content";
import { lessonForSkill } from "@/content/lessons";
import { useApp } from "@/state/AppContext";
import { MathText } from "@/components/MathText";
import { InteractionHost } from "@/components/interactions/InteractionHost";
import { SkillSession } from "@/components/SessionRunner";
import { CoachPanel, LESSON_COACH_CHIPS } from "@/components/CoachPanel";
import { askCoach, warmCoach } from "@/lib/ollama";
import type { CoachMessage, ProblemItem } from "@/types/content";

function lessonStubItem(
  skillId: string,
  title: string,
  intro: string,
): ProblemItem {
  return {
    id: `lesson_${skillId}`,
    skillId,
    kind: "learn",
    prompt: title,
    answerType: "free",
    answer: "",
    hints: {
      nudge: "Re-read the ELI5 slowly.",
      technique: "Ask the coach to simplify one sentence.",
      nextStep: "Try the demo micro-goal.",
      fullSolution: intro,
    },
    misconceptionTags: [],
    rubric: "lesson intro",
    difficulty: 1,
  };
}

export function LessonPage() {
  const { skillId = "" } = useParams();
  const { state, markGroked, setFocusSkillId } = useApp();
  const skill = skillById(skillId);
  const lesson = lessonForSkill(skillId);
  const progress = state.skills[skillId];
  const alreadyGroked = state.grokked.includes(skillId);
  const [introOpen, setIntroOpen] = useState(!alreadyGroked);
  const [demoValue, setDemoValue] = useState("");
  const [coachMsgs, setCoachMsgs] = useState<CoachMessage[]>([]);
  const [coachBusy, setCoachBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setFocusSkillId(skillId || null);
    return () => setFocusSkillId(null);
  }, [skillId, setFocusSkillId]);

  if (!skill || !lesson) {
    return <Navigate to="/map" replace />;
  }

  if (!progress?.unlocked) {
    const missing = skill.prerequisites.filter(
      (p) => !state.skills[p]?.mastered,
    );
    return (
      <div className="animate-rise">
        <Link
          to="/map"
          className="font-mono text-xs text-[var(--color-mist)] underline underline-offset-2"
        >
          ← Course
        </Link>
        <h2 className="font-display text-2xl mt-4 text-[var(--color-ink)]">
          {skill.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--color-mist)]">
          Locked. Master prerequisites first
          {missing.length
            ? `: ${missing.map((id) => skillById(id)?.title ?? id).join(", ")}`
            : ""}
          .
        </p>
      </div>
    );
  }

  function acknowledge() {
    markGroked(skillId);
    setIntroOpen(false);
  }

  const introBlob = [
    lesson.eli5,
    lesson.analogy,
    lesson.demo?.goal,
    lesson.workedExample,
  ]
    .filter(Boolean)
    .join("\n\n");

  async function handleIntroCoach(q: string) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const history = coachMsgs;
    setCoachBusy(true);
    setCoachMsgs((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: "" },
    ]);
    try {
      void warmCoach(state.settings);
      const stub = lessonStubItem(skillId, skill!.title, introBlob);
      const reply = await askCoach(
        state.settings,
        {
          item: stub,
          skillTitle: skill!.title,
          skillObjective: skill!.objective,
          attempt: demoValue,
          hintLevel: 0,
          lessonIntro: introBlob,
        },
        q,
        history,
        {
          signal: ac.signal,
          onToken: (chunk) => {
            setCoachMsgs((m) => {
              const copy = [...m];
              const last = copy[copy.length - 1];
              if (last?.role === "assistant") {
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: last.content + chunk,
                };
              }
              return copy;
            });
          },
        },
      );
      setCoachMsgs((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant" && last.content.length < reply.length) {
          copy[copy.length - 1] = { role: "assistant", content: reply };
        }
        return copy;
      });
    } catch (e) {
      setCoachMsgs((m) => {
        const copy = [...m];
        const msg = `Coach unavailable: ${e instanceof Error ? e.message : String(e)}`;
        if (copy[copy.length - 1]?.role === "assistant") {
          copy[copy.length - 1] = { role: "assistant", content: msg };
        } else {
          copy.push({ role: "assistant", content: msg });
        }
        return copy;
      });
    } finally {
      setCoachBusy(false);
    }
  }

  const showPractice = alreadyGroked || !introOpen;

  return (
    <div className="animate-rise">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <Link
          to="/map"
          className="font-mono text-xs text-[var(--color-mist)] underline underline-offset-2 hover:text-[var(--color-ink)]"
        >
          ← Course
        </Link>
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)]">
          {progress.mastered ? "mastered" : progress.stage}
        </p>
      </div>

      <h2 className="font-display text-2xl text-[var(--color-ink)]">
        {skill.title}
      </h2>
      <p className="font-mono text-xs text-[var(--color-mist)] mt-1">
        {skill.objective}
      </p>

      <section
        className={`mt-5 border border-[var(--color-panel-2)] bg-[var(--color-panel)] rounded-sm overflow-hidden transition-[opacity,transform] duration-300 ${
          introOpen ? "opacity-100" : "opacity-95"
        }`}
      >
        <button
          type="button"
          onClick={() => setIntroOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left active:scale-[0.995] transition-transform"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)]">
            {introOpen ? "ELI5 intro" : "Intro (collapsed)"}
          </span>
          <span className="font-mono text-xs text-[var(--color-mist)]">
            {introOpen ? "hide" : "show again"}
          </span>
        </button>

        {introOpen && (
          <div className="px-4 pb-5 border-t border-[var(--color-panel-2)] animate-rise">
            <div className="mt-4 text-[var(--color-ink)] leading-relaxed text-base">
              <MathText text={lesson.eli5} />
            </div>
            {lesson.analogy && (
              <p className="mt-3 text-sm text-[var(--color-paper-dim)] italic">
                <MathText text={lesson.analogy} />
              </p>
            )}
            {lesson.workedExample && !lesson.demo && (
              <div className="mt-4 rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-paper)] px-3 py-2 text-sm">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-mist)] mb-1">
                  Baby example
                </p>
                <MathText text={lesson.workedExample} />
              </div>
            )}
            {lesson.demo && (
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-mist)] mb-2">
                  Try it
                </p>
                <InteractionHost
                  spec={lesson.demo.spec}
                  value={demoValue}
                  onChange={setDemoValue}
                  goal={lesson.demo.goal}
                />
              </div>
            )}
            <CoachPanel
              enabled
              busy={coachBusy}
              messages={coachMsgs}
              onAsk={handleIntroCoach}
              chips={LESSON_COACH_CHIPS}
              caption="Lesson intro · rephrase · local model"
            />
            {!alreadyGroked && (
              <button
                type="button"
                onClick={acknowledge}
                className="mt-5 px-4 py-2.5 bg-[var(--color-ink)] text-[var(--color-on-accent)] font-mono text-sm rounded-sm active:scale-[0.98] transition-transform"
              >
                I get it — practice this topic
              </button>
            )}
            {alreadyGroked && (
              <p className="mt-4 font-mono text-xs text-[var(--color-good)]">
                You marked this intro as understood. Practice below.
              </p>
            )}
          </div>
        )}
      </section>

      {showPractice && (
        <section className="mt-6 animate-rise">
          <h3 className="font-display text-xl text-[var(--color-ink)] mb-1">
            Practice
          </h3>
          <p className="text-sm text-[var(--color-mist)] mb-4">
            Problems for this topic only. Correct answers advance mastery the
            same way as Today&apos;s session.
          </p>
          <SkillSession skillId={skillId} />
        </section>
      )}
    </div>
  );
}
