import { useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useApp } from "@/state/AppContext";
import {
  buildTodayQueue,
  buildExamQueue,
  buildDiagnosticQueue,
  buildSkillQueue,
  scoreExamAttempt,
  type QueueItem,
} from "@/lib/scheduler";
import { gradeAnswer } from "@/lib/grading";
import { askCoach, warmCoach } from "@/lib/ollama";
import { skillById } from "@/content";
import { MathText } from "@/components/MathText";
import { HintLadderPanel } from "@/components/HintLadder";
import { CoachPanel } from "@/components/CoachPanel";
import { InteractionHost } from "@/components/interactions/InteractionHost";
import type { CoachMessage } from "@/types/content";
import { defaultExamWeight, EXAM_SIZE } from "@/lib/pedagogy";
import { nextMilestone } from "@/lib/store";
import { itemHasInteraction } from "@/lib/interactions";

export type SessionConfig = {
  coach: boolean;
  hints: boolean;
  trackExamScore: boolean;
  countSession: boolean;
  buildQueue: () => QueueItem[];
  onComplete?: () => void;
};

export function SessionRunner({ config }: { config: SessionConfig }) {
  const { state, recordAttempt, pushExamScore, completeSession, setFocusSkillId } =
    useApp();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [hintLevel, setHintLevel] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [coachMsgs, setCoachMsgs] = useState<CoachMessage[]>([]);
  const [coachBusy, setCoachBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [examPct, setExamPct] = useState<number | null>(null);
  const [sessionGen, setSessionGen] = useState(0);
  const [advancedNote, setAdvancedNote] = useState<string | null>(null);
  const examResultsRef = useRef<{ weight: number; correct: boolean }[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const startMastered = useRef(0);

  function resetItemUi() {
    abortRef.current?.abort();
    abortRef.current = null;
    setAnswer("");
    setHintLevel(0);
    setFeedback(null);
    setLocked(false);
    setCoachMsgs([]);
    setCoachBusy(false);
  }

  function startSession() {
    const items = config.buildQueue();
    setQueue(items);
    setIdx(0);
    resetItemUi();
    setDone(false);
    setExamPct(null);
    setAdvancedNote(null);
    examResultsRef.current = [];
    startMastered.current = Object.values(state.skills).filter((s) => s.mastered).length;
    if (config.coach) {
      void warmCoach(state.settings);
    }
  }

  useEffect(() => {
    startSession();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionGen]);

  const current = queue[idx];
  const skill = current ? skillById(current.item.skillId) : undefined;

  useEffect(() => {
    const id = current?.item.skillId;
    if (id) setFocusSkillId(id);
  }, [current?.item.skillId, setFocusSkillId]);

  useEffect(() => {
    return () => setFocusSkillId(null);
  }, [setFocusSkillId]);

  const progressLabel = useMemo(() => {
    if (!queue.length) return "";
    return `${idx + 1} / ${queue.length} · ${current?.reason ?? ""}`;
  }, [idx, queue.length, current?.reason]);

  async function handleCoach(q: string) {
    if (!current || !skill || !config.coach) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const historySnapshot = coachMsgs;
    setCoachBusy(true);
    setCoachMsgs((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: "" },
    ]);
    try {
      const reply = await askCoach(
        state.settings,
        {
          item: current.item,
          skillTitle: skill.title,
          skillObjective: skill.objective,
          attempt: answer,
          hintLevel,
        },
        q,
        historySnapshot,
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
        if (last?.role === "assistant" && (!last.content || last.content.length < reply.length)) {
          copy[copy.length - 1] = { role: "assistant", content: reply };
        }
        return copy;
      });
    } catch (e) {
      setCoachMsgs((m) => {
        const copy = [...m];
        const msg = `Coach unavailable: ${e instanceof Error ? e.message : String(e)}. Is Ollama running?`;
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

  function submit() {
    if (!current || locked) return;
    const result = gradeAnswer(current.item, answer);
    setFeedback(result.feedback);
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
        itemId: current.item.id,
        skillId: current.item.skillId,
        correct: result.correct,
        revealed,
        hintLevel,
        answerGiven: answer,
        at: Date.now(),
      },
      grade,
    );
    if (config.trackExamScore) {
      examResultsRef.current.push({
        weight: defaultExamWeight(current.item.examWeight),
        correct: result.correct,
      });
    }
  }

  function next() {
    if (idx + 1 >= queue.length) {
      if (config.trackExamScore) {
        const pct = scoreExamAttempt(examResultsRef.current);
        pushExamScore(pct);
        setExamPct(pct);
      }
      if (config.countSession) {
        completeSession();
      }
      const nowMastered = Object.values(state.skills).filter((s) => s.mastered).length;
      const delta = Math.max(0, nowMastered - startMastered.current);
      setAdvancedNote(
        delta > 0
          ? `${delta} skill${delta === 1 ? "" : "s"} newly mastered this session`
          : "Progress saved",
      );
      setDone(true);
      setIdx(queue.length);
      config.onComplete?.();
      return;
    }
    setIdx((i) => i + 1);
    resetItemUi();
  }

  function restart() {
    setSessionGen((g) => g + 1);
  }

  if (!queue.length && !done) {
    return (
      <p className="font-mono text-sm text-[var(--color-mist)] animate-pulse-soft">
        Building session…
      </p>
    );
  }

  if (done || idx >= queue.length) {
    return (
      <div className="border-b border-[var(--color-panel-2)] pb-6 animate-rise">
        <h3 className="font-display text-2xl text-[var(--color-ink)]">Session complete</h3>
        {examPct !== null && (
          <p className="mt-2 font-mono text-[var(--color-brass)]">Exam score: {examPct}%</p>
        )}
        {advancedNote && (
          <p className="mt-2 text-[var(--color-ink)] text-sm">{advancedNote}</p>
        )}
        <p className="mt-2 text-[var(--color-mist)] text-sm">
          {state.goalMetToday
            ? `Daily goal met · ${state.streak}-day streak`
            : `${state.streak}-day streak`}
        </p>
        <p className="mt-1 font-mono text-xs text-[var(--color-brass)]">
          {nextMilestone(state)}
        </p>
        <button
          type="button"
          className="mt-4 font-mono text-sm text-[var(--color-ink)] underline underline-offset-2"
          onClick={restart}
        >
          New session
        </button>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="border border-[var(--color-panel-2)] bg-[var(--color-panel)] rounded-sm p-5 md:p-6 animate-rise">
      <div className="flex justify-between items-baseline gap-3 mb-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)]">
          {skill?.title ?? current.item.skillId}
        </p>
        <p className="font-mono text-[10px] text-[var(--color-mist)]">{progressLabel}</p>
      </div>
      <div className="text-lg leading-relaxed text-[var(--color-ink)]">
        <MathText text={current.item.prompt} />
      </div>
      {current.item.fadePrompt && (
        <p className="mt-2 font-mono text-xs text-[var(--color-mist)]">
          {current.item.fadePrompt}
        </p>
      )}

      {itemHasInteraction(current.item) ? (
        <div className="mt-5">
          <InteractionHost
            spec={current.item.interaction}
            value={answer}
            onChange={setAnswer}
            disabled={locked}
          />
        </div>
      ) : current.item.answerType === "choice" && current.item.choices ? (
        <div className="mt-5 flex flex-col gap-2">
          {current.item.choices.map((c) => (
            <button
              key={c}
              type="button"
              disabled={locked}
              onClick={() => setAnswer(c)}
              className={`text-left px-3 py-2 rounded-sm border font-mono text-sm transition ${
                answer === c
                  ? "border-[var(--color-ink)] bg-[var(--color-paper)]"
                  : "border-[var(--color-panel-2)] hover:border-[var(--color-mist)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : (
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={locked}
          placeholder="Your answer"
          className="mt-5 w-full bg-[var(--color-paper)] border border-[var(--color-panel-2)] rounded-sm px-3 py-3 font-mono text-sm outline-none focus:border-[var(--color-ink)] disabled:opacity-60"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {!locked ? (
          <button
            type="button"
            onClick={submit}
            className="px-4 py-2 bg-[var(--color-ink)] text-[var(--color-on-accent)] font-mono text-sm rounded-sm active:scale-[0.98] transition-transform"
          >
            Check
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            className="px-4 py-2 bg-[var(--color-good)] text-[var(--color-on-accent)] font-mono text-sm rounded-sm active:scale-[0.98] transition-transform"
          >
            Continue
          </button>
        )}
      </div>

      {feedback && (
        <p
          className={`mt-3 font-mono text-sm ${
            feedback.startsWith("Correct")
              ? "text-[var(--color-good)] animate-success-pop"
              : "text-[var(--color-bad)] animate-shake"
          }`}
        >
          <MathText text={feedback} />
        </p>
      )}

      {config.hints && (
        <HintLadderPanel
          hints={current.item.hints}
          level={hintLevel}
          revealCost
          onEscalate={() => setHintLevel((h) => Math.min(4, h + 1))}
        />
      )}

      <CoachPanel
        enabled={config.coach}
        busy={coachBusy}
        messages={coachMsgs}
        onAsk={handleCoach}
      />
    </div>
  );
}

export function TodaySession() {
  const { state } = useApp();
  const stateRef = useRef(state);
  stateRef.current = state;
  const size = state.settings.sessionSize;
  const config: SessionConfig = useMemo(
    () => ({
      coach: true,
      hints: true,
      trackExamScore: false,
      countSession: true,
      buildQueue: () => buildTodayQueue(stateRef.current, size),
    }),
    [size],
  );
  return <SessionRunner config={config} />;
}

export function ExamSession() {
  const config: SessionConfig = useMemo(
    () => ({
      coach: false,
      hints: false,
      trackExamScore: true,
      countSession: true,
      buildQueue: () => buildExamQueue(EXAM_SIZE),
    }),
    [],
  );
  return <SessionRunner config={config} />;
}

export function DiagnosticSession({ onFinished }: { onFinished: () => void }) {
  const config: SessionConfig = useMemo(
    () => ({
      coach: true,
      hints: true,
      trackExamScore: false,
      countSession: true,
      buildQueue: () => buildDiagnosticQueue(),
      onComplete: onFinished,
    }),
    [onFinished],
  );
  return <SessionRunner config={config} />;
}

/** Topic-scoped practice for a Course lesson. */
export function SkillSession({ skillId }: { skillId: string }) {
  const { state } = useApp();
  const stateRef = useRef(state);
  stateRef.current = state;
  const config: SessionConfig = useMemo(
    () => ({
      coach: true,
      hints: true,
      trackExamScore: false,
      countSession: true,
      buildQueue: () => buildSkillQueue(skillId, stateRef.current, 8),
    }),
    [skillId],
  );
  return <SessionRunner key={skillId} config={config} />;
}
