/** Topic-first course model. A topic is a textbook section ("14.3"). */

export type TopicId = string;

export interface SectionDef {
  id: TopicId;
  chapter: number;
  title: string;
  /** One line: what you can do after this section. */
  blurb: string;
  /** Display-only "builds on" links. Never gates navigation. */
  prereqs: TopicId[];
  /** Off by default (e.g. chapter 17). */
  optional?: boolean;
}

export interface ChapterDef {
  number: number;
  title: string;
  sections: SectionDef[];
}

/** Where you stand on a topic. No locks, no ordering. */
export type TopicStatus = "unseen" | "learning" | "solid" | "known";

export interface TopicProgress {
  topicId: TopicId;
  status: TopicStatus;
  /** Problems attempted on this topic. */
  attempts: number;
  /** Consecutive clean (no-hint, verified) answers. */
  cleanStreak: number;
  lastAt: number | null;
  note: string;
  /** When the learner explicitly marked it known. */
  knownAt: number | null;
}

/** Per-exercise evidence, keyed by "<topicId>#<number>". */
export interface ExerciseProgress {
  topicId: TopicId;
  number: number;
  attempts: number;
  cleanStreak: number;
  lastAt: number;
}

export type GradeComponentKind = "homework" | "exam" | "final" | "other";

export interface GradeComponent {
  id: string;
  name: string;
  /** Percentage points of the final grade. */
  weightPct: number;
  kind: GradeComponentKind;
}

export interface ExamBlueprint {
  id: string;
  name: string;
  /** Grade component this blueprint feeds (an "exam" or "final"). */
  componentId: string;
  topicIds: TopicId[];
  questionCount: number;
  minutes: number;
}

export interface CustomSection {
  id: TopicId;
  chapter: number;
  title: string;
  blurb: string;
}

/** User-owned course definition. Everything here is editable in Course Setup. */
export interface CourseConfig {
  version: 1;
  name: string;
  textbook: string;
  /** Topic ids from the built-in map that are part of the course. */
  includedTopicIds: TopicId[];
  /** Renamed built-in sections, keyed by topic id. */
  titleOverrides: Record<string, string>;
  /** Sections that are not in the built-in map. */
  customSections: CustomSection[];
  components: GradeComponent[];
  blueprints: ExamBlueprint[];
}

export interface CourseState {
  config: CourseConfig;
  progress: Record<TopicId, TopicProgress>;
  exercises: Record<string, ExerciseProgress>;
}

/** A resolved topic: built-in section merged with the user's config. */
export interface ResolvedTopic extends SectionDef {
  custom: boolean;
  /** Position in the course, after filtering excluded sections. */
  order: number;
}
