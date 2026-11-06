import {
  ALL_STEWART_SECTIONS,
  DEFAULT_INCLUDED_TOPIC_IDS,
  STEWART_BY_ID,
  STEWART_CHAPTERS,
} from "@/content/stewart";
import type {
  CourseConfig,
  CourseState,
  ExamBlueprint,
  ExerciseProgress,
  ResolvedTopic,
  TopicId,
  TopicProgress,
  TopicStatus,
} from "@/types/course";

const COURSE_KEY = "calctutor.course.v1";

export const DEFAULT_COMPONENTS: CourseConfig["components"] = [
  { id: "hw", name: "Homework", weightPct: 5, kind: "homework" },
  { id: "exam1", name: "Exam 1", weightPct: 20, kind: "exam" },
  { id: "exam2", name: "Exam 2", weightPct: 20, kind: "exam" },
  { id: "exam3", name: "Exam 3", weightPct: 20, kind: "exam" },
  { id: "final", name: "Final", weightPct: 35, kind: "final" },
];

/**
 * Placeholder blueprints from a LAVC Math 263 sample syllabus. Every field is
 * editable in Course Setup; replace them the day the real syllabus arrives.
 */
export const DEFAULT_BLUEPRINTS: ExamBlueprint[] = [
  {
    id: "bp-exam1",
    name: "Exam 1 · Ch 12–13",
    componentId: "exam1",
    topicIds: idsForChapters([12, 13]),
    questionCount: 20,
    minutes: 75,
  },
  {
    id: "bp-exam2",
    name: "Exam 2 · Ch 14",
    componentId: "exam2",
    topicIds: idsForChapters([14]),
    questionCount: 10,
    minutes: 60,
  },
  {
    id: "bp-exam3",
    name: "Exam 3 · Ch 15",
    componentId: "exam3",
    topicIds: idsForChapters([15]),
    questionCount: 10,
    minutes: 60,
  },
  {
    id: "bp-final",
    name: "Final · Ch 12–16",
    componentId: "final",
    topicIds: idsForChapters([12, 13, 14, 15, 16]),
    questionCount: 10,
    minutes: 120,
  },
];

function idsForChapters(chapters: number[]): string[] {
  return ALL_STEWART_SECTIONS.filter((s) => chapters.includes(s.chapter)).map(
    (s) => s.id,
  );
}

export function defaultCourseConfig(): CourseConfig {
  return {
    version: 1,
    name: "Calculus 3",
    textbook: "Stewart Calculus, 9th ed.",
    includedTopicIds: [...DEFAULT_INCLUDED_TOPIC_IDS],
    titleOverrides: {},
    customSections: [],
    components: DEFAULT_COMPONENTS.map((c) => ({ ...c })),
    blueprints: DEFAULT_BLUEPRINTS.map((b) => ({ ...b, topicIds: [...b.topicIds] })),
  };
}

export function emptyProgress(topicId: TopicId): TopicProgress {
  return {
    topicId,
    status: "unseen",
    attempts: 0,
    cleanStreak: 0,
    lastAt: null,
    note: "",
    knownAt: null,
  };
}

export function createInitialCourseState(): CourseState {
  const config = defaultCourseConfig();
  const progress: Record<TopicId, TopicProgress> = {};
  for (const s of ALL_STEWART_SECTIONS) progress[s.id] = emptyProgress(s.id);
  return { config, progress, exercises: {} };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

const STATUSES: TopicStatus[] = ["unseen", "learning", "solid", "known"];

function parseStatus(v: unknown): TopicStatus {
  return STATUSES.includes(v as TopicStatus) ? (v as TopicStatus) : "unseen";
}

/** The old optional module was mislabeled 17.x; the book's sections are 9.x. */
const LEGACY_TOPIC_IDS: Record<string, string> = {
  "17.1": "9.1",
  "17.2": "9.2",
  "17.3": "9.3",
};

function remapLegacyTopicId(id: string): string {
  return LEGACY_TOPIC_IDS[id] ?? id;
}

function remapLegacyExerciseKey(key: string): string {
  const [topicId, ...rest] = key.split("#");
  return [remapLegacyTopicId(topicId), ...rest].join("#");
}

export function parseCourseConfig(raw: unknown): CourseConfig {
  const base = defaultCourseConfig();
  if (!isObject(raw)) return base;

  const included = Array.isArray(raw.includedTopicIds)
    ? (raw.includedTopicIds as unknown[])
        .filter((id): id is string => typeof id === "string")
        .map(remapLegacyTopicId)
        .filter((id) => id in STEWART_BY_ID)
    : base.includedTopicIds;

  const customSections = Array.isArray(raw.customSections)
    ? (raw.customSections as unknown[])
        .filter((s): s is Record<string, unknown> => isObject(s))
        .map((s) => ({
          id: str(s.id),
          chapter: Math.max(1, Math.round(num(s.chapter, 1))),
          title: str(s.title, "Untitled section"),
          blurb: str(s.blurb),
        }))
        .filter((s) => s.id.length > 0)
    : [];

  const components = Array.isArray(raw.components)
    ? (raw.components as unknown[])
        .filter((c): c is Record<string, unknown> => isObject(c))
        .map((c) => ({
          id: str(c.id),
          name: str(c.name, "Component"),
          weightPct: Math.max(0, num(c.weightPct)),
          kind: (["homework", "exam", "final", "other"] as const).includes(
            c.kind as "exam",
          )
            ? (c.kind as CourseConfig["components"][number]["kind"])
            : "other",
        }))
        .filter((c) => c.id.length > 0)
    : base.components;

  const blueprints = Array.isArray(raw.blueprints)
    ? (raw.blueprints as unknown[])
        .filter((b): b is Record<string, unknown> => isObject(b))
        .map((b) => ({
          id: str(b.id),
          name: str(b.name, "Exam"),
          componentId: str(b.componentId),
          topicIds: Array.isArray(b.topicIds)
            ? (b.topicIds as unknown[])
                .filter((id): id is string => typeof id === "string")
                .map(remapLegacyTopicId)
            : [],
          questionCount: Math.max(1, Math.round(num(b.questionCount, 10))),
          minutes: Math.max(5, Math.round(num(b.minutes, 60))),
        }))
        .filter((b) => b.id.length > 0)
    : base.blueprints;

  const titleOverrides: Record<string, string> = {};
  if (isObject(raw.titleOverrides)) {
    for (const [id, title] of Object.entries(raw.titleOverrides)) {
      if (typeof title === "string" && title.trim()) {
        titleOverrides[remapLegacyTopicId(id)] = title;
      }
    }
  }

  return {
    version: 1,
    name: str(raw.name, base.name),
    textbook: str(raw.textbook, base.textbook),
    includedTopicIds: included,
    titleOverrides,
    customSections,
    components: components.length ? components : base.components,
    blueprints: blueprints.length ? blueprints : base.blueprints,
  };
}

export function parseCourseState(raw: unknown): CourseState | null {
  if (!isObject(raw)) return null;
  const config = parseCourseConfig(raw.config);
  const progress: Record<TopicId, TopicProgress> = {};
  for (const s of ALL_STEWART_SECTIONS) progress[s.id] = emptyProgress(s.id);
  if (isObject(raw.progress)) {
    for (const [id, value] of Object.entries(raw.progress)) {
      if (!isObject(value)) continue;
      const topicId = remapLegacyTopicId(id);
      progress[topicId] = {
        topicId,
        status: parseStatus(value.status),
        attempts: Math.max(0, Math.round(num(value.attempts))),
        cleanStreak: Math.max(0, Math.round(num(value.cleanStreak))),
        lastAt: typeof value.lastAt === "number" ? value.lastAt : null,
        note: str(value.note),
        knownAt: typeof value.knownAt === "number" ? value.knownAt : null,
      };
    }
  }
  const exercises: CourseState["exercises"] = {};
  if (isObject(raw.exercises)) {
    for (const [key, value] of Object.entries(raw.exercises)) {
      if (!isObject(value)) continue;
      const topicId = remapLegacyTopicId(str(value.topicId));
      const number = Math.round(num(value.number));
      if (!topicId || number <= 0) continue;
      exercises[remapLegacyExerciseKey(key)] = {
        topicId,
        number,
        attempts: Math.max(0, Math.round(num(value.attempts))),
        cleanStreak: Math.max(0, Math.round(num(value.cleanStreak))),
        lastAt: typeof value.lastAt === "number" ? value.lastAt : 0,
      };
    }
  }
  return { config, progress, exercises };
}

export function loadCourseState(): CourseState {
  try {
    const raw = localStorage.getItem(COURSE_KEY);
    if (!raw) return createInitialCourseState();
    return parseCourseState(JSON.parse(raw) as unknown) ?? createInitialCourseState();
  } catch {
    return createInitialCourseState();
  }
}

export function saveCourseState(state: CourseState): void {
  localStorage.setItem(COURSE_KEY, JSON.stringify(state));
}

export function resetCourseState(): CourseState {
  const next = createInitialCourseState();
  saveCourseState(next);
  return next;
}

/** Merge the built-in map with the user's config, preserving their order. */
export function resolveTopics(config: CourseConfig): ResolvedTopic[] {
  const included = new Set(config.includedTopicIds);
  const customById = new Map(config.customSections.map((s) => [s.id, s]));
  const out: ResolvedTopic[] = [];

  for (const base of ALL_STEWART_SECTIONS) {
    const custom = customById.get(base.id);
    const inCourse = included.has(base.id) || Boolean(custom);
    if (!inCourse) continue;
    out.push({
      ...base,
      title: config.titleOverrides[base.id] ?? custom?.title ?? base.title,
      custom: Boolean(custom),
      order: 0,
    });
  }

  for (const custom of config.customSections) {
    if (baseExists(custom.id)) continue;
    if (!included.has(custom.id)) continue;
    out.push({
      id: custom.id,
      chapter: custom.chapter,
      title: config.titleOverrides[custom.id] ?? custom.title,
      blurb: custom.blurb,
      prereqs: [],
      custom: true,
      order: 0,
    });
  }

  out.sort((a, b) => compareTopicIds(a, b));
  out.forEach((t, i) => {
    t.order = i;
  });
  return out;
}

function baseExists(id: string): boolean {
  return id in STEWART_BY_ID;
}

function compareTopicIds(a: ResolvedTopic, b: ResolvedTopic): number {
  if (a.chapter !== b.chapter) return a.chapter - b.chapter;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

export interface ChapterGroup {
  number: number;
  title: string;
  topics: ResolvedTopic[];
}

export function groupByChapter(topics: ResolvedTopic[]): ChapterGroup[] {
  const map = new Map<number, ChapterGroup>();
  for (const topic of topics) {
    let group = map.get(topic.chapter);
    if (!group) {
      const known = STEWART_CHAPTERS.find((c) => c.number === topic.chapter);
      group = {
        number: topic.chapter,
        title: known?.title ?? `Chapter ${topic.chapter}`,
        topics: [],
      };
      map.set(topic.chapter, group);
    }
    group.topics.push(topic);
  }
  return [...map.values()].sort((a, b) => a.number - b.number);
}

export function topicById(
  config: CourseConfig,
  id: TopicId,
): ResolvedTopic | undefined {
  return resolveTopics(config).find((t) => t.id === id);
}

export function progressFor(state: CourseState, id: TopicId): TopicProgress {
  return state.progress[id] ?? emptyProgress(id);
}

/** Evidence score for one topic, 0–100. Known and solid both count as done. */
export function topicScore(state: CourseState, id: TopicId): number {
  const p = progressFor(state, id);
  if (p.status === "known" || p.status === "solid") return 100;
  if (p.status === "learning") {
    return Math.min(85, 15 + p.attempts * 10 + p.cleanStreak * 10);
  }
  return 0;
}

export interface Coverage {
  total: number;
  /** Known + solid. */
  done: number;
  learning: number;
  unseen: number;
  pct: number;
}

export function coverage(state: CourseState): Coverage {
  const topics = resolveTopics(state.config);
  let done = 0;
  let learning = 0;
  for (const t of topics) {
    const status = progressFor(state, t.id).status;
    if (status === "known" || status === "solid") done += 1;
    else if (status === "learning") learning += 1;
  }
  const total = topics.length;
  return {
    total,
    done,
    learning,
    unseen: Math.max(0, total - done - learning),
    pct: total ? Math.round((100 * done) / total) : 0,
  };
}

export function chapterCoverage(
  state: CourseState,
  chapterTopics: ResolvedTopic[],
): Coverage {
  let done = 0;
  let learning = 0;
  for (const t of chapterTopics) {
    const status = progressFor(state, t.id).status;
    if (status === "known" || status === "solid") done += 1;
    else if (status === "learning") learning += 1;
  }
  const total = chapterTopics.length;
  return {
    total,
    done,
    learning,
    unseen: Math.max(0, total - done - learning),
    pct: total ? Math.round((100 * done) / total) : 0,
  };
}

/** Readiness for one exam blueprint, from the topics it covers. */
export function blueprintReadiness(
  state: CourseState,
  blueprint: ExamBlueprint,
): Coverage {
  const inCourse = new Set(resolveTopics(state.config).map((t) => t.id));
  const ids = blueprint.topicIds.filter((id) => inCourse.has(id));
  let done = 0;
  let learning = 0;
  for (const id of ids) {
    const status = progressFor(state, id).status;
    if (status === "known" || status === "solid") done += 1;
    else if (status === "learning") learning += 1;
  }
  const total = ids.length;
  return {
    total,
    done,
    learning,
    unseen: Math.max(0, total - done - learning),
    pct: total ? Math.round((100 * done) / total) : 0,
  };
}

export function weightTotal(config: CourseConfig): number {
  return config.components.reduce((sum, c) => sum + c.weightPct, 0);
}

export interface ConfigIssue {
  level: "error" | "warn";
  message: string;
}

export function configIssues(config: CourseConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const total = weightTotal(config);
  if (Math.abs(total - 100) > 0.01) {
    issues.push({
      level: "error",
      message: `Grade weights add up to ${total}%, not 100%.`,
    });
  }
  if (!config.includedTopicIds.length && !config.customSections.length) {
    issues.push({ level: "error", message: "No topics are included yet." });
  }
  const componentIds = new Set(config.components.map((c) => c.id));
  for (const bp of config.blueprints) {
    if (!componentIds.has(bp.componentId)) {
      issues.push({
        level: "warn",
        message: `${bp.name} isn't linked to a grade component.`,
      });
    }
    if (!bp.topicIds.length) {
      issues.push({
        level: "warn",
        message: `${bp.name} doesn't cover any topics.`,
      });
    }
  }
  if (!config.blueprints.length) {
    issues.push({
      level: "warn",
      message: "No exams defined — exam readiness will stay hidden.",
    });
  }
  return issues;
}

export function setTopicStatus(
  state: CourseState,
  id: TopicId,
  status: TopicStatus,
): CourseState {
  const prev = progressFor(state, id);
  const at = Date.now();
  return {
    ...state,
    progress: {
      ...state.progress,
      [id]: {
        ...prev,
        topicId: id,
        status,
        knownAt: status === "known" ? at : null,
        lastAt: at,
        cleanStreak: status === "solid" || status === "known" ? prev.cleanStreak : 0,
      },
    },
  };
}

export function setTopicNote(
  state: CourseState,
  id: TopicId,
  note: string,
): CourseState {
  return {
    ...state,
    progress: {
      ...state.progress,
      [id]: { ...progressFor(state, id), topicId: id, note },
    },
  };
}

/**
 * Record a graded attempt (used by the drill loop). A clean answer extends the
 * streak; three clean answers mark the topic solid. Marking known is explicit
 * and never overridden by a single miss.
 */
export function recordTopicAttempt(
  state: CourseState,
  id: TopicId,
  opts: { clean: boolean; at?: number },
): CourseState {
  const prev = progressFor(state, id);
  const at = opts.at ?? Date.now();
  const cleanStreak = opts.clean ? prev.cleanStreak + 1 : 0;
  let status: TopicStatus = prev.status;
  if (opts.clean && cleanStreak >= 3) status = "solid";
  else if (!opts.clean && status === "solid") status = "learning";
  else if (status !== "known" && status !== "solid") status = "learning";
  return {
    ...state,
    progress: {
      ...state.progress,
      [id]: {
        ...prev,
        topicId: id,
        status,
        attempts: prev.attempts + 1,
        cleanStreak,
        lastAt: at,
      },
    },
  };
}

export function updateConfig(
  state: CourseState,
  patch: Partial<CourseConfig>,
): CourseState {
  return { ...state, config: { ...state.config, ...patch } };
}

export function exerciseKey(topicId: TopicId, number: number): string {
  return `${topicId}#${number}`;
}

export function progressForExercise(
  state: CourseState,
  topicId: TopicId,
  number: number,
): ExerciseProgress | undefined {
  return state.exercises[exerciseKey(topicId, number)];
}

/** One graded exercise: updates the exercise record and rolls up to the topic. */
export function recordExerciseAttempt(
  state: CourseState,
  topicId: TopicId,
  number: number,
  opts: { clean: boolean; at?: number },
): CourseState {
  const at = opts.at ?? Date.now();
  const key = exerciseKey(topicId, number);
  const prev = state.exercises[key];
  const withTopic = recordTopicAttempt(state, topicId, { clean: opts.clean, at });
  return {
    ...withTopic,
    exercises: {
      ...withTopic.exercises,
      [key]: {
        topicId,
        number,
        attempts: (prev?.attempts ?? 0) + 1,
        cleanStreak: opts.clean ? (prev?.cleanStreak ?? 0) + 1 : 0,
        lastAt: at,
      },
    },
  };
}
