import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useCourse } from "@/state/CourseContext";
import { STEWART_CHAPTERS } from "@/content/stewart";
import {
  DEFAULT_BLUEPRINTS,
  DEFAULT_COMPONENTS,
  defaultCourseConfig,
  resolveTopics,
  weightTotal,
} from "@/lib/courseStore";
import type {
  ExamBlueprint,
  GradeComponent,
  GradeComponentKind,
  TopicId,
} from "@/types/course";
import { Button, Card, Icon } from "@/ui";
import { ChapterBadge } from "@/components/course/TopicChip";

const inputCls =
  "w-full rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)] focus:outline-none focus:border-[var(--line-2)]";

const labelCls = "block text-[12px] font-medium text-[var(--ink-2)] mb-1.5";

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function CourseSetupPage() {
  const { course, issues, patchConfig, resetCourse } = useCourse();
  const config = course.config;
  const total = weightTotal(config);
  const resolved = resolveTopics(config);
  const included = new Set(config.includedTopicIds);

  const setComponent = (id: string, patch: Partial<GradeComponent>) => {
    patchConfig({
      components: config.components.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    });
  };

  const removeComponent = (id: string) => {
    patchConfig({ components: config.components.filter((c) => c.id !== id) });
  };

  const addComponent = () => {
    patchConfig({
      components: [
        ...config.components,
        {
          id: `comp-${Date.now()}`,
          name: "New component",
          weightPct: 0,
          kind: "other",
        },
      ],
    });
  };

  const setBlueprint = (id: string, patch: Partial<ExamBlueprint>) => {
    patchConfig({
      blueprints: config.blueprints.map((b) =>
        b.id === id ? { ...b, ...patch } : b,
      ),
    });
  };

  const removeBlueprint = (id: string) => {
    patchConfig({ blueprints: config.blueprints.filter((b) => b.id !== id) });
  };

  const addBlueprint = () => {
    const component =
      config.components.find((c) => c.kind === "exam") ??
      config.components.find((c) => c.kind === "final") ??
      config.components[0];
    patchConfig({
      blueprints: [
        ...config.blueprints,
        {
          id: `bp-${Date.now()}`,
          name: "New exam",
          componentId: component?.id ?? "",
          topicIds: [],
          questionCount: 10,
          minutes: 60,
        },
      ],
    });
  };

  const setChapterIncluded = (chapterNumber: number, on: boolean) => {
    const ids = STEWART_CHAPTERS.find((c) => c.number === chapterNumber)
      ?.sections.map((s) => s.id) ?? [];
    const next = new Set(config.includedTopicIds);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    patchConfig({ includedTopicIds: [...next] });
  };

  return (
    <div className="space-y-8">
      <header>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-3)] hover:text-[var(--ink-1)]"
        >
          <Icon icon={ArrowLeft} size={14} />
          Topics
        </Link>
        <h1 className="mt-4 text-[24px] font-medium text-[var(--ink-1)]">
          Course setup
        </h1>
      </header>

      {issues.length > 0 && (
        <Card className="space-y-1.5 border-[var(--error)]/40 bg-[var(--error-weak)]">
          {issues.map((issue, i) => (
            <p key={i} className="text-[12px] text-[var(--ink-1)]">
              <span className="font-medium uppercase tracking-wide text-[10px] mr-2 opacity-70">
                {issue.level}
              </span>
              {issue.message}
            </p>
          ))}
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-[13px] font-medium text-[var(--ink-2)]">Course</h2>
        <Card className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="course-name">
              Name
            </label>
            <input
              id="course-name"
              className={inputCls}
              value={config.name}
              onChange={(e) => patchConfig({ name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="course-textbook">
              Textbook
            </label>
            <input
              id="course-textbook"
              className={inputCls}
              value={config.textbook}
              onChange={(e) => patchConfig({ textbook: e.target.value })}
            />
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-medium text-[var(--ink-2)]">
            Grade weights
          </h2>
          <span
            className={`font-mono text-[12px] ${
              Math.abs(total - 100) < 0.01
                ? "text-[var(--success)]"
                : "text-[var(--error)]"
            }`}
          >
            {total}% / 100%
          </span>
        </div>
        <Card className="space-y-2">
          {config.components.map((component) => (
            <div
              key={component.id}
              className="grid grid-cols-[1fr_64px_32px] gap-2 items-center sm:grid-cols-[1fr_64px_110px_32px]"
            >
              <input
                aria-label="Component name"
                className={`${inputCls} order-1`}
                value={component.name}
                onChange={(e) =>
                  setComponent(component.id, { name: e.target.value })
                }
              />
              <input
                aria-label="Weight percent"
                type="number"
                min={0}
                max={100}
                step={1}
                className={`${inputCls} order-2`}
                value={component.weightPct}
                onChange={(e) =>
                  setComponent(component.id, {
                    weightPct: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
              <select
                aria-label="Component kind"
                className={`${inputCls} order-4 col-span-3 sm:order-3 sm:col-span-1`}
                value={component.kind}
                onChange={(e) =>
                  setComponent(component.id, {
                    kind: e.target.value as GradeComponentKind,
                  })
                }
              >
                <option value="homework">Homework</option>
                <option value="exam">Exam</option>
                <option value="final">Final</option>
                <option value="other">Other</option>
              </select>
              <button
                type="button"
                aria-label={`Remove ${component.name}`}
                onClick={() => removeComponent(component.id)}
                className="order-3 sm:order-4 h-9 w-8 flex items-center justify-center rounded text-[var(--ink-3)] hover:text-[var(--error)]"
              >
                <Icon icon={Trash2} size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addComponent}
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)] pt-1"
          >
            <Icon icon={Plus} size={14} />
            Add component
          </button>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-medium text-[var(--ink-2)]">Exams</h2>
          <button
            type="button"
            onClick={addBlueprint}
            className="inline-flex items-center gap-1 text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
          >
            <Icon icon={Plus} size={14} />
            Add exam
          </button>
        </div>
        <div className="space-y-2">
          {config.blueprints.map((bp) => (
            <Card key={bp.id} className="space-y-3">
              <div className="flex items-start gap-2">
                <input
                  aria-label="Exam name"
                  className={`${inputCls} font-medium`}
                  value={bp.name}
                  onChange={(e) => setBlueprint(bp.id, { name: e.target.value })}
                />
                <button
                  type="button"
                  aria-label={`Remove ${bp.name}`}
                  onClick={() => removeBlueprint(bp.id)}
                  className="h-9 w-8 shrink-0 flex items-center justify-center rounded text-[var(--ink-3)] hover:text-[var(--error)]"
                >
                  <Icon icon={Trash2} size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className={labelCls}>Counts as</label>
                  <select
                    className={inputCls}
                    value={bp.componentId}
                    onChange={(e) =>
                      setBlueprint(bp.id, { componentId: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {config.components.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Questions</label>
                  <input
                    type="number"
                    min={1}
                    className={inputCls}
                    value={bp.questionCount}
                    onChange={(e) =>
                      setBlueprint(bp.id, {
                        questionCount: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Minutes</label>
                  <input
                    type="number"
                    min={5}
                    className={inputCls}
                    value={bp.minutes}
                    onChange={(e) =>
                      setBlueprint(bp.id, {
                        minutes: Math.max(5, Number(e.target.value) || 5),
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Topics</label>
                  <p className="h-9 flex items-center text-[13px] text-[var(--ink-2)]">
                    {bp.topicIds.length} selected
                  </p>
                </div>
              </div>
              <details className="group">
                <summary className="cursor-pointer text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)] select-none">
                  Edit covered topics
                </summary>
                <div className="mt-2 space-y-2">
                  {STEWART_CHAPTERS.map((chapter) => {
                    const ids = chapter.sections.map((s) => s.id);
                    const all = ids.every((id) => bp.topicIds.includes(id));
                    return (
                      <div key={chapter.number} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <ChapterBadge number={chapter.number} />
                          <span className="text-[12px] text-[var(--ink-2)] flex-1 truncate">
                            {chapter.title}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setBlueprint(bp.id, {
                                topicIds: all
                                  ? bp.topicIds.filter((id) => !ids.includes(id))
                                  : [...new Set([...bp.topicIds, ...ids])],
                              })
                            }
                            className="text-[11px] text-[var(--ink-3)] hover:text-[var(--ink-1)]"
                          >
                            {all ? "Clear" : "All"}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 pl-9">
                          {chapter.sections.map((s) => {
                            const on = bp.topicIds.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() =>
                                  setBlueprint(bp.id, {
                                    topicIds: toggle(bp.topicIds, s.id),
                                  })
                                }
                                className={`rounded-[var(--r-pill)] border px-2 py-0.5 font-mono text-[11px] ${
                                  on
                                    ? "border-[var(--ink-1)] bg-[var(--accent)] text-[var(--on-accent)]"
                                    : "border-[var(--line)] text-[var(--ink-2)]"
                                }`}
                              >
                                {s.id}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </Card>
          ))}
          {config.blueprints.length === 0 && (
            <p className="text-[12px] text-[var(--ink-3)]">No exams.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[13px] font-medium text-[var(--ink-2)]">Topics</h2>
          <span className="font-mono text-[12px] text-[var(--ink-3)]">
            {resolved.length} in course
          </span>
        </div>
        <div className="space-y-2">
          {STEWART_CHAPTERS.map((chapter) => {
            const ids = chapter.sections.map((s) => s.id);
            const allOn = ids.every((id) => included.has(id));
            const someOn = ids.some((id) => included.has(id));
            return (
              <Card key={chapter.number} className="space-y-2">
                <div className="flex items-center gap-2">
                  <ChapterBadge number={chapter.number} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--ink-1)] truncate">
                      {chapter.title}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setChapterIncluded(chapter.number, !allOn)}
                    className={`rounded-[var(--r-pill)] border px-2.5 py-1 text-[11px] ${
                      allOn
                        ? "border-[var(--ink-1)] bg-[var(--accent)] text-[var(--on-accent)]"
                        : "border-[var(--line)] text-[var(--ink-2)]"
                    }`}
                  >
                    {allOn ? "Included" : someOn ? "Partly" : "Excluded"}
                  </button>
                </div>
                <div className="space-y-1">
                  {chapter.sections.map((s) => {
                    const on = included.has(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          aria-label={`Include ${s.id}`}
                          checked={on}
                          onChange={() =>
                            patchConfig({
                              includedTopicIds: toggle(
                                config.includedTopicIds,
                                s.id,
                              ),
                            })
                          }
                          className="h-4 w-4 shrink-0 accent-[var(--accent)]"
                        />
                        <span className="w-10 shrink-0 font-mono text-[11px] text-[var(--ink-3)]">
                          {s.id}
                        </span>
                        <input
                          aria-label={`Title for ${s.id}`}
                          className="w-full bg-transparent border-b border-transparent py-1 text-[12px] text-[var(--ink-1)] hover:border-[var(--line)] focus:border-[var(--line-2)] focus:outline-none"
                          value={config.titleOverrides[s.id] ?? s.title}
                          onChange={(e) => {
                            const titleOverrides = { ...config.titleOverrides };
                            if (e.target.value === s.title) delete titleOverrides[s.id];
                            else titleOverrides[s.id] = e.target.value;
                            patchConfig({ titleOverrides });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>

        <CustomSections
          chapterCount={STEWART_CHAPTERS.length}
          onAdd={(section) =>
            patchConfig({
              customSections: [...config.customSections, section],
              includedTopicIds: [...new Set([...config.includedTopicIds, section.id])],
            })
          }
          onRemove={(id) =>
            patchConfig({
              customSections: config.customSections.filter((s) => s.id !== id),
              includedTopicIds: config.includedTopicIds.filter((x) => x !== id),
            })
          }
          existing={config.customSections}
        />
      </section>

      <section className="space-y-2 border-t border-[var(--line)] pt-5">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  "Reset course setup to the Stewart 12–16 defaults? Topic progress and notes are kept.",
                )
              ) {
                const defaults = defaultCourseConfig();
                patchConfig({
                  ...defaults,
                  components: DEFAULT_COMPONENTS.map((c) => ({ ...c })),
                  blueprints: DEFAULT_BLUEPRINTS.map((b) => ({
                    ...b,
                    topicIds: [...b.topicIds],
                  })),
                });
              }
            }}
          >
            <Icon icon={RotateCcw} size={14} />
            Reset setup to defaults
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  "Reset the course and every topic status and note? This cannot be undone.",
                )
              ) {
                resetCourse();
              }
            }}
          >
            Erase topic progress
          </Button>
        </div>
      </section>
    </div>
  );
}

function CustomSections({
  existing,
  chapterCount,
  onAdd,
  onRemove,
}: {
  existing: { id: TopicId; chapter: number; title: string; blurb: string }[];
  chapterCount: number;
  onAdd: (s: { id: TopicId; chapter: number; title: string; blurb: string }) => void;
  onRemove: (id: TopicId) => void;
}) {
  const [id, setId] = useState("");
  const [chapter, setChapter] = useState(String(chapterCount + 1));
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const cleanId = id.trim();
    const cleanTitle = title.trim();
    if (!cleanId || !cleanTitle) {
      setError("Give the section an id and a title.");
      return;
    }
    if (existing.some((s) => s.id === cleanId)) {
      setError("That id already exists.");
      return;
    }
    onAdd({
      id: cleanId,
      chapter: Math.max(1, Number(chapter) || 1),
      title: cleanTitle,
      blurb: "",
    });
    setId("");
    setTitle("");
    setError("");
  };

  return (
    <Card className="space-y-2">
      <p className="text-[13px] font-medium text-[var(--ink-1)]">
        Custom sections
      </p>
      {existing.length > 0 && (
        <ul className="space-y-1">
          {existing.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-[12px]">
              <span className="font-mono text-[var(--ink-3)]">{s.id}</span>
              <span className="flex-1 truncate text-[var(--ink-1)]">{s.title}</span>
              <button
                type="button"
                aria-label={`Remove ${s.title}`}
                onClick={() => onRemove(s.id)}
                className="text-[var(--ink-3)] hover:text-[var(--error)]"
              >
                <Icon icon={Trash2} size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-[80px_60px_1fr_auto] gap-2 items-center">
        <input
          aria-label="New section id"
          placeholder="12.7"
          className={inputCls}
          value={id}
          onChange={(e) => setId(e.target.value)}
        />
        <input
          aria-label="New section chapter"
          placeholder="12"
          type="number"
          min={1}
          className={inputCls}
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
        />
        <input
          aria-label="New section title"
          placeholder="Title"
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="button"
          onClick={submit}
          className="h-9 px-3 rounded-[var(--r-input)] border border-[var(--line-2)] text-[12px] text-[var(--ink-1)] hover:bg-[var(--accent-weak)]"
        >
          Add
        </button>
      </div>
      {error && <p className="text-[12px] text-[var(--error)]">{error}</p>}
    </Card>
  );
}
