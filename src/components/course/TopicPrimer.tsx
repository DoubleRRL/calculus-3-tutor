import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Eye, EyeOff } from "lucide-react";
import type { ResolvedTopic } from "@/types/course";
import { GLOSSARY } from "@/content/glossary";
import { primerForSection, primerItemsForSection } from "@/content/primers";
import { useBookSection } from "@/lib/book";
import { useCourse } from "@/state/CourseContext";
import { Card } from "@/ui";
import { MathText } from "@/components/MathText";
import { PolarRegionDemo } from "./PolarRegionDemo";
import { PrimerPractice, type PrimerAttemptResult } from "./PrimerPractice";

type StoredAttempt = { attempts: number; correct: number; lastAt: number };
type StoredPrimer = {
  items: Record<string, StoredAttempt>;
  completed: boolean;
};

function storageKey(topicId: string): string {
  return `calctutor.primer.v1.${topicId}`;
}

function loadStored(topicId: string): StoredPrimer {
  try {
    const raw = localStorage.getItem(storageKey(topicId));
    if (!raw) return { items: {}, completed: false };
    const parsed = JSON.parse(raw) as Partial<StoredPrimer>;
    return {
      items: parsed.items ?? {},
      completed: Boolean(parsed.completed),
    };
  } catch {
    return { items: {}, completed: false };
  }
}

function saveStored(topicId: string, value: StoredPrimer): void {
  try {
    localStorage.setItem(storageKey(topicId), JSON.stringify(value));
  } catch {
    // Storage full; the primer still works for this session.
  }
}

export function TopicPrimer({
  topicId,
  prereqs,
  onOpenExercises,
}: {
  topicId: string;
  prereqs: ResolvedTopic[];
  onOpenExercises: () => void;
}) {
  const lesson = primerForSection(topicId);
  const items = primerItemsForSection(topicId);
  const { section } = useBookSection(topicId);
  const { course, setStatus } = useCourse();
  const [showSolution, setShowSolution] = useState(false);
  const [stored, setStored] = useState<StoredPrimer>(() => loadStored(topicId));

  const firstAnswered = useMemo(
    () => section?.exercises.find((exercise) => exercise.answerImage)?.number ?? null,
    [section],
  );

  const glossary = useMemo(() => {
    if (!lesson?.glossaryIds) return [];
    const byId = new Map(GLOSSARY.map((entry) => [entry.id, entry]));
    return lesson.glossaryIds
      .map((id) => byId.get(id))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .slice(0, 5);
  }, [lesson]);

  if (!lesson || !items.length) return null;

  const progress = course.progress[topicId];
  const status = progress?.status ?? "unseen";

  function recordAttempt(attempt: PrimerAttemptResult) {
    setStored((prev) => {
      const prior = prev.items[attempt.itemId];
      const next: StoredPrimer = {
        ...prev,
        items: {
          ...prev.items,
          [attempt.itemId]: {
            attempts: (prior?.attempts ?? 0) + 1,
            correct: (prior?.correct ?? 0) + (attempt.correct ? 1 : 0),
            lastAt: Date.now(),
          },
        },
      };
      saveStored(topicId, next);
      return next;
    });

    if (status === "unseen") setStatus(topicId, "learning");
    if (
      attempt.correct &&
      attempt.kind === "mastery" &&
      !attempt.revealed &&
      status !== "known"
    ) {
      setStatus(topicId, "solid");
    }
  }

  function complete(history: PrimerAttemptResult[]) {
    const mastery = history.find((attempt) => attempt.kind === "mastery");
    const clean = Boolean(mastery?.correct && !mastery.revealed);
    setStored((prev) => {
      const next = { ...prev, completed: true };
      saveStored(topicId, next);
      return next;
    });
    if (clean && status !== "known") setStatus(topicId, "solid");
    else if (status === "unseen") setStatus(topicId, "learning");
  }

  return (
    <Card className="space-y-5" padded>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
            Primer
          </p>
          <p className="mt-1 text-[13px] text-[var(--ink-2)]">
            The idea, one worked example, then a short ladder.
          </p>
        </div>
        {stored.completed && (
          <span className="rounded-[var(--r-pill)] border border-[var(--line)] px-2.5 py-1 text-[11px] text-[var(--ink-3)]">
            Completed
          </span>
        )}
      </div>

      {prereqs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[var(--ink-3)]">
          <span>Before this:</span>
          {prereqs.map((prereq) => (
            <Link
              key={prereq.id}
              to={`/topic/${prereq.id}`}
              className="rounded-[var(--r-pill)] border border-[var(--line)] px-2 py-0.5 text-[var(--ink-2)] hover:bg-[var(--accent-weak)]"
            >
              {prereq.id} {prereq.title}
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[18px] font-medium leading-relaxed text-[var(--ink-1)]">
          <MathText text={lesson.eli5} />
        </p>
        {lesson.analogy && (
          <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
            <MathText text={lesson.analogy} />
          </p>
        )}
        {lesson.firstMove && (
          <p className="border-l-2 border-[var(--accent)] pl-3 text-[12px] leading-relaxed text-[var(--ink-2)]">
            <MathText text={lesson.firstMove} />
          </p>
        )}
      </div>

      {lesson.workedExample && (
        <div className="space-y-2 rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--bg-sub)] p-3">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
            {typeof lesson.workedExample === "string"
              ? "Baby example"
              : "Worked example"}
          </p>
          {typeof lesson.workedExample === "string" ? (
            <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
              <MathText text={lesson.workedExample} />
            </p>
          ) : (
            <>
              <p className="text-[14px] font-medium leading-relaxed text-[var(--ink-1)]">
                <MathText text={lesson.workedExample.prompt} />
              </p>
              {showSolution ? (
                <div className="space-y-2">
                  <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
                    <MathText text={lesson.workedExample.solution} />
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSolution(false)}
                    className="inline-flex items-center gap-1.5 text-[11px] text-[var(--ink-3)] underline underline-offset-2"
                  >
                    <EyeOff size={12} /> Hide solution
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSolution(true)}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-2)] underline underline-offset-2"
                >
                  <Eye size={12} /> Show solution
                </button>
              )}
            </>
          )}
        </div>
      )}

      {lesson.demo && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
            Try the region
          </p>
          <PolarRegionDemo goal={lesson.demo.goal} spec={lesson.demo.spec} />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
            Your turn
          </p>
          <p className="text-[11px] text-[var(--ink-3)]">
            {items.length} items · hints are free
          </p>
        </div>
        <PrimerPractice
          items={items}
          onAttempt={recordAttempt}
          onComplete={complete}
        />
      </div>

      {glossary.length > 0 && (
        <div className="space-y-2 border-t border-[var(--line)] pt-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--ink-3)]">
            Key terms
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {glossary.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[var(--r-input)] border border-[var(--line)] px-3 py-2"
              >
                <p className="text-[12px] font-medium text-[var(--ink-1)]">
                  {entry.term}
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--ink-2)]">
                  <MathText text={entry.short} />
                </p>
                {entry.formula && (
                  <p className="mt-1 text-[12px] text-[var(--ink-1)]">
                    <MathText text={entry.formula} />
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-4">
        {firstAnswered !== null ? (
          <Link
            to={`/topic/${topicId}/exercise/${firstAnswered}`}
            className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-[var(--accent)] px-4 py-2 text-[13px] text-[var(--on-accent)]"
          >
            <BookOpen size={13} /> Try the book
            <ArrowRight size={13} />
          </Link>
        ) : (
          <span className="text-[12px] text-[var(--ink-3)]">
            No answered book exercise imported yet.
          </span>
        )}
        <button
          type="button"
          onClick={onOpenExercises}
          className="rounded-[var(--r-pill)] border border-[var(--line)] px-3 py-1.5 text-[12px] text-[var(--ink-2)] hover:bg-[var(--accent-weak)]"
        >
          Full exercise set
        </button>
      </div>
    </Card>
  );
}
