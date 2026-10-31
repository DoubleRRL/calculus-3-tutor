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
import { LessonDeck, type LessonPhase } from "./LessonDeck";
import { ClickFill, countBlanks, decodeClickFill } from "./ClickFill";
import { TupleInput } from "./TupleInput";
import { MathText } from "@/components/MathText";
import { InteractionHost } from "@/components/interactions/InteractionHost";
import { LESSON_COACH_CHIPS } from "@/components/CoachPanel";
import { LadderRail } from "./LadderRail";
import {
  escalateTutor,
  hasRevealed,
  initTutorState,
  isInsist,
  tutorReducer,
} from "@/lib/tutorMachine";
import { parseCoachReply } from "@/lib/coachReply";
import { FloatingCoach } from "@/components/FloatingCoach";
import { FloatingScratchCalc } from "@/components/FloatingScratchCalc";
import { FloatingGlossary } from "@/components/FloatingGlossary";
import { Button, Sheet } from "@/ui";
import { gradeAnswer } from "@/lib/grading";
import { askCoach, warmCoach } from "@/lib/ollama";
import { skillById } from "@/content";
import { itemHasInteraction } from "@/lib/interactions";
import { itemXp, XP } from "@/lib/gamify";
import { defaultExamWeight } from "@/lib/pedagogy";
import { scoreExamAttempt } from "@/lib/scheduler";
import type { CoachMessage, SessionMode, SessionSummary } from "@/types/content";
import { modeIndex, type TutorState } from "@/types/tutor";
import {
  AnimatePresence,
  motion,
  tweens,
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
        mode === "checkpoint" ||
        mode === "placement" ||
        mode === "today"
      ? mode
      : "today";
  const nav = useNavigate();
    const {
      state,
      recordAttempt,
      pushExamScore,
      pushCheckpointScore,
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
  const [tutor, setTutor] = useState<TutorState>(initTutorState);
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
  const [coachSheet, setCoachSheet] = useState(false);
  const [coachPulse, setCoachPulse] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [gen, setGen] = useState(0);
  const [teachXpAwarded, setTeachXpAwarded] = useState(false);
  const [lessonPhase, setLessonPhase] = useState<LessonPhase>("pages");
  const [pageIndex, setPageIndex] = useState(0);
  const [reviewPass, setReviewPass] = useState(false);
  const [reviewGate, setReviewGate] = useState(false);
  /** First-pass practice stats (review retries don't rewrite the summary). */
  const [firstPassStats, setFirstPassStats] = useState<{
    items: number;
    correct: number;
    firstTryCorrect: number;
  } | null>(null);
  const examRef = useRef<{ weight: number; correct: boolean }[]>([]);
  const startRef = useRef(Date.now());
  const abortRef = useRef<AbortController | null>(null);
  const badgesAtStartRef = useRef<string[]>(state.badges);
  const reduced = useReducedMotion();

  const examLike = sessionMode === "exam" || sessionMode === "checkpoint";
  const coachOn = !examLike;
  const hintsOn = !examLike;
  const trackExam = examLike;

  /**
   * 0..4 depth of help given so far, kept as a derived value because the grade,
   * XP and FSRS maths all predate the ladder machine.
   */
  const hintLevel = modeIndex(tutor.mode);

  function boot() {
    const built = buildSessionSteps(sessionMode, state, {
      skillId,
      forceTeach,
    });
    setSteps(built);
    setIdx(0);
    setAnswer("");
    setTutor(initTutorState());
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
    setCoachSheet(false);
    setCoachPulse(false);
    setTeachXpAwarded(false);
    setLessonPhase("pages");
    setPageIndex(0);
    setReviewPass(false);
    setReviewGate(false);
    setFirstPassStats(null);
    examRef.current = [];
    startRef.current = Date.now();
    badgesAtStartRef.current = state.badges;
    setResults(built.map((s) => (isTeach(s) ? "teach" : "pending")));
    if (coachOn) void warmCoach(state.settings);
  }

  useEffect(() => {
    boot();
    return () => {
      abortRef.current?.abort();
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

  /**
   * Vertical slot for a closed panel's dock tab. Panels float freely, so tabs
   * are the only thing still anchored right and they must not overlap.
   */
  function dockIndex(which: "calc" | "glossary"): number {
    const slots: string[] = [];
    if (coachOn) slots.push("coach");
    if (coachOn) slots.push("calc");
    if (step) slots.push("glossary");
    const at = slots.indexOf(which);
    return at < 0 ? 0 : at;
  }

  /** One shell segment for the teach block; one per practice item. */
  const segments = useMemo(() => {
    type Seg = "pending" | "teach" | "correct" | "wrong" | "current";
    const out: Seg[] = [];
    let teachEmitted = false;
    const onTeach = Boolean(step && isTeach(step));
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]!;
      if (isTeach(s)) {
        if (teachEmitted) continue;
        teachEmitted = true;
        if (onTeach && !done) out.push("current");
        else if (i < idx) out.push("teach");
        else out.push("teach");
        continue;
      }
      if (i === idx && !locked && !done) out.push("current");
      else if (i < idx || (i === idx && locked)) {
        out.push(results[i] === "wrong" ? "wrong" : "correct");
      } else out.push("pending");
    }
    return out;
  }, [steps, idx, results, locked, done, step]);

  function resetUi() {
    abortRef.current?.abort();
    setAnswer("");
    setTutor(initTutorState());
    setFeedback(null);
    setLocked(false);
    setCorrect(false);
    setXpEarned(0);
    setCoachMsgs([]);
    setCoachOpen(false);
    setCoachSheet(false);
    setCoachPulse(false);
    setCalcOpen(false);
    setGlossaryOpen(false);
  }

  function finishSession() {
    const problemSteps = steps.filter((s) => !isTeach(s));
    if (trackExam) {
      const pct = scoreExamAttempt(examRef.current);
      if (sessionMode === "checkpoint") {
        pushCheckpointScore(pct);
      } else {
        pushExamScore(pct);
      }
      setExamPct(pct);
    }
    const items = firstPassStats?.items ?? problemSteps.length;
    const correctFinal = firstPassStats?.correct ?? correctCount;
    const firstTryFinal =
      firstPassStats?.firstTryCorrect ?? firstTryCorrect;
    const perfect = correctFinal === items && items > 0;
    const bonus = XP.sessionComplete + (perfect ? XP.perfectSession : 0);
    const totalXp = sessionXp + bonus;
    if (bonus > 0) addXp(bonus);
    setSessionXp(totalXp);
    const summary: SessionSummary = {
      at: Date.now(),
      mode: sessionMode,
      skillId,
      items,
      correct: correctFinal,
      firstTryCorrect: firstTryFinal,
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
      maybeReviewOrFinish();
      return;
    }
    setIdx((i) => i + 1);
    resetUi();
  }

  function maybeReviewOrFinish() {
    if (!reviewPass && !examLike) {
      const wrongs = steps.filter(
        (s, i) => !isTeach(s) && results[i] === "wrong",
      );
      if (wrongs.length > 0) {
        setFirstPassStats({
          items: steps.filter((s) => !isTeach(s)).length,
          correct: correctCount,
          firstTryCorrect,
        });
        setReviewGate(true);
        return;
      }
    }
    finishSession();
  }

  function startWrongReview() {
    const wrongs = steps.filter(
      (s, i) => !isTeach(s) && results[i] === "wrong",
    );
    setReviewGate(false);
    setReviewPass(true);
    setSteps(wrongs);
    setIdx(0);
    setResults(wrongs.map(() => "pending" as const));
    resetUi();
  }

  function completeTeachAndStartPractice() {
    if (!step || !isTeach(step)) return;
    markGroked(step.skillId);
    if (!teachXpAwarded) {
      const gain = XP.teachCapPerSkill;
      addXp(gain);
      setTeachXpAwarded(true);
      setSessionXp((x) => x + gain);
    }
    setResults((r) => {
      const copy = [...r];
      copy[idx] = "teach";
      return copy;
    });
    setLessonPhase("pages");
    setPageIndex(0);
    advance();
  }

  function lessonBack() {
    if (!step || !isTeach(step)) return;
    if (lessonPhase === "knowledge") {
      setLessonPhase("pages");
      setPageIndex(Math.max(0, step.pages.length - 1));
      return;
    }
    if (pageIndex > 0) setPageIndex((p) => p - 1);
  }

  function lessonNext() {
    if (!step || !isTeach(step)) return;
    if (lessonPhase === "knowledge") {
      completeTeachAndStartPractice();
      return;
    }
    if (pageIndex + 1 < step.pages.length) {
      setPageIndex((p) => p + 1);
      return;
    }
    setLessonPhase("knowledge");
  }

  function submit() {
    if (!problem || locked) return;
    if (problem.answerType === "clickFill") {
      const n = countBlanks(problem.prompt);
      const slots = decodeClickFill(answer, n);
      if (slots.some((s) => !s.trim())) return;
    }
    const result = gradeAnswer(problem, answer);
    setFeedback(result.feedback);
    setCorrect(result.correct);
    setLocked(true);
    const revealed = hasRevealed(tutor);
    setTutor((s) =>
      tutorReducer(s, {
        type: "submit",
        correct: result.correct,
        answer,
        revealed,
      }).state,
    );
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
  }

  async function handleCoach(q: string) {
    if (!skill || !coachOn) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const history = coachMsgs;
    // A demand for the answer is counted before the model ever sees it, so the
    // "insist twice" rule the prompt describes is actually backed by a counter.
    if (isInsist(q)) setTutor((s) => tutorReducer(s, { type: "insist" }).state);
    setCoachBusy(true);
    setCoachMsgs((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: "" },
    ]);
    let pending = "";
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flushTokens = () => {
      if (!pending) return;
      const chunk = pending;
      pending = "";
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
    };
    try {
      const lessonIntro =
        step && isTeach(step)
          ? step.pages
              .map((p) =>
                p.kind === "prose"
                  ? p.text
                  : p.kind === "demo"
                    ? p.goal
                    : p.kind === "showcase" || p.kind === "figure"
                      ? p.caption
                      : "",
              )
              .filter(Boolean)
              .join("\n\n")
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
          fullSolution: lessonIntro ?? "",
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
          attempt: problem ? answer : "",
          tutor,
          turn: tutor.turn,
          lessonIntro,
        },
        q,
        history,
        {
          signal: ac.signal,
          onToken: (chunk) => {
            pending += chunk;
            if (flushTimer == null) {
              flushTimer = setTimeout(() => {
                flushTimer = null;
                flushTokens();
              }, 50);
            }
          },
        },
      );
      if (flushTimer != null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flushTokens();
      const parsed = parseCoachReply(reply);
      setCoachMsgs((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") {
          copy[copy.length - 1] = {
            role: "assistant",
            content: parsed.text || reply,
          };
        }
        return copy;
      });
      // The question the coach actually asked is what the app compares against
      // its own history, so repetition is detected from behaviour, not vibes.
      setTutor((s) =>
        tutorReducer(s, {
          type: "reply",
          question: parsed.question || q,
        }).state,
      );
    } catch (e) {
      if (flushTimer != null) clearTimeout(flushTimer);
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

  if (reviewGate) {
    const wrongCount = results.filter((r) => r === "wrong").length;
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[var(--bg)] px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <h2 className="text-[24px] font-medium text-[var(--ink-1)]">
            Let&apos;s review what you got wrong
          </h2>
          <p className="text-[14px] text-[var(--ink-2)]">
            {wrongCount} item{wrongCount === 1 ? "" : "s"} to retry — short pass.
          </p>
          <Button className="w-full" onClick={startWrongReview}>
            Review mistakes
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setReviewGate(false);
              finishSession();
            }}
          >
            Skip to results
          </Button>
        </div>
      </div>
    );
  }

  if (!steps.length && !done) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[var(--bg)]">
        {/* Skeleton → content: mirrors the session layout while building */}
        <div className="w-full max-w-xl px-4 space-y-5" aria-hidden>
          <div className="h-3 w-24 rounded-full bg-[var(--line)] animate-pulse-soft" />
          <div className="space-y-2">
            <div className="h-6 w-4/5 rounded-md bg-[var(--line)] animate-pulse-soft" />
            <div className="h-6 w-3/5 rounded-md bg-[var(--line)] animate-pulse-soft [animation-delay:120ms]" />
          </div>
          <div className="h-12 rounded-[var(--r-input)] bg-[var(--line)] animate-pulse-soft [animation-delay:240ms]" />
          <div className="h-12 rounded-full bg-[var(--accent-weak)] animate-pulse-soft [animation-delay:360ms]" />
          <p className="text-center text-[12px] text-[var(--ink-3)]">
            Building session…
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    const problemTotal =
      firstPassStats?.items ?? steps.filter((s) => !isTeach(s)).length;
    const correctFinal = firstPassStats?.correct ?? correctCount;
    return (
      <SessionComplete
        xp={sessionXp}
        correct={correctFinal}
        total={problemTotal}
        bestCombo={bestCombo}
        examPct={examPct}
        sessionMode={sessionMode}
        skillId={skillId}
        newBadges={state.badges.filter(
          (id) => !badgesAtStartRef.current.includes(id),
        )}
        onAgain={() => setGen((g) => g + 1)}
      />
    );
  }

  if (!step) return null;

  const teachPages = isTeach(step) ? step.pages : [];
  const canLessonBack =
    isTeach(step) &&
    (lessonPhase === "knowledge" || pageIndex > 0);
  const lessonCta =
    isTeach(step) && lessonPhase === "knowledge"
      ? "Start practice"
      : isTeach(step) && pageIndex + 1 >= teachPages.length
        ? "Review cards"
        : "Next";

  const footer = isTeach(step) ? (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 bg-[var(--bg)] border-t border-[var(--line)]">
      <div className="max-w-xl mx-auto flex gap-2">
        <Button
          variant="ghost"
          className="shrink-0"
          disabled={!canLessonBack}
          onClick={lessonBack}
        >
          Back
        </Button>
        <Button className="flex-1" onClick={lessonNext}>
          {lessonCta}
        </Button>
      </div>
    </div>
  ) : !locked ? (
    <motion.div
      layoutId={reduced ? undefined : "session-action"}
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 bg-[var(--bg)]"
      transition={reduced ? { duration: 0 } : tweens.fast}
    >
      <div className="max-w-xl mx-auto">
        <Button className="w-full" onClick={submit}>
          Check
        </Button>
      </div>
    </motion.div>
  ) : null;

  function choiceClass(c: string): string {
    if (!locked) {
      return answer === c
        ? "border-[var(--accent)] bg-[var(--accent-weak)]"
        : "border-[var(--line)] hover:border-[var(--line-2)]";
    }
    const isAnswer = c === problem?.answer;
    const picked = answer === c;
    if (isAnswer) {
      return "border-[var(--success)] bg-[var(--success-weak)] text-[var(--success)]";
    }
    if (picked && !correct) {
      return "border-[var(--error)] bg-[var(--error-weak)] text-[var(--error)]";
    }
    return "border-[var(--line)] opacity-50";
  }

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
                onDiscuss={
                  coachOn
                    ? () => {
                        setCoachSheet(true);
                        setCoachOpen(true);
                        setCoachPulse(false);
                      }
                    : undefined
                }
              />
            )}
            {coachOn && (
              <FloatingCoach
                open={coachOpen}
                onOpenChange={(o) => {
                  setCoachOpen(o);
                  if (!o) setCoachSheet(false);
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
                    ? "Lesson · local model"
                    : "Scoped to this problem · Socratic · local model"
                }
                variant={coachSheet ? "sheet" : "float"}
              />
            )}
            {problem && !isTeach(step) && (
              <FloatingScratchCalc
                open={calcOpen}
                onOpenChange={setCalcOpen}
                onUseResult={(v) => {
                  setAnswer(v);
                  setCalcOpen(false);
                }}
                tabBottomOffsetPx={dockIndex("calc") * 46}
              />
            )}
            {step && (
              <FloatingGlossary
                open={glossaryOpen}
                onOpenChange={setGlossaryOpen}
                skillId={
                  skill?.id ??
                  (isTeach(step) ? step.skillId : step.queue.item.skillId)
                }
                tabBottomOffsetPx={dockIndex("glossary") * 46}
              />
            )}
          </>
        }
        onClose={() => setQuitOpen(true)}
      >
        <AnimatePresence mode="wait">
          {isTeach(step) ? (
            <motion.div
              key={`teach-${step.skillId}-${lessonPhase}-${pageIndex}`}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={reduced ? { duration: 0 } : tweens.fast}
            >
              <LessonDeck
                skillId={step.skillId}
                pages={step.pages}
                glossaryIds={step.glossaryIds}
                phase={lessonPhase}
                pageIndex={pageIndex}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`prob-${idx}`}
              className={`space-y-4 ${locked && !correct ? "animate-shake" : ""}`}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={reduced ? { duration: 0 } : tweens.fast}
            >
              <p className="text-[12px] text-[var(--ink-3)]">
                {reviewPass ? "Review" : step.queue.reason}
                {state.grokked.includes(problem!.skillId) && !reviewPass && (
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
              {problem!.answerType !== "clickFill" && (
                <div
                  className={`${
                    problem!.prompt.length > 160 ? "text-[18px]" : "text-[24px]"
                  } font-medium leading-snug text-[var(--ink-1)]`}
                >
                  <MathText text={problem!.prompt} />
                </div>
              )}
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
              ) : problem!.answerType === "clickFill" && problem!.choices ? (
                <ClickFill
                  prompt={problem!.prompt}
                  choices={problem!.choices}
                  value={answer}
                  onChange={setAnswer}
                  locked={locked}
                  correctAnswer={problem!.answer}
                  wasCorrect={correct}
                />
              ) : problem!.answerType === "choice" && problem!.choices ? (
                <div className="flex flex-col gap-2">
                  {problem!.choices.map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={locked}
                      onClick={() => setAnswer(c)}
                      className={`text-left px-4 py-3 rounded-[var(--r-input)] border text-[14px] transition ${choiceClass(c)}`}
                    >
                      <MathText text={c} />
                    </button>
                  ))}
                </div>
              ) : problem!.answerType === "tuple" ? (
                <TupleInput
                  answerCanonical={problem!.answer}
                  labels={problem!.tupleLabels}
                  skeleton={problem!.tupleSkeleton}
                  value={answer}
                  onChange={setAnswer}
                  locked={locked}
                  correct={correct}
                />
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
                <LadderRail
                  hints={problem!.hints}
                  tutor={tutor}
                  disabled={locked}
                  onEscalate={() => setTutor((s) => escalateTutor(s))}
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
