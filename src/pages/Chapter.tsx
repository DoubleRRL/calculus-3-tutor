import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useCourse } from "@/state/CourseContext";
import { progressFor } from "@/lib/courseStore";
import { guideForChapter } from "@/content/chapterGuides";
import { Card, Icon } from "@/ui";
import { ChapterBadge, StatusDot } from "@/components/course/TopicChip";
import type { TopicStatus } from "@/types/course";

export function ChapterPage() {
  const { number } = useParams();
  const { course, chapters } = useCourse();
  const chapter = chapters.find((c) => String(c.number) === number);

  if (!chapter) return <Navigate to="/" replace />;

  const guide = guideForChapter(chapter.number);
  const done = chapter.topics.filter((t) => {
    const s = progressFor(course, t.id).status;
    return s === "solid" || s === "known";
  }).length;

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
        <div className="mt-4 flex items-center gap-3">
          <ChapterBadge number={chapter.number} />
          <p className="text-[12px] uppercase tracking-wide text-[var(--ink-3)]">
            Chapter {chapter.number} · {done}/{chapter.topics.length} solid
          </p>
        </div>
        <h1 className="mt-2 text-[24px] font-medium text-[var(--ink-1)]">
          {chapter.title}
        </h1>
      </div>

      {guide && (
        <>
          <p className="text-[14px] leading-relaxed text-[var(--ink-2)]">
            {guide.summary}
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <Card className="space-y-1.5">
              <h2 className="text-[12px] font-medium uppercase tracking-wide text-[var(--ink-3)]">
                Where it shows up
              </h2>
              <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
                {guide.applications}
              </p>
            </Card>
            <Card className="space-y-1.5">
              <h2 className="text-[12px] font-medium uppercase tracking-wide text-[var(--ink-3)]">
                Where people lose points
              </h2>
              <ul className="space-y-1.5">
                {guide.pitfalls.map((p) => (
                  <li
                    key={p}
                    className="text-[13px] leading-relaxed text-[var(--ink-2)] pl-3 relative before:content-[''] before:absolute before:left-0 before:top-[7px] before:h-1 before:w-1 before:rounded-full before:bg-[var(--ink-3)]"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="space-y-1.5">
            <h2 className="text-[12px] font-medium uppercase tracking-wide text-[var(--ink-3)]">
              How to work through it
            </h2>
            <p className="text-[13px] leading-relaxed text-[var(--ink-2)]">
              {guide.approach}
            </p>
          </Card>
        </>
      )}

      <section className="space-y-2">
        <h2 className="text-[13px] font-medium text-[var(--ink-2)]">Sections</h2>
        <div className="space-y-1.5">
          {chapter.topics.map((topic) => {
            const status: TopicStatus = progressFor(course, topic.id).status;
            return (
              <Link
                key={topic.id}
                to={`/topic/${topic.id}`}
                className="flex items-start gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--card)] px-3 py-2.5 hover:border-[var(--line-2)]"
              >
                <span className="mt-[6px]">
                  <StatusDot status={status} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-[var(--ink-3)]">
                    {topic.id}
                  </span>
                  <span className="block text-[13px] font-medium text-[var(--ink-1)]">
                    {topic.title}
                  </span>
                  <span className="block text-[12px] leading-snug text-[var(--ink-3)]">
                    {topic.blurb}
                  </span>
                </span>
                <Icon
                  icon={ChevronRight}
                  size={14}
                  className="mt-1 shrink-0 text-[var(--ink-3)]"
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
