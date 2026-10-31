import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardCopy } from "lucide-react";
import { useBookSection, bookAsset } from "@/lib/book";
import { progressForExercise } from "@/lib/courseStore";
import { useCourse } from "@/state/CourseContext";
import { Card, Icon } from "@/ui";

export function TopicExercises({ topicId }: { topicId: string }) {
  const { course } = useCourse();
  const { section, loading } = useBookSection(topicId);
  const [oddOnly, setOddOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  const attempted = useMemo(() => {
    if (!section) return 0;
    return section.exercises.filter(
      (e) => progressForExercise(course, topicId, e.number),
    ).length;
  }, [section, course, topicId]);

  const exercises = useMemo(() => {
    const all = section?.exercises ?? [];
    return oddOnly ? all.filter((e) => e.number % 2 === 1) : all;
  }, [section, oddOnly]);

  if (loading) {
    return (
      <Card className="space-y-2">
        <h2 className="text-[13px] font-medium text-[var(--ink-2)]">
          Book exercises
        </h2>
        <p className="text-[12px] text-[var(--ink-3)]">Loading…</p>
      </Card>
    );
  }

  if (!section) {
    const command = `.venv/bin/python tools/book_import/import_book.py --pdf "/path/to/Calculus 9th Ed.pdf" --sections ${topicId}`;
    return (
      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon icon={BookOpen} size={14} />
          <h2 className="text-[13px] font-medium text-[var(--ink-2)]">
            Book exercises
          </h2>
        </div>
        <p className="text-[13px] text-[var(--ink-2)] leading-relaxed">
          No imported exercises for {topicId}.
        </p>
        <pre className="overflow-x-auto rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--bg-sub)] p-3 text-[11px] leading-relaxed text-[var(--ink-2)]">
          {command}
        </pre>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(command);
            setCopied(true);
          }}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
        >
          <Icon icon={ClipboardCopy} size={14} />
          {copied ? "Copied" : "Copy command"}
        </button>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-medium text-[var(--ink-2)]">
            Book exercises
          </h2>
          <p className="text-[12px] text-[var(--ink-3)]">
            {section.exercises.length} problems · {attempted} attempted
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOddOnly((v) => !v)}
          className={`rounded-[var(--r-pill)] border px-2.5 py-1 text-[11px] ${
            oddOnly
              ? "border-[var(--ink-1)] bg-[var(--accent)] text-[var(--on-accent)]"
              : "border-[var(--line)] text-[var(--ink-2)]"
          }`}
        >
          Odd only
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {exercises.map((ex) => {
          const done = progressForExercise(course, topicId, ex.number);
          return (
            <Link
              key={ex.number}
              to={`/topic/${topicId}/exercise/${ex.number}`}
              className="group flex items-start gap-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--card)] p-2.5 hover:border-[var(--line-2)]"
            >
              <span className="mt-0.5 flex shrink-0 items-center gap-1.5 font-mono text-[12px] text-[var(--ink-3)]">
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
                    background: done
                      ? done.cleanStreak > 0
                        ? "var(--success)"
                        : "var(--streak)"
                      : "transparent",
                  }}
                />
                {ex.number}
              </span>
              <span className="min-w-0 flex-1 overflow-hidden rounded-[6px] bg-white">
                <img
                  src={bookAsset(ex.image)}
                  alt={`Exercise ${ex.number}`}
                  loading="lazy"
                  className="w-full h-auto max-h-28 object-contain object-left-top"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
