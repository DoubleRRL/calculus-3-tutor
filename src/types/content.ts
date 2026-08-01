/** Domain types for CalcTutor mastery system */

import type { InteractionSpec } from "./interactions";

export type UnitId =
  | "diagnostic"
  | "unit1"
  | "unit2"
  | "unit3"
  | "unit4"
  | "unit5"
  | "exam";

export type ItemKind =
  | "learn"
  | "guided"
  | "drill"
  | "mix"
  | "mastery"
  | "review"
  | "exam";

export type AnswerType =
  | "exact"
  | "numeric"
  | "choice"
  | "clickFill"
  | "free"
  | "tuple"
  | "interactive";

export type LearnerBackground =
  | "recent"
  | "rusty"
  | "strong3d"
  | "refresher";

export type ExplainStyle = "analogies" | "formulas" | "tldr";

export type LearnerProfile = {
  background: LearnerBackground;
  dailyMinutes: 5 | 15 | 30;
  explainStyle?: ExplainStyle;
};

export interface HintLadder {
  nudge: string;
  technique: string;
  nextStep: string;
  fullSolution: string;
}

export interface ProblemItem {
  id: string;
  skillId: string;
  kind: ItemKind;
  prompt: string;
  promptMath?: string;
  answerType: AnswerType;
  answer: string;
  accept?: string[];
  choices?: string[];
  /** For tuple: if true, component order does not matter. Default false (ordered). */
  tupleUnordered?: boolean;
  /** Labels for tuple input slots (e.g. ["a","b"]). Length should match answer components. */
  tupleLabels?: string[];
  /** Optional format skeleton shown above fields, e.g. "⟨0, a, b⟩". */
  tupleSkeleton?: string;
  /** Visual/conceptual interaction; required when answerType is "interactive". */
  interaction?: InteractionSpec;
  hints: HintLadder;
  misconceptionTags: string[];
  rubric: string;
  fadePrompt?: string;
  difficulty: 1 | 2 | 3 | 4;
  examWeight?: number;
}

export interface Skill {
  id: string;
  unitId: UnitId;
  title: string;
  objective: string;
  prerequisites: string[];
  order: number;
}

export interface Unit {
  id: UnitId;
  title: string;
  blurb: string;
  order: number;
}

export interface AttemptRecord {
  id: string;
  itemId: string;
  skillId: string;
  correct: boolean;
  revealed: boolean;
  hintLevel: number;
  answerGiven: string;
  at: number;
}

export interface SkillProgress {
  skillId: string;
  rating: number;
  consecutiveCorrect: number;
  seen: number;
  mastered: boolean;
  unlocked: boolean;
  stage: "learn" | "guided" | "drill" | "mix" | "mastery" | "done";
  lastSeenAt: number | null;
  revealedCount: number;
}

/** Review card is FsrsState + skill identity. */
export interface ReviewCard {
  skillId: string;
  dueAt: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReviewAt: number | null;
}

export type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  coachModel: string;
  qualityModel: string;
  qualityMode: boolean;
  ollamaBaseUrl: string;
  onboardingDone: boolean;
  /** Short personalizer finished (background / daily time / explain style). */
  personalizerDone: boolean;
  learnerProfile: LearnerProfile | null;
  sessionSize: 5 | 12 | 20;
  theme: ThemeMode;
  dailyGoalXp: number;
  /** Keep chat scrolled to the growing coach reply while streaming. */
  coachFollowStream: boolean;
}

export type SessionMode = "today" | "skill" | "review" | "exam" | "placement";

export interface SessionSummary {
  at: number;
  mode: SessionMode;
  skillId?: string;
  items: number;
  correct: number;
  firstTryCorrect: number;
  xp: number;
  durationMs: number;
  bestCombo: number;
}

export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ReadinessSnapshot {
  masteryPct: number;
  retentionPct: number;
  examReadiness: number;
  masteredSkills: number;
  totalSkills: number;
  dueReviews: number;
}
