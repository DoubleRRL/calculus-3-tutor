import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { useCourse } from "@/state/CourseContext";
import { useBookSection, bookAsset } from "@/lib/book";
import { progressFor } from "@/lib/courseStore";
import { Icon } from "@/ui";
import { ExerciseCoach } from "@/components/course/ExerciseCoach";
import { AnswerCheck } from "@/components/course/AnswerCheck";

export function ExercisePage() {
  const { topicId, number } = useParams();
  const { course, topics, recordExercise } = useCourse();
  const { section, loading } = useBookSection(topicId);
  const n = Number(number);
  const [seed, setSeed] = useState<{ id: number; text: string } | null>(null);
  const seedId = useRef(0);

  useEffect(() => {
    setSeed(null);
  }, [n]);

  const topic = topics.find((t) => t.id === topicId);
  if (!topic) return <Navigate to="/" replace />;

  const list = section?.exercises ?? [];
  const index = list.findIndex((e) => e.number === n);
  const exercise = index >= 0 ? list[index] : undefined;
  const prev = index > 0 ? list[index - 1] : undefined;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : undefined;
  const progress = progressFor(course, topic.id);
  const coachContext = `Section ${topic.id} — ${topic.title}. ${topic.blurb} Builds on: ${
    topic.prereqs.length ? topic.prereqs.join(", ") : "nothing in this course"
  }.`;

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
        <div className="rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-4">
          <p className="text-[13px] text-[var(--ink-3)]">Loading…</p>
        </div>
      )}

      {!loading && !exercise && (
        <div className="space-y-2 rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-4">
          <p className="text-[14px] text-[var(--ink-1)]">
            Exercise {number} isn't in the imported set.
          </p>
          <Link
            to={`/topic/${topic.id}`}
            className="text-[13px] underline underline-offset-4"
          >
            Back to the topic
          </Link>
        </div>
      )}

      {exercise && (
        <>
          <div className="overflow-hidden rounded-[var(--r-card)] border border-[var(--line)] bg-white p-2">
            <img
              src={bookAsset(exercise.image)}
              alt={`Exercise ${exercise.number}`}
              className="h-auto w-full"
            />
          </div>

          <AnswerCheck
            key={`${topic.id}-${exercise.number}`}
            topicId={topic.id}
            number={exercise.number}
            exerciseImageUrl={bookAsset(exercise.image)}
            answerImageUrl={
              exercise.answerImage ? bookAsset(exercise.answerImage) : null
            }
            onGraded={(ok) =>
              recordExercise(topic.id, exercise.number, ok)
            }
            onWrong={(student) =>
              setSeed({
                id: ++seedId.current,
                text: `I answered "${student}" and it was marked wrong. Ask me one narrower question that finds where my reasoning broke. Do not give the next step or the answer yet.`,
              })
            }
            differentHref={
              next ? `/topic/${topic.id}/exercise/${next.number}` : undefined
            }
            differentNumber={next?.number}
          />

          <p className="text-[12px] text-[var(--ink-3)]">
            {progress.attempts} attempts · {progress.cleanStreak} clean in a row
          </p>

          <ExerciseCoach
            key={`${topic.id}-${exercise.number}`}
            topicId={topic.id}
            number={exercise.number}
            imageUrl={bookAsset(exercise.image)}
            answerImageUrl={
              exercise.answerImage ? bookAsset(exercise.answerImage) : null
            }
            context={coachContext}
            seed={seed}
          />

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
