import { useMemo, useState } from "react";
import { ArrowRight, Check, Lightbulb } from "lucide-react";
import type { PrimerItem } from "@/types/primer";
import { gradePrimerAnswer } from "@/lib/primerGrade";
import { MathText } from "@/components/MathText";
import { MathInput } from "./MathInput";
import { ClickFill } from "./ClickFill";

export interface PrimerAttemptResult {
  itemId: string;
  kind: PrimerItem["kind"];
  correct: boolean;
  usedHint: boolean;
  revealed: boolean;
}

type Result = "clean" | "hinted" | "revealed" | null;

const KIND_LABEL: Record<PrimerItem["kind"], string> = {
  learn: "Example",
  guided: "Guided",
  drill: "Drill",
  mix: "Mixed",
  mastery: "Mastery",
};

const HINT_LABELS = ["Nudge", "Technique", "Next step", "Full solution"] as const;

export function PrimerPractice({
  items,
  onAttempt,
  onComplete,
}: {
  items: PrimerItem[];
  onAttempt: (attempt: PrimerAttemptResult) => void;
  onComplete: (results: PrimerAttemptResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [hintLevel, setHintLevel] = useState(0);
  const [results, setResults] = useState<Result[]>(() =>
    items.map(() => null),
  );
  const [recorded, setRecorded] = useState(false);

  const item = items[index];
  const result = results[index];
  const last = index === items.length - 1;

  const hint = useMemo(() => {
    if (hintLevel <= 0) return null;
    const level = Math.min(hintLevel, 4);
    const text =
      level === 1
        ? item.hints.nudge
        : level === 2
          ? item.hints.technique
          : level === 3
            ? item.hints.nextStep
            : item.hints.fullSolution;
    return { level, label: HINT_LABELS[level - 1], text };
  }, [hintLevel, item]);

  function reset(nextIndex: number) {
    setIndex(nextIndex);
    setAnswer("");
    setStatus("idle");
    setHintLevel(0);
    setRecorded(false);
  }

  function check(raw?: string) {
    if (status === "correct") return;
    const student = (raw ?? answer).trim();
    if (!student) return;
    const graded = gradePrimerAnswer(item, student);
    if (graded.correct) {
      setStatus("correct");
      if (!recorded) {
        onAttempt({
          itemId: item.id,
          kind: item.kind,
          correct: true,
          usedHint: hintLevel > 0,
          revealed: hintLevel >= 4,
        });
        setRecorded(true);
      }
    } else {
      setStatus("wrong");
      setHintLevel((n) => Math.min(4, n + 1));
      onAttempt({
        itemId: item.id,
        kind: item.kind,
        correct: false,
        usedHint: true,
        revealed: hintLevel + 1 >= 4,
      });
    }
  }

  function next() {
    const finished: Result =
      status === "correct"
        ? hintLevel > 0
          ? "hinted"
          : "clean"
        : "revealed";
    const updated = [...results];
    updated[index] = finished;
    setResults(updated);

    if (last) {
      const history: PrimerAttemptResult[] = items.map((it, i) => {
        const state = updated[i] ?? "revealed";
        return {
          itemId: it.id,
          kind: it.kind,
          correct: state === "clean" || state === "hinted",
          usedHint: state !== "clean",
          revealed: state === "revealed",
        };
      });
      onComplete(history);
      return;
    }
    reset(index + 1);
  }

  const canMoveOn = status === "correct" || hintLevel >= 4;
  const isChoice = item.answerType === "choice";
  const isClickFill = item.answerType === "clickFill";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {items.map((it, i) => {
            const r = results[i];
            return (
              <span
                key={it.id}
                title={`${i + 1}. ${KIND_LABEL[it.kind]}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-5 bg-[var(--accent)]"
                    : r === "clean"
                      ? "w-1.5 bg-[var(--success)]"
                      : r === "hinted"
                        ? "w-1.5 bg-[var(--streak)]"
                        : r === "revealed"
                          ? "w-1.5 bg-[var(--line-2)]"
                          : "w-1.5 bg-[var(--line)]"
                }`}
              />
            );
          })}
        </div>
        <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
          {KIND_LABEL[item.kind]} · {index + 1}/{items.length}
        </p>
      </div>

      {!isClickFill && (
        <div className="space-y-2">
          <p className="text-[17px] font-medium leading-relaxed text-[var(--ink-1)]">
            <MathText text={item.prompt} />
          </p>
          {item.fadePrompt && (
            <p className="text-[12px] text-[var(--ink-2)]">
              <MathText text={item.fadePrompt} />
            </p>
          )}
        </div>
      )}

      {isChoice ? (
        <div className="flex flex-wrap gap-2">
          {item.choices?.map((choice) => {
            const selected = answer === choice;
            const right = status === "correct" && selected;
            return (
              <button
                key={choice}
                type="button"
                disabled={status === "correct"}
                onClick={() => {
                  setAnswer(choice);
                  check(choice);
                }}
                className={`rounded-[var(--r-pill)] border px-3 py-1.5 text-[13px] transition-colors ${
                  right
                    ? "border-[var(--success)] bg-[var(--success-weak)] text-[var(--success)]"
                    : selected
                      ? "border-[var(--ink-1)] bg-[var(--accent)] text-[var(--on-accent)]"
                      : "border-[var(--line)] bg-[var(--card)] text-[var(--ink-1)] hover:border-[var(--line-2)]"
                }`}
              >
                <MathText text={choice} />
              </button>
            );
          })}
        </div>
      ) : isClickFill ? (
        <ClickFill
          prompt={item.prompt}
          choices={item.choices ?? []}
          value={answer}
          onChange={setAnswer}
          locked={status === "correct"}
          correctAnswer={item.answer}
          wasCorrect={status === "correct"}
        />
      ) : (
        <MathInput
          value={answer}
          onChange={setAnswer}
          onSubmit={() => check()}
          disabled={status === "correct"}
          placeholder={
            item.answerType === "tuple"
              ? "Comma-separated, e.g. 1,2,3"
              : "Your answer"
          }
        />
      )}

      {status === "wrong" && (
        <p className="text-[12px] text-[var(--ink-2)]">Not yet.</p>
      )}
      {status === "correct" && (
        <p className="inline-flex items-center gap-1.5 text-[12px] text-[var(--success)]">
          <Check size={13} /> Correct.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {!isChoice && !isClickFill && status !== "correct" && (
          <button
            type="button"
            onClick={() => check()}
            className="rounded-[var(--r-pill)] bg-[var(--accent)] px-4 py-2 text-[13px] text-[var(--on-accent)] disabled:opacity-40"
            disabled={!answer.trim()}
          >
            Check
          </button>
        )}
        {isClickFill && status !== "correct" && (
          <button
            type="button"
            onClick={() => check()}
            className="rounded-[var(--r-pill)] bg-[var(--accent)] px-4 py-2 text-[13px] text-[var(--on-accent)] disabled:opacity-40"
            disabled={!answer.trim()}
          >
            Check
          </button>
        )}
        {status !== "correct" && hintLevel < 4 && (
          <button
            type="button"
            onClick={() => setHintLevel((n) => Math.min(4, n + 1))}
            className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] hover:bg-[var(--accent-weak)]"
          >
            <Lightbulb size={13} />
            {hintLevel === 0 ? "Stuck?" : "More"}
          </button>
        )}
        {canMoveOn && (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-[var(--accent)] px-4 py-2 text-[13px] text-[var(--on-accent)]"
          >
            {last ? "Finish" : "Next"}
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      {hint && status !== "correct" && (
        <div className="rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--bg-sub)] px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">
            {hint.label}
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--ink-2)]">
            <MathText text={hint.text} />
          </p>
          {hint.level === 4 && result === null && (
            <p className="mt-2 text-[11px] text-[var(--ink-3)]">
              Full solution shown. Move on when ready.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
