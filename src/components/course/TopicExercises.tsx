import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, ClipboardCopy } from "lucide-react";
import { useBookSection, bookAsset } from "@/lib/book";
import { progressForExercise } from "@/lib/courseStore";
import { useCourse } from "@/state/CourseContext";
import { Icon } from "@/ui";

export function TopicExercises({
  topicId,
  open,
  onToggle,
}: {
  topicId: string;
  open: boolean;
  onToggle: () => void;
}) {
  const { course } = useCourse();
  const { section, loading } = useBookSection(topicId);
  const [oddOnly, setOddOnly] = useState(false);
  const [copied, setCopied] = useState(false);

  const attempted = useMemo(() => {
    if (!section) return 0;
    return section.exercises.filter(
      (exercise) => progressForExercise(course, topicId, exercise.number),
    ).length;
  }, [section, course, topicId]);

  const exercises = useMemo(() => {
    const all = section?.exercises ?? [];
    return oddOnly ? all.filter((exercise) => exercise.number % 2 === 1) : all;
  }, [section, oddOnly]);

  const command = `.venv/bin/python tools/book_import/import_book.py --pdf "/path/to/Calculus 9th Ed.pdf" --sections ${topicId}`;

  const countLabel = loading
    ? "Loading…"
    : section
      ? `${section.exercises.length} problems · ${attempted} attempted`
      : "Not imported";

  return (
    <div className="rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon icon={BookOpen} size={14} className="shrink-0 text-[var(--ink-3)]" />
          <span className="min-w-0">
            <span className="block text-[13px] font-medium text-[var(--ink-2)]">
              Book exercises
            </span>
            <span className="mt-0.5 block text-[11px] text-[var(--ink-3)]">
              {countLabel}
            </span>
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-[var(--ink-3)]">
          {open ? "Hide" : "Show"}
          <Icon
            icon={ChevronDown}
            size={14}
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-[var(--line)] px-4 py-4">
          {loading && (
            <p className="text-[12px] text-[var(--ink-3)]">Loading…</p>
          )}

          {!loading && !section && (
            <>
              <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
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
            </>
          )}

          {section && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-[12px] text-[var(--ink-3)]">
                  {exercises.length} shown
                </p>
                <button
                  type="button"
                  onClick={() => setOddOnly((value) => !value)}
                  className={`rounded-[var(--r-pill)] border px-2.5 py-1 text-[11px] ${
                    oddOnly
                      ? "border-[var(--ink-1)] bg-[var(--accent)] text-[var(--on-accent)]"
                      : "border-[var(--line)] text-[var(--ink-2)]"
                  }`}
                >
                  Odd only
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {exercises.map((exercise) => {
                  const done = progressForExercise(
                    course,
                    topicId,
                    exercise.number,
                  );
                  return (
                    <Link
                      key={exercise.number}
                      to={`/topic/${topicId}/exercise/${exercise.number}`}
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
                        {exercise.number}
                      </span>
                      <span className="min-w-0 flex-1 overflow-hidden rounded-[6px] bg-white">
                        <img
                          src={bookAsset(exercise.thumbImage ?? exercise.image)}
                          alt={`Exercise ${exercise.number}`}
                          loading="lazy"
                          className="h-auto max-h-28 w-full object-contain object-left-top"
                        />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
