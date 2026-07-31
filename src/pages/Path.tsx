import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useApp } from "@/state/AppContext";
import { UNITS, SKILLS } from "@/content";
import { lessonForSkill } from "@/content/lessons";
import { Button, Card, Icon, Sheet } from "@/ui";
import { nextMilestone, resumeSkill } from "@/lib/store";
import {
  motion,
  Stagger,
  staggerItem,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

export function PathPage() {
  const { state, updateSettings, setResume } = useApp();
  const nav = useNavigate();
  const reduced = useReducedMotion();
  const [startSkillId, setStartSkillId] = useState<string | null>(null);

  if (!state.settings.onboardingDone) {
    return (
      <motion.div
        className="min-h-[60vh] flex flex-col justify-center"
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springOrInstant(reduced, springs.soft)}
      >
        <p className="text-[12px] text-[var(--ink-3)] uppercase tracking-wide mb-2">
          Calculus 3 · local
        </p>
        <h1 className="text-[24px] font-medium text-[var(--ink-1)]">CalcTutor</h1>
        <p className="mt-3 text-[14px] text-[var(--ink-2)] max-w-md leading-relaxed">
          Short ~3‑minute lessons, knowledge cards, then practice. Pick up where
          you left off anytime.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => {
              nav("/personalize");
            }}
          >
            Start learning
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              updateSettings({ onboardingDone: true, personalizerDone: true });
              nav("/s/placement");
            }}
          >
            Optional placement
          </Button>
        </div>
      </motion.div>
    );
  }

  if (!state.settings.personalizerDone) {
    return <Navigate to="/personalize" replace />;
  }

  const resume = resumeSkill(state);
  const activeId = resume?.id;
  const units = UNITS.filter((u) => u.id !== "diagnostic" && u.id !== "exam").sort(
    (a, b) => a.order - b.order,
  );
  const grokked = resume ? state.grokked.includes(resume.id) : false;
  const startSkill = startSkillId
    ? SKILLS.find((s) => s.id === startSkillId)
    : null;
  const startLesson = startSkillId ? lessonForSkill(startSkillId) : undefined;
  const startHook =
    startLesson?.hook ??
    startLesson?.intro?.caption ??
    startSkill?.objective ??
    "";

  return (
    <div className="space-y-8">
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springOrInstant(reduced, springs.soft)}
      >
        <h1 className="text-[24px] font-medium text-[var(--ink-1)]">Learn</h1>
        <p className="text-[13px] text-[var(--ink-3)] mt-1">
          {nextMilestone(state)}
        </p>
      </motion.div>

      {resume ? (
        <motion.div
          layoutId={reduced ? undefined : `skill-card-${resume.id}`}
          transition={springOrInstant(reduced, springs.ui)}
        >
          <Card className="space-y-3">
            <div>
              <p className="text-[12px] text-[var(--ink-3)]">
                {state.resumeSkillId === resume.id
                  ? "Pick up where you left off"
                  : "Continue on the path"}
              </p>
              <motion.p
                layoutId={reduced ? undefined : `skill-${resume.id}`}
                className="text-[18px] font-medium text-[var(--ink-1)] mt-1"
                transition={springOrInstant(reduced, springs.ui)}
              >
                {resume.title}
              </motion.p>
              <p className="text-[13px] text-[var(--ink-2)] mt-0.5">
                {resume.objective}
              </p>
              <div className="flex gap-0.5 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < (state.crowns[resume.id] ?? 0)
                        ? "bg-[var(--crown)]"
                        : "bg-[var(--line)]"
                    }`}
                  />
                ))}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => nav(`/s/skill/${resume.id}`)}
            >
              {grokked ? "Continue practice" : "Continue learning"}
            </Button>
            <button
              type="button"
              onClick={() => nav(`/skill/${resume.id}`)}
              className="w-full text-[13px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
            >
              Topic details
            </button>
          </Card>
        </motion.div>
      ) : (
        <Card>
          <p className="text-[14px] font-medium text-[var(--ink-1)]">
            Path complete
          </p>
          <p className="text-[13px] text-[var(--ink-2)] mt-1">
            Every topic is mastered. Run an exam sim when you want a check.
          </p>
          <Button className="w-full mt-3" onClick={() => nav("/exam")}>
            Exam sim
          </Button>
        </Card>
      )}

      {units.map((unit) => {
        const skills = SKILLS.filter((s) => s.unitId === unit.id).sort(
          (a, b) => a.order - b.order,
        );
        const crowned = skills.filter(
          (s) => (state.crowns[s.id] ?? 0) >= 5 || state.skills[s.id]?.mastered,
        ).length;
        return (
          <section
            key={unit.id}
            className="rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]/40 px-3 py-4 sm:px-4"
          >
            <div className="mb-3">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[14px] font-medium text-[var(--ink-1)]">
                  {unit.title}
                </h2>
                <span className="text-[12px] text-[var(--ink-3)] tabular-nums">
                  {crowned}/{skills.length} lessons
                </span>
              </div>
              <p className="text-[12px] text-[var(--ink-3)] mt-0.5">{unit.blurb}</p>
              <div className="mt-2 h-1 rounded-full bg-[var(--line)] overflow-hidden">
                <motion.div
                  className="h-full bg-[var(--accent)] rounded-full"
                  initial={false}
                  animate={{
                    width: `${skills.length ? (100 * crowned) / skills.length : 0}%`,
                  }}
                  transition={springOrInstant(reduced, springs.soft)}
                />
              </div>
            </div>

            <Stagger className="relative pl-6 space-y-3" step={0.035}>
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--line)]" />
              {skills.map((s) => {
                const prog = state.skills[s.id];
                const locked = !prog?.unlocked;
                const crowns = state.crowns[s.id] ?? 0;
                const active = s.id === activeId;
                return (
                  <motion.li
                    key={s.id}
                    className="relative list-none"
                    variants={
                      reduced
                        ? undefined
                        : {
                            ...staggerItem,
                            show: {
                              ...staggerItem.show,
                              scale: active ? 1.02 : 1,
                            },
                          }
                    }
                    animate={
                      reduced
                        ? undefined
                        : active
                          ? { scale: 1.02 }
                          : { scale: 1 }
                    }
                    transition={springOrInstant(reduced, springs.snappy)}
                  >
                    <span
                      className={`absolute -left-6 top-3 w-3 h-3 rounded-full border-2 ${
                        locked
                          ? "bg-[var(--bg-sub)] border-[var(--line-2)]"
                          : active
                            ? "bg-[var(--accent)] border-[var(--accent)]"
                            : crowns >= 5
                              ? "bg-[var(--crown)] border-[var(--crown)]"
                              : "bg-[var(--card)] border-[var(--accent)]"
                      }`}
                    />
                    {locked ? (
                      <div className="flex items-center gap-3 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--bg)] px-3 py-3 opacity-60">
                        <Icon icon={Lock} size={14} className="text-[var(--ink-3)]" />
                        <div>
                          <p className="text-[14px] text-[var(--ink-2)]">{s.title}</p>
                          <p className="text-[12px] text-[var(--ink-3)]">Locked</p>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setStartSkillId(s.id)}
                        className={`w-full flex items-center justify-between gap-3 rounded-[var(--r-card)] border px-3 py-3 transition-colors text-left ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-weak)]"
                            : "border-[var(--line)] bg-[var(--bg)] hover:border-[var(--line-2)]"
                        }`}
                      >
                        <div className="min-w-0">
                          <motion.p
                            layoutId={
                              reduced || !active
                                ? undefined
                                : `skill-${s.id}`
                            }
                            className="text-[14px] font-medium text-[var(--ink-1)] truncate"
                            transition={springOrInstant(reduced, springs.ui)}
                          >
                            {s.title}
                          </motion.p>
                          <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  i < crowns ? "bg-[var(--crown)]" : "bg-[var(--line)]"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {state.grokked.includes(s.id) ? (
                          <span className="text-[12px] text-[var(--ink-3)]">Practice</span>
                        ) : (
                          <span className="text-[12px] text-[var(--ink-2)]">Learn</span>
                        )}
                      </button>
                    )}
                  </motion.li>
                );
              })}
            </Stagger>
          </section>
        );
      })}

      <Sheet
        open={Boolean(startSkill)}
        onClose={() => setStartSkillId(null)}
        title={startSkill?.title}
      >
        {startSkill && (
          <div className="space-y-4">
            <p className="text-[15px] text-[var(--ink-1)] leading-snug">
              {startHook}
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setResume(startSkill.id);
                setStartSkillId(null);
                nav(`/s/skill/${startSkill.id}`);
              }}
            >
              Start 3‑minute lesson
            </Button>
            <Link
              to={`/skill/${startSkill.id}`}
              onClick={() => setStartSkillId(null)}
              className="block text-center text-[13px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
            >
              Topic details
            </Link>
          </div>
        )}
      </Sheet>
    </div>
  );
}
