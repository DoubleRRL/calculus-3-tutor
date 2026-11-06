import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useCourse } from "@/state/CourseContext";
import { progressFor } from "@/lib/courseStore";
import type { TopicStatus } from "@/types/course";
import { Card, Icon } from "@/ui";
import { STATUS_LABEL, StatusDot } from "@/components/course/TopicChip";
import { TopicExercises } from "@/components/course/TopicExercises";
import { TopicPrimer } from "@/components/course/TopicPrimer";
import { primerForSection } from "@/content/primers";

const STATUS_ORDER: TopicStatus[] = ["unseen", "learning", "solid", "known"];

export function TopicSheetPage() {
  const { topicId } = useParams();
  const { course, topics, setStatus, setNote } = useCourse();
  const topic = topics.find((t) => t.id === topicId);
  const initialProgress = topic ? progressFor(course, topic.id) : null;
  const [exercisesOpen, setExercisesOpen] = useState(
    () => initialProgress?.status !== "unseen",
  );

  useEffect(() => {
    if (topic) {
      setExercisesOpen(progressFor(course, topic.id).status !== "unseen");
    }
    // Only reset when the route's topic changes; a primer attempt changing
    // the status should not slam the exercise grid shut.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.id]);

  if (!topic) return <Navigate to="/" replace />;

  const progress = progressFor(course, topic.id);
  const index = topics.findIndex((t) => t.id === topic.id);
  const prev = index > 0 ? topics[index - 1] : undefined;
  const next = index >= 0 && index < topics.length - 1 ? topics[index + 1] : undefined;
  const prereqs = topic.prereqs
    .map((id) => topics.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const hasPrimer = Boolean(primerForSection(topic.id));

  function openExercises() {
    setExercisesOpen(true);
    window.requestAnimationFrame(() => {
      document.getElementById("book-exercises")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="space-y-7">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-1)]"
        >
          <Icon icon={ArrowLeft} size={14} />
          All topics
        </Link>
        <p className="mt-4 text-[12px] uppercase tracking-wide text-[var(--ink-3)]">
          <Link to={`/chapter/${topic.chapter}`} className="hover:text-[var(--ink-1)]">
            Chapter {topic.chapter}
          </Link>
          {" · "}
          {topic.id}
        </p>
        <h1 className="mt-1 text-[24px] font-medium text-[var(--ink-1)]">
          {topic.title}
        </h1>
        <p className="mt-2 text-[14px] text-[var(--ink-2)] leading-relaxed">
          {topic.blurb}
        </p>
      </div>

      <TopicPrimer
        key={topic.id}
        topicId={topic.id}
        prereqs={prereqs}
        onOpenExercises={openExercises}
      />

      <section className="space-y-2">
        <h2 className="text-[13px] font-medium text-[var(--ink-2)]">Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_ORDER.map((status) => {
            const active = progress.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatus(topic.id, status)}
                className={`flex items-center gap-2 rounded-[10px] border px-3 py-2.5 text-left text-[13px] transition-colors ${
                  active
                    ? "border-[var(--ink-1)] bg-[var(--accent)] text-[var(--on-accent)]"
                    : "border-[var(--line)] bg-[var(--card)] text-[var(--ink-1)] hover:border-[var(--line-2)]"
                }`}
              >
                <StatusDot status={status} />
                {STATUS_LABEL[status]}
              </button>
            );
          })}
        </div>
      </section>

      <section id="book-exercises" className="scroll-mt-6">
        <TopicExercises
          topicId={topic.id}
          open={exercisesOpen}
          onToggle={() => setExercisesOpen((value) => !value)}
        />
      </section>

      <Card className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-medium text-[var(--ink-2)]">Notes</h2>
        </div>
        <textarea
          value={progress.note}
          onChange={(e) => setNote(topic.id, e.target.value)}
          placeholder="What tripped you up here? A formula worth remembering? Your own worked example?"
          rows={5}
          className="w-full resize-y rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[13px] leading-relaxed text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--line-2)]"
        />
      </Card>

      {((!hasPrimer && prereqs.length > 0) || progress.attempts > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {!hasPrimer && prereqs.length > 0 && (
            <Card className="space-y-2">
              <h2 className="text-[13px] font-medium text-[var(--ink-2)]">
                Builds on
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {prereqs.map((prereq) => (
                  <Link
                    key={prereq.id}
                    to={`/topic/${prereq.id}`}
                    className="rounded-[var(--r-pill)] border border-[var(--line)] px-2.5 py-1 text-[12px] text-[var(--ink-2)] hover:bg-[var(--accent-weak)]"
                  >
                    {prereq.id} {prereq.title}
                  </Link>
                ))}
              </div>
            </Card>
          )}
          {progress.attempts > 0 && (
            <Card className="space-y-1">
              <h2 className="text-[13px] font-medium text-[var(--ink-2)]">
                This topic
              </h2>
              <p className="text-[12px] text-[var(--ink-2)]">
                {progress.attempts} attempt{progress.attempts === 1 ? "" : "s"} ·{" "}
                {progress.cleanStreak} clean in a row
              </p>
              {progress.lastAt && (
                <p className="text-[12px] text-[var(--ink-3)]">
                  Last touched {new Date(progress.lastAt).toLocaleDateString()}
                </p>
              )}
            </Card>
          )}
        </div>
      )}

      <nav className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        {prev ? (
          <Link
            to={`/topic/${prev.id}`}
            className="min-w-0 inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
          >
            <Icon icon={ArrowLeft} size={14} />
            <span className="truncate">
              {prev.id} {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to={`/topic/${next.id}`}
            className="min-w-0 inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)] text-right"
          >
            <span className="truncate">
              {next.id} {next.title}
            </span>
            <Icon icon={ArrowRight} size={14} />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
