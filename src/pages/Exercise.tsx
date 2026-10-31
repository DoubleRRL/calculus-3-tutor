import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, X } from "lucide-react";
import { useCourse } from "@/state/CourseContext";
import { useBookSection, bookAsset } from "@/lib/book";
import { progressFor } from "@/lib/courseStore";
import { Button, Card, Icon } from "@/ui";

export function ExercisePage() {
  const { topicId, number } = useParams();
  const { course, topics, recordExercise } = useCourse();
  const { section, loading } = useBookSection(topicId);
  const [showAnswer, setShowAnswer] = useState(false);
  const n = Number(number);

  useEffect(() => {
    setShowAnswer(false);
  }, [n]);

  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return <Navigate to="/" replace />;

  const list = section?.exercises ?? [];
  const index = list.findIndex((e) => e.number === n);
  const exercise = index >= 0 ? list[index] : undefined;
  const prev = index > 0 ? list[index - 1] : undefined;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;
  const progress = progressFor(course, topic.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/topic/${topic.id}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-1)]"
        >
          <Icon icon={ArrowLeft} size={14} />
          {topic.id} {topic.title}
        </Link>
        <div className="mt-4 flex items-baseline justify-between gap-3">
          <div>
            <p className="text-[12px] uppercase tracking-wide text-[var(--ink-3)]">
              Exercise {n}
            </p>
            <h1 className="text-[24px] font-medium text-[var(--ink-1)]">
              {topic.title}
            </h1>
          </div>
          <span className="font-mono text-[11px] text-[var(--ink-3)]">
            {index + 1}/{list.length}
          </span>
        </div>
      </div>

      {loading && (
        <Card>
          <p className="text-[13px] text-[var(--ink-3)]">Loading…</p>
        </Card>
      )}

      {!loading && !exercise && (
        <Card className="space-y-2">
          <p className="text-[14px] text-[var(--ink-1)]">
            Exercise {number} isn't in the imported set.
          </p>
          <Link
            to={`/topic/${topic.id}`}
            className="text-[13px] underline underline-offset-4"
          >
            Back to the topic
          </Link>
        </Card>
      )}

      {exercise && (
        <>
          <div className="rounded-[var(--r-card)] border border-[var(--line)] bg-white p-2 overflow-hidden">
            <img
              src={bookAsset(exercise.image)}
              alt={`Exercise ${exercise.number}`}
              className="w-full h-auto"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="success"
              onClick={() => recordExercise(topic.id, exercise.number, true)}
            >
              <Icon icon={Check} size={14} />
              Got it
            </Button>
            <Button
              variant="ghost"
              onClick={() => recordExercise(topic.id, exercise.number, false)}
            >
              <Icon icon={X} size={14} />
              Missed it
            </Button>
            {exercise.answerImage && (
              <Button variant="ghost" onClick={() => setShowAnswer((v) => !v)}>
                {showAnswer ? "Hide answer" : "Show answer"}
              </Button>
            )}
          </div>

          <p className="text-[12px] text-[var(--ink-3)]">
            {progress.attempts} attempts · {progress.cleanStreak} clean in a row
          </p>

          {showAnswer && exercise.answerImage && (
            <div className="space-y-1.5">
              <p className="text-[12px] font-medium text-[var(--ink-2)]">
                Book answer
              </p>
              <div className="rounded-[var(--r-card)] border border-[var(--line)] bg-white p-2 overflow-hidden">
                <img
                  src={bookAsset(exercise.answerImage)}
                  alt={`Answer to exercise ${exercise.number}`}
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <a
              href={bookAsset(exercise.pageImage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
            >
              <Icon icon={BookOpen} size={14} />
              Full page {exercise.page}
            </a>
            <div className="flex items-center gap-3">
              {prev && (
                <Link
                  to={`/topic/${topic.id}/exercise/${prev.number}`}
                  className="inline-flex items-center gap-1 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
                >
                  <Icon icon={ArrowLeft} size={14} />
                  {prev.number}
                </Link>
              )}
              {next && (
                <Link
                  to={`/topic/${topic.id}/exercise/${next.number}`}
                  className="inline-flex items-center gap-1 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
                >
                  {next.number}
                  <Icon icon={ArrowRight} size={14} />
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
