import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { v4 as uuid } from "uuid";
import { useApp } from "@/state/AppContext";
import { buildSessionSteps } from "./buildSteps";
import type { SessionStep } from "./types";
import { isTeach } from "./types";
import { SessionShell } from "@/components/shell/SessionShell";
import { FeedbackBar } from "./FeedbackBar";
import { SessionComplete } from "./SessionComplete";
import { MathText } from "@/components/MathText";
import { InteractionHost } from "@/components/interactions/InteractionHost";
import { IntroFigureHost } from "@/components/IntroFigureHost";
import { HintLadderPanel } from "@/components/HintLadder";
import { LESSON_COACH_CHIPS } from "@/components/CoachPanel";
import { FloatingCoach } from "@/components/FloatingCoach";
import { Button, Sheet } from "@/ui";
import { gradeAnswer } from "@/lib/grading";
import { askCoach, warmCoach } from "@/lib/ollama";
import { skillById } from "@/content";
import { itemHasInteraction } from "@/lib/interactions";
import { itemXp, XP } from "@/lib/gamify";
import { defaultExamWeight } from "@/lib/pedagogy";
import { scoreExamAttempt } from "@/lib/scheduler";
import type { CoachMessage, SessionMode, SessionSummary } from "@/types/content";
import {
  AnimatePresence,
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

export function SessionPage() {
  const { mode, skillId } = useParams();
  const [params] = useSearchParams();
  const forceTeach = params.get("teach") === "1";
  const sessionMode: SessionMode = skillId
    ? "skill"
    : mode === "review" ||
        mode === "exam" ||
        mode === "placement" ||
        mode === "today"
      ? mode
      : "today";
  const nav = useNavigate();
  const {
    state,
    recordAttempt,
    pushExamScore,
    completeSession,
    addXp,
    markGroked,
    setFocusSkillId,
    setResume,
    updateSettings,
  } = useApp();

  const [steps, setSteps] = useState<SessionStep[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [demoValue, setDemoValue] = useState("");
  const [hintLevel, setHintLevel] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [correct, setCorrect] = useState(false);
  const [locked, setLocked] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [firstTryCorrect, setFirstTryCorrect] = useState(0);
  const [results, setResults] = useState<
    ("pending" | "teach" | "correct" | "wrong" | "current")[]
  >([]);
  const [done, setDone] = useState(false);
  const [examPct, setExamPct] = useState<number | null>(null);
  const [coachMsgs, setCoachMsgs] = useState<CoachMessage[]>([]);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachPulse, setCoachPulse] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [gen, setGen] = useState(0);
  const [teachXpForSkill, setTeachXpForSkill] = useState(0);
  const examRef = useRef<{ weight: number; correct: boolean }[]>([]);
  const startRef = useRef(Date.now());
  const abortRef = useRef<AbortController | null>(null);
  const autoTimer = useRef<number | null>(null);
  const reduced = useReducedMotion();

  const coachOn = sessionMode !== "exam";
  const hintsOn = sessionMode !== "exam";
  const trackExam = sessionMode === "exam";

  function boot() {
    const built = buildSessionSteps(sessionMode, state, {
      skillId,
      forceTeach,
    });
    setSteps(built);
    setIdx(0);
    setAnswer("");
    setDemoValue("");
    setHintLevel(0);
    setFeedback(null);
    setLocked(false);
    setCorrect(false);
    setXpEarned(0);
    setCombo(0);
    setBestCombo(0);
    setSessionXp(0);
    setCorrectCount(0);
    setFirstTryCorrect(0);
    setDone(false);
    setExamPct(null);
    setCoachMsgs([]);
    setCoachOpen(false);
    setCoachPulse(false);
    setTeachXpForSkill(0);
    examRef.current = [];
    startRef.current = Date.now();
    setResults(built.map((s) => (isTeach(s) ? "teach" : "pending")));
    if (coachOn) void warmCoach(state.settings);
  }

  useEffect(() => {
    boot();
    return () => {
      abortRef.current?.abort();
      if (autoTimer.current) window.clearTimeout(autoTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen, sessionMode, skillId, forceTeach]);

  const step = steps[idx];
  const problem = step && !isTeach(step) ? step.queue.item : null;
  const skill = skillById(
    step
      ? isTeach(step)
        ? step.skillId
        : step.queue.item.skillId
      : skillId ?? "",
  );

  useEffect(() => {
    const id = step
      ? isTeach(step)
        ? step.skillId
        : step.queue.item.skillId
      : skillId ?? null;
    if (id) {
      setFocusSkillId(id);
      if (sessionMode === "skill") setResume(id);
    }
  }, [step, skillId, sessionMode, setFocusSkillId, setResume]);

  useEffect(() => () => setFocusSkillId(null), [setFocusSkillId]);

  const segments = useMemo(() => {
    return steps.map((s, i) => {
      if (i === idx && !locked && !done) return "current" as const;
      if (i < idx || (i === idx && locked)) {
        return results[i] === "wrong"
          ? ("wrong" as const)
          : results[i] === "correct"
            ? ("correct" as const)
            : isTeach(s)
              ? ("teach" as const)
              : ("correct" as const);
      }
      return isTeach(s) ? ("teach" as const) : ("pending" as const);
    });
  }, [steps, idx, results, locked, done]);

  function resetUi() {
    abortRef.current?.abort();
    setAnswer("");
    setDemoValue("");
    setHintLevel(0);
    setFeedback(null);
    setLocked(false);
    setCorrect(false);
    setXpEarned(0);
    setCoachMsgs([]);
    setCoachOpen(false);
    setCoachPulse(false);
    if (autoTimer.current) {
      window.clearTimeout(autoTimer.current);
      autoTimer.current = null;
    }
  }

  function finishSession() {
    const problemSteps = steps.filter((s) => !isTeach(s));
    if (trackExam) {
      const pct = scoreExamAttempt(examRef.current);
      pushExamScore(pct);
      setExamPct(pct);
    }
    const perfect =
      correctCount === problemSteps.length && problemSteps.length > 0;
    const bonus = XP.sessionComplete + (perfect ? XP.perfectSession : 0);
    const totalXp = sessionXp + bonus;
    if (bonus > 0) addXp(bonus);
    setSessionXp(totalXp);
    const summary: SessionSummary = {
      at: Date.now(),
      mode: sessionMode,
      skillId,
      items: problemSteps.length,
      correct: correctCount,
      firstTryCorrect,
      xp: totalXp,
      durationMs: Date.now() - startRef.current,
      bestCombo,
    };
    completeSession(summary);
    if (sessionMode === "placement") {
      updateSettings({ onboardingDone: true });
    }
    setDone(true);
  }

  function advance() {
    if (idx + 1 >= steps.length) {
      finishSession();
      return;
    }
    setIdx((i) => i + 1);
    resetUi();
  }

  function advanceTeach() {
    if (!step || !isTeach(step)) return;
    if (step.teach === "grok") {
      markGroked(step.skillId);
    }
    if (teachXpForSkill < XP.teachCapPerSkill) {
      const gain = Math.min(XP.teachStep, XP.teachCapPerSkill - teachXpForSkill);
      addXp(gain);
      setTeachXpForSkill((t) => t + gain);
      setSessionXp((x) => x + gain);
    }
    setResults((r) => {
      const copy = [...r];
      copy[idx] = "teach";
      return copy;
    });
    advance();
  }

  function submit() {
    if (!problem || locked) return;
    const result = gradeAnswer(problem, answer);
    setFeedback(result.feedback);
    setCorrect(result.correct);
    setLocked(true);
    const revealed = hintLevel >= 4;
    const grade: 1 | 2 | 3 | 4 = result.correct
      ? revealed
        ? 2
        : hintLevel === 0
          ? 4
          : 3
      : 1;
    recordAttempt(
      {
        id: uuid(),
        itemId: problem.id,
        skillId: problem.skillId,
        correct: result.correct,
        revealed,
        hintLevel,
        answerGiven: answer,
        at: Date.now(),
      },
      grade,
    );
    if (trackExam) {
      examRef.current.push({
        weight: defaultExamWeight(problem.examWeight),
        correct: result.correct,
      });
    }

    let nextCombo = combo;
    if (result.correct && hintLevel === 0) {
      nextCombo = combo + 1;
      setCombo(nextCombo);
      setBestCombo((b) => Math.max(b, nextCombo));
      setFirstTryCorrect((n) => n + 1);
    } else {
      nextCombo = 0;
      setCombo(0);
    }
    if (result.correct) setCorrectCount((n) => n + 1);

    const gained = itemXp({
      correct: result.correct,
      hintLevel,
      firstTry: hintLevel === 0,
      combo: nextCombo,
    });
    setXpEarned(gained);
    if (gained > 0) {
      addXp(gained);
      setSessionXp((x) => x + gained);
    }
    setResults((r) => {
      const copy = [...r];
      copy[idx] = result.correct ? "correct" : "wrong";
      return copy;
    });

    if (!result.correct && coachOn && !coachOpen) {
      setCoachPulse(true);
    }

    if (result.correct && sessionMode !== "exam") {
      autoTimer.current = window.setTimeout(() => advance(), 900);
    }
  }

  async function handleCoach(q: string) {
    if (!skill || !coachOn) return;
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
      const lessonIntro =
        step && isTeach(step)
          ? [step.text, step.goal].filter(Boolean).join("\n\n")
          : undefined;
      const stubItem = problem ?? {
        id: `teach_${skill.id}`,
        skillId: skill.id,
        kind: "learn" as const,
        prompt: skill.title,
        answerType: "free" as const,
        answer: "",
        hints: {
          nudge: "",
          technique: "",
          nextStep: "",
          fullSolution: step && isTeach(step) ? step.text : "",
        },
        misconceptionTags: [],
        rubric: "teach",
        difficulty: 1 as const,
      };
      const reply = await askCoach(
        state.settings,
        {
          item: stubItem,
          skillTitle: skill.title,
          skillObjective: skill.objective,
          attempt: problem ? answer : demoValue,
          hintLevel,
          lessonIntro,
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

  if (!steps.length && !done) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg)]">
        <p className="text-[13px] text-[var(--ink-3)] animate-pulse-soft">
          Building session…
        </p>
      </div>
    );
  }

  if (done) {
    const problemTotal = steps.filter((s) => !isTeach(s)).length;
    return (
      <SessionComplete
        xp={sessionXp}
        correct={correctCount}
        total={problemTotal}
        bestCombo={bestCombo}
        examPct={examPct}
        skillId={skillId}
        onAgain={() => setGen((g) => g + 1)}
      />
    );
  }

  if (!step) return null;

  const teachCta =
    step && isTeach(step)
      ? step.teach === "intro"
        ? "Next"
        : step.teach === "eli5"
          ? "Got it"
          : step.teach === "grok"
            ? "Let's go"
            : "Continue"
      : null;

  const teachLabel =
    step && isTeach(step)
      ? step.teach === "intro"
        ? "Look"
        : step.teach === "eli5"
          ? "The idea"
          : step.teach === "analogy"
            ? "Analogy"
            : step.teach === "demo"
              ? "Try it"
              : step.teach === "worked"
                ? "Baby example"
                : "Ready?"
      : "";

  const footer = isTeach(step) ? (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 bg-[var(--bg)]">
      <div className="max-w-xl mx-auto">
        <Button className="w-full" onClick={advanceTeach}>
          {teachCta}
        </Button>
      </div>
    </div>
  ) : !locked ? (
    <motion.div
      layoutId={reduced ? undefined : "session-action"}
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 bg-[var(--bg)]"
      transition={springOrInstant(reduced, springs.ui)}
    >
      <div className="max-w-xl mx-auto">
        <Button className="w-full" onClick={submit}>
          Check
        </Button>
      </div>
    </motion.div>
  ) : null;

  return (
    <>
      <SessionShell
        segments={segments}
        combo={combo}
        title={skill?.title}
        skillId={skill?.id}
        footer={footer}
        overlay={
          <>
            {locked && feedback && (
              <FeedbackBar
                correct={correct}
                feedback={feedback}
                xpEarned={xpEarned}
                onContinue={advance}
              />
            )}
            {coachOn && (
              <FloatingCoach
                open={coachOpen}
                onOpenChange={(o) => {
                  setCoachOpen(o);
                  if (o) setCoachPulse(false);
                }}
                pulse={coachPulse && !coachOpen}
                enabled
                busy={coachBusy}
                messages={coachMsgs}
                onAsk={handleCoach}
                chips={isTeach(step) ? LESSON_COACH_CHIPS : undefined}
                caption={
                  isTeach(step)
                    ? "Lesson intro · local model"
                    : "Scoped to this problem · Socratic · local model"
                }
              />
            )}
          </>
        }
        onClose={() => setQuitOpen(true)}
      >
        <AnimatePresence mode="wait">
          {isTeach(step) ? (
            <motion.div
              key={`teach-${idx}`}
              className="space-y-5"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={springOrInstant(reduced, springs.soft)}
            >
              <p className="text-[12px] text-[var(--ink-3)] uppercase tracking-wide">
                {teachLabel}
              </p>
              {step.teach === "intro" && step.intro ? (
                <>
                  <p className="text-[18px] font-medium leading-snug text-[var(--ink-1)]">
                    {step.intro.caption}
                  </p>
                  {step.intro.kind === "showcase" ? (
                    <InteractionHost
                      spec={step.intro.spec}
                      value={demoValue}
                      onChange={setDemoValue}
                      mode="showcase"
                      autoplay={step.intro.autoplay}
                    />
                  ) : (
                    <IntroFigureHost
                      figure={step.intro.figure}
                      caption={step.intro.caption}
                      steps={
                        step.intro.kind === "sequence"
                          ? step.intro.steps
                          : undefined
                      }
                    />
                  )}
                </>
              ) : (
                <div
                  className={`${
                    step.text.length > 160 ? "text-[18px]" : "text-[24px]"
                  } font-medium leading-snug text-[var(--ink-1)]`}
                >
                  <MathText text={step.text} />
                </div>
              )}
              {step.teach === "demo" && step.spec && (
                <InteractionHost
                  spec={step.spec}
                  value={demoValue}
                  onChange={setDemoValue}
                  goal={step.goal}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`prob-${idx}`}
              className={`space-y-4 ${locked && !correct ? "animate-shake" : ""}`}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={springOrInstant(reduced, springs.soft)}
            >
              <p className="text-[12px] text-[var(--ink-3)]">
                {step.queue.reason}
                {state.grokked.includes(problem!.skillId) && (
                  <>
                    {" · "}
                    <Link
                      to={`/s/skill/${problem!.skillId}?teach=1`}
                      className="underline underline-offset-2"
                    >
                      Recap intro
                    </Link>
                  </>
                )}
              </p>
              <div
                className={`${
                  problem!.prompt.length > 160 ? "text-[18px]" : "text-[24px]"
                } font-medium leading-snug text-[var(--ink-1)]`}
              >
                <MathText text={problem!.prompt} />
              </div>
              {problem!.fadePrompt && (
                <p className="text-[13px] text-[var(--ink-2)]">
                  {problem!.fadePrompt}
                </p>
              )}

              {itemHasInteraction(problem!) ? (
                <InteractionHost
                  spec={problem!.interaction}
                  value={answer}
                  onChange={setAnswer}
                  disabled={locked}
                />
              ) : problem!.answerType === "choice" && problem!.choices ? (
                <div className="flex flex-col gap-2">
                  {problem!.choices.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={locked}
                      onClick={() => setAnswer(c)}
                      className={`text-left px-4 py-3 rounded-[var(--r-input)] border text-[14px] transition ${
                        answer === c
                          ? "border-[var(--accent)] bg-[var(--accent-weak)]"
                          : "border-[var(--line)] hover:border-[var(--line-2)]"
                      }`}
                    >
                      <MathText text={c} />
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={locked}
                  placeholder="Your answer"
                  className="w-full bg-[var(--card)] border border-[var(--line)] rounded-[var(--r-input)] px-4 py-3 text-[14px] outline-none focus:border-[var(--ink-1)] disabled:opacity-60"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (locked) advance();
                      else submit();
                    }
                  }}
                />
              )}

              {hintsOn && (
                <HintLadderPanel
                  hints={problem!.hints}
                  level={hintLevel}
                  revealCost
                  onEscalate={() => setHintLevel((h) => Math.min(4, h + 1))}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </SessionShell>

      <Sheet
        open={quitOpen}
        onClose={() => setQuitOpen(false)}
        title="Quit session?"
      >
        <p className="text-[13px] text-[var(--ink-2)] mb-4">
          Progress on answered items is saved.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              setQuitOpen(false);
              nav("/");
            }}
          >
            Quit to Learn
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setQuitOpen(false)}
          >
            Keep going
          </Button>
        </div>
      </Sheet>
    </>
  );
}
