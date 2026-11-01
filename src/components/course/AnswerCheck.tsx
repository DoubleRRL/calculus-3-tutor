import { useEffect, useRef, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { answerTextKey, compareAnswers } from "@/lib/answerCheck";
import { imageToBase64, judgeAnswer, transcribeAnswer } from "@/lib/ollama";
import { Button, Card, Icon } from "@/ui";
import { MathText } from "@/components/MathText";
import { MathInput } from "./MathInput";

type Status = "idle" | "checking" | "correct" | "wrong" | "unknown";

function answerKey(topicId: string, number: number) {
  return `calctutor.answer.v1.${topicId}.${number}`;
}

function loadValue(topicId: string, number: number): string {
  try {
    return localStorage.getItem(answerKey(topicId, number)) ?? "";
  } catch {
    return "";
  }
}

export function AnswerCheck({
  topicId,
  number,
  exerciseImageUrl,
  answerImageUrl,
  onGraded,
  onWrong,
  differentHref,
  differentNumber,
}: {
  topicId: string;
  number: number;
  exerciseImageUrl: string;
  answerImageUrl?: string | null;
  onGraded: (correct: boolean) => void;
  onWrong: (student: string, note?: string) => void;
  differentHref?: string;
  differentNumber?: number;
}) {
  const { state } = useApp();
  const settings = state.settings;
  const [value, setValue] = useState(() => loadValue(topicId, number));
  const [status, setStatus] = useState<Status>("idle");
  const [stage, setStage] = useState<string | null>(null);
  const [note, setNote] = useState<string | undefined>();
  const [fromBook, setFromBook] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const lastChecked = useRef<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(answerKey(topicId, number), value);
    } catch {
      // storage full; the answer just won't survive a reload
    }
  }, [value, topicId, number]);

  const busy = status === "checking";

  const check = async () => {
    const student = value.trim();
    if (!student || busy) return;
    if (lastChecked.current === student && status !== "idle") return;
    lastChecked.current = student;

    setStatus("checking");
    setStage(null);
    setNote(undefined);
    setFromBook(false);

    try {
      let expected = "";
      try {
        expected = localStorage.getItem(answerTextKey(topicId, number)) ?? "";
      } catch {
        expected = "";
      }

      if (!expected && answerImageUrl) {
        setStage("Reading the answer key…");
        const answerBase64 = await imageToBase64(answerImageUrl);
        expected = await transcribeAnswer(settings, answerBase64, number);
        if (expected) {
          try {
            localStorage.setItem(answerTextKey(topicId, number), expected);
          } catch {
            // cache is best-effort
          }
        }
      }

      let verdict: "correct" | "wrong" | "unknown" = "unknown";
      let reason: string | undefined;
      if (expected) {
        setFromBook(true);
        setStage("Checking…");
        const local = await compareAnswers(student, expected);
        verdict = local.verdict;
        reason = local.reason;
      }

      // The local check is fast but literal. When it says no, let the vision
      // model look at the actual key before telling the learner they're wrong.
      if (verdict !== "correct") {
        setStage("Asking the coach…");
        const exerciseBase64 = await imageToBase64(exerciseImageUrl);
        const answerBase64 = answerImageUrl
          ? await imageToBase64(answerImageUrl)
          : undefined;
        const judged = await judgeAnswer(settings, {
          exerciseBase64,
          answerBase64,
          student,
          number,
        });
        if (judged.verdict === "correct") {
          verdict = "correct";
          reason = judged.reason;
        } else if (judged.verdict === "wrong") {
          verdict = "wrong";
          reason = judged.reason ?? reason;
        } else if (verdict === "unknown") {
          reason = judged.reason ?? reason;
        }
      }

      setNote(reason);
      if (verdict === "correct") {
        setStatus("correct");
        onGraded(true);
      } else if (verdict === "wrong") {
        setStatus("wrong");
        onGraded(false);
        onWrong(student, reason);
      } else {
        setStatus("unknown");
        lastChecked.current = null;
      }
    } catch (e) {
      setStatus("unknown");
      setNote(
        e instanceof Error
          ? e.message
          : "Couldn't check that answer. The coach may be offline.",
      );
      lastChecked.current = null;
    } finally {
      setStage(null);
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-medium text-[var(--ink-2)]">
          Your answer
        </h2>
        {fromBook && status !== "idle" && (
          <span className="text-[10px] uppercase tracking-wide text-[var(--ink-3)]">
            Book answer
          </span>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void check();
        }}
        className="space-y-2"
      >
        <MathInput
          value={value}
          onChange={(v) => {
            setValue(v);
            lastChecked.current = null;
            if (status !== "checking") setStatus("idle");
          }}
          onSubmit={() => void check()}
          disabled={busy}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={!value.trim() || busy}>
            {busy ? "Checking…" : "Check"}
          </Button>
          {answerImageUrl && (
            <Button
              variant="ghost"
              onClick={() => setShowAnswer((v) => !v)}
            >
              <Icon icon={showAnswer ? EyeOff : Eye} size={14} />
              {showAnswer ? "Hide answer" : "Show answer"}
            </Button>
          )}
        </div>
      </form>

      {busy && stage && (
        <p className="text-[12px] text-[var(--ink-3)]">{stage}</p>
      )}

      {status === "correct" && (
        <div className="flex items-start gap-2 text-[13px] text-[var(--success)]">
          <Icon icon={Check} size={14} className="mt-0.5 shrink-0" />
          <span>Correct.</span>
        </div>
      )}

      {status === "wrong" && (
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-[13px] text-[var(--error)]">
            <Icon icon={X} size={14} className="mt-0.5 shrink-0" />
            <span>Not yet.</span>
          </div>
          {note && (
            <p className="text-[12px] leading-relaxed text-[var(--ink-2)]">
              <MathText text={note} />
            </p>
          )}
          {differentHref && differentNumber !== undefined && (
            <Link
              to={differentHref}
              className="inline-block text-[12px] text-[var(--ink-2)] underline underline-offset-4 hover:text-[var(--ink-1)]"
            >
              Try a different one: {differentNumber}
            </Link>
          )}
        </div>
      )}

      {status === "unknown" && (
        <div className="space-y-1">
          <p className="text-[13px] text-[var(--ink-2)]">
            Couldn't verify this one.
          </p>
          {note && (
            <p className="text-[12px] text-[var(--ink-3)]">
              <MathText text={note} />
            </p>
          )}
        </div>
      )}

      {showAnswer && answerImageUrl && (
        <div className="space-y-1.5">
          <p className="text-[12px] font-medium text-[var(--ink-2)]">
            Book answer
          </p>
          <div className="overflow-hidden rounded-[var(--r-card)] border border-[var(--line)] bg-white p-2">
            <img
              src={answerImageUrl}
              alt={`Answer to exercise ${number}`}
              className="h-auto w-full"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
