import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CourseConfig, CourseState, TopicId, TopicStatus } from "@/types/course";
import {
  chapterCoverage,
  configIssues,
  coverage as computeCoverage,
  groupByChapter,
  loadCourseState,
  resetCourseState,
  resolveTopics,
  saveCourseState,
  setTopicNote,
  setTopicStatus,
  recordExerciseAttempt,
  updateConfig,
  type ChapterGroup,
  type ConfigIssue,
  type Coverage,
} from "@/lib/courseStore";
import type { ResolvedTopic } from "@/types/course";

interface CourseCtx {
  course: CourseState;
  topics: ResolvedTopic[];
  chapters: ChapterGroup[];
  coverage: Coverage;
  issues: ConfigIssue[];
  chapterStats: (topics: ResolvedTopic[]) => Coverage;
  setStatus: (id: TopicId, status: TopicStatus) => void;
  setNote: (id: TopicId, note: string) => void;
  recordExercise: (id: TopicId, number: number, clean: boolean) => void;
  patchConfig: (patch: Partial<CourseConfig>) => void;
  replaceCourse: (next: CourseState) => void;
  resetCourse: () => void;
}

const Ctx = createContext<CourseCtx | null>(null);

export function CourseProvider({ children }: { children: ReactNode }) {
  const [course, setCourse] = useState<CourseState>(() => loadCourseState());

  useEffect(() => {
    saveCourseState(course);
  }, [course]);

  const topics = useMemo(() => resolveTopics(course.config), [course.config]);
  const chapters = useMemo(() => groupByChapter(topics), [topics]);
  const coverage = useMemo(() => computeCoverage(course), [course]);
  const issues = useMemo(() => configIssues(course.config), [course.config]);

  const setStatus = useCallback((id: TopicId, status: TopicStatus) => {
    setCourse((prev) => setTopicStatus(prev, id, status));
  }, []);

  const setNote = useCallback((id: TopicId, note: string) => {
    setCourse((prev) => setTopicNote(prev, id, note));
  }, []);

  const recordExercise = useCallback(
    (id: TopicId, number: number, clean: boolean) => {
      setCourse((prev) => recordExerciseAttempt(prev, id, number, { clean }));
    },
    [],
  );

  const patchConfig = useCallback((patch: Partial<CourseConfig>) => {
    setCourse((prev) => updateConfig(prev, patch));
  }, []);

  const replaceCourse = useCallback((next: CourseState) => {
    saveCourseState(next);
    setCourse(next);
  }, []);

  const resetCourse = useCallback(() => {
    setCourse(resetCourseState());
  }, []);

  const chapterStats = useCallback(
    (chapterTopics: ResolvedTopic[]) => chapterCoverage(course, chapterTopics),
    [course],
  );

  const value = useMemo(
    () => ({
      course,
      topics,
      chapters,
      coverage,
      issues,
      chapterStats,
      setStatus,
      setNote,
      recordExercise,
      patchConfig,
      replaceCourse,
      resetCourse,
    }),
    [
      course,
      topics,
      chapters,
      coverage,
      issues,
      chapterStats,
      setStatus,
      setNote,
      recordExercise,
      patchConfig,
      replaceCourse,
      resetCourse,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCourse(): CourseCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCourse outside CourseProvider");
  return v;
}
