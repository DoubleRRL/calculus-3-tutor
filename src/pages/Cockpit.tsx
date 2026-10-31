import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { useCourse } from "@/state/CourseContext";
import { progressFor } from "@/lib/courseStore";
import type { TopicStatus } from "@/types/course";
import { Card, Icon } from "@/ui";
import {
  ChapterBadge,
  STATUS_LABEL,
  StatusDot,
  TopicChip,
} from "@/components/course/TopicChip";

type Filter = "all" | "learning" | "done" | "new";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "learning", label: "Learning" },
  { id: "done", label: "Done" },
  { id: "new", label: "Not started" },
];

function statusOf(
  course: ReturnType<typeof useCourse>["course"],
  id: string,
): TopicStatus {
  return progressFor(course, id).status;
}

export function CockpitPage() {
  const { course, topics, chapters, coverage, issues } = useCourse();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = {
    all: coverage.total,
    learning: coverage.learning,
    done: coverage.done,
    new: coverage.unseen,
  } as Record<Filter, number>;

  const recent = useMemo(
    () =>
      topics
        .map((t) => ({ topic: t, progress: progressFor(course, t.id) }))
        .filter((x) => x.progress.lastAt !== null)
        .sort((a, b) => (b.progress.lastAt ?? 0) - (a.progress.lastAt ?? 0))
        .slice(0, 4),
    [topics, course],
  );

  const filtered = useMemo(() => {
    if (filter === "all") return [];
    return topics.filter((t) => {
      const status = statusOf(course, t.id);
      if (filter === "done") return status === "solid" || status === "known";
      if (filter === "learning") return status === "learning";
      return status === "unseen";
    });
  }, [filter, topics, course]);

  const errorIssues = issues.filter((i) => i.level === "error");

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-wide text-[var(--ink-3)]">
            {course.config.textbook}
          </p>
          <h1 className="text-[24px] font-medium text-[var(--ink-1)] mt-1">
            {course.config.name}
          </h1>
        </div>
        <Link
          to="/setup"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-[var(--line-2)] px-3 py-2 text-[12px] text-[var(--ink-1)] hover:bg-[var(--accent-weak)]"
        >
          <Icon icon={SlidersHorizontal} size={14} />
          Course setup
        </Link>
      </header>

      <Card className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[14px] text-[var(--ink-1)]">
            <span className="text-[24px] font-medium">{coverage.done}</span>
            <span className="text-[var(--ink-3)]"> / {coverage.total} topics solid</span>
          </p>
          <p className="text-[12px] text-[var(--ink-3)]">
            {coverage.learning} learning · {coverage.unseen} untouched
          </p>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--line)] overflow-hidden flex">
          <div
            className="h-full bg-[var(--success)]"
            style={{ width: `${coverage.pct}%` }}
          />
          <div
            className="h-full bg-[var(--streak)]"
            style={{
              width: `${
                coverage.total
                  ? Math.round((100 * coverage.learning) / coverage.total)
                  : 0
              }%`,
            }}
          />
        </div>
      </Card>

      {errorIssues.length > 0 && (
        <Link to="/setup" className="block">
          <Card className="border-[var(--error)]/40 bg-[var(--error-weak)]">
            <p className="text-[13px] text-[var(--ink-1)]">
              Course setup needs attention
            </p>
            <p className="text-[12px] text-[var(--ink-2)] mt-0.5">
              {errorIssues[0]?.message}
            </p>
          </Card>
        </Link>
      )}

      {recent.length > 0 && filter === "all" && (
        <section className="space-y-3">
          <h2 className="text-[13px] font-medium text-[var(--ink-2)]">
            Recently touched
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {recent.map(({ topic, progress }) => (
              <Link
                key={topic.id}
                to={`/topic/${topic.id}`}
                className="rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-2.5 py-2 hover:border-[var(--line-2)]"
              >
                <div className="flex items-center gap-1.5">
                  <StatusDot status={progress.status} />
                  <span className="font-mono text-[11px] text-[var(--ink-3)]">
                    {topic.id}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-tight text-[var(--ink-1)] line-clamp-2">
                  {topic.title}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-[var(--r-pill)] px-3 py-1.5 text-[12px] border transition-colors ${
                active
                  ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent"
                  : "bg-transparent text-[var(--ink-2)] border-[var(--line)] hover:bg-[var(--accent-weak)]"
              }`}
            >
              {f.label}
              <span className={active ? "opacity-70" : "text-[var(--ink-3)]"}>
                {" "}
                {counts[f.id]}
              </span>
            </button>
          );
        })}
      </div>

      {filter === "all" ? (
        <div className="space-y-4">
          {chapters.map((chapter) => {
            const stats = {
              done: chapter.topics.filter((t) => {
                const s = statusOf(course, t.id);
                return s === "solid" || s === "known";
              }).length,
              total: chapter.topics.length,
            };
            return (
              <section key={chapter.number} className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <ChapterBadge number={chapter.number} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[14px] font-medium text-[var(--ink-1)] truncate">
                      {chapter.title}
                    </h2>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-[var(--ink-3)]">
                    {stats.done}/{stats.total}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {chapter.topics.map((topic) => (
                    <TopicChip
                      key={topic.id}
                      topic={topic}
                      status={statusOf(course, topic.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="space-y-2">
          <p className="text-[12px] text-[var(--ink-3)]">
            {filtered.length} {filtered.length === 1 ? "topic" : "topics"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map((topic) => (
              <TopicChip
                key={topic.id}
                topic={topic}
                status={statusOf(course, topic.id)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <Card>
              <p className="text-[13px] text-[var(--ink-2)]">
                Nothing here right now.
              </p>
            </Card>
          )}
        </section>
      )}

      {topics.length === 0 && (
        <Card className="space-y-2">
          <p className="text-[14px] text-[var(--ink-1)]">No sections included.</p>
          <Link
            to="/setup"
            className="inline-block text-[13px] underline underline-offset-4 text-[var(--ink-1)]"
          >
            Course setup
          </Link>
        </Card>
      )}

      <footer className="flex flex-wrap gap-3 pt-2 pb-4">
        {(["unseen", "learning", "solid", "known"] as TopicStatus[]).map((s) => (
          <span
            key={s}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-3)]"
          >
            <StatusDot status={s} />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </footer>
    </div>
  );
}
