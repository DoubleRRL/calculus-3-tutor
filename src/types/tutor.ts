/**
 * Tutor-domain types: the escalation ladder, per-item rescue artifacts, and
 * the post-session diagnosis that drives the next day's practice.
 *
 * These live apart from `content.ts` because they describe a *session*, not
 * authored curriculum.
 */

import type { ItemKind, ProblemItem, SessionMode, Skill } from "./content";

/**
 * The medium the tutor reaches for. Advancement is decided by the app from
 * detected stall — never by the model, and never by a tap count.
 *
 * Order matters: it is the escalation order.
 */
export type TutorMode = "talk" | "board" | "clay" | "walk" | "reveal";

export const TUTOR_MODE_ORDER: readonly TutorMode[] = [
  "talk",
  "board",
  "clay",
  "walk",
  "reveal",
] as const;

export function isTutorMode(v: unknown): v is TutorMode {
  return (
    v === "talk" ||
    v === "board" ||
    v === "clay" ||
    v === "walk" ||
    v === "reveal"
  );
}

export function modeIndex(mode: TutorMode): number {
  return TUTOR_MODE_ORDER.indexOf(mode);
}

/** Advance at most one rung per turn. Clamped at both ends. */
export function escalate(mode: TutorMode, steps = 1): TutorMode {
  const i = Math.min(
    Math.max(modeIndex(mode) + steps, 0),
    TUTOR_MODE_ORDER.length - 1,
  );
  return TUTOR_MODE_ORDER[i]!;
}

/** Never step back down — the kid should not have to un-learn help. */
export function deescalate(mode: TutorMode, steps = 1): TutorMode {
  const i = Math.max(modeIndex(mode) - steps, 0);
  return TUTOR_MODE_ORDER[i]!;
}

/** `reveal` is the only mode that costs the mastery flag. */
export function modeCostsMastery(mode: TutorMode): boolean {
  return mode === "reveal";
}

export type Verdict = "empty" | "correct" | "wrong";

/** A single point of ink on a whiteboard. */
export interface InkPoint {
  x: number;
  y: number;
  /** Pointer pressure, 0..1. Defaults to 0.5 for generated strokes. */
  p: number;
}

export type StrokeAuthor = "kid" | "rocky";

export interface InkStroke {
  /** Ordered points; rendered via perfect-freehand's outline. */
  points: InkPoint[];
  author: StrokeAuthor;
  /** Named palette role so strokes re-theme with the app. */
  tone: "ink" | "accent" | "brass" | "muted";
  /** Stroke width multiplier. */
  weight?: number;
  /** Epoch ms. */
  at: number;
  /** Optional transcription of what Rocky wrote here, for the prompt. */
  label?: string;
}

export interface BoardArtifact {
  itemId: string;
  strokes: InkStroke[];
  /** Rule text Rocky stated, if any. */
  statedRule?: string;
}

/** Widget state captured at the moment of rescue, in play (ungraded) mode. */
export interface ClayArtifact {
  itemId: string;
  /** Which widget was opened. */
  specType: string;
  /** Serialised widget state at dismissal. */
  state: string;
}

/**
 * Everything the app knows about how the learner engaged one problem.
 * This is the evidence base for the post-session diagnosis.
 */
export interface ItemTrace {
  itemId: string;
  skillId: string;
  kind: ItemKind;
  correct: boolean;
  revealed: boolean;
  /** Final ladder mode reached. */
  mode: TutorMode;
  /** Coach turns spent on this item. */
  coachTurns: number;
  /** How many times the learner insisted on a direct answer. */
  insists: number;
  board?: BoardArtifact;
  clay?: ClayArtifact;
  at: number;
}

/** Per-item tutor state. Lives for one problem, not the whole session. */
export interface TutorState {
  mode: TutorMode;
  turn: number;
  /** Normalised questions already asked, used to detect repetition. */
  askedQuestions: string[];
  /** Sub-steps the learner has already cleared. */
  clearedSteps: string[];
  insists: number;
  lastVerdict: Verdict;
  /** Last submitted answer, to spot a learner who is not changing anything. */
  lastAnswer: string;
  /** Ladder rungs already opened, so content is never repeated. */
  openedModes: TutorMode[];
}

/** A misconception the diagnosis believes is costing marks. */
export interface SkillGap {
  skillId: string;
  /** Misconception tags from the items that were missed. */
  tags: string[];
  wrongAttempts: number;
  totalAttempts: number;
  /** 0..1 — share of attempts on this skill that failed. */
  failureRate: number;
  /** Deepest rung needed to clear an item. */
  deepestMode: TutorMode;
  /** True when the learner needed a drawn/played representation. */
  neededVisual: boolean;
}

export interface PlanStep {
  skillId: string;
  itemIds: string[];
  reason: string;
  /** Higher runs first within the plan. */
  priority: number;
}

export interface SessionDiagnosis {
  at: number;
  mode: SessionMode;
  /** Unique item ids considered, for idempotency. */
  sampleSize: number;
  gaps: SkillGap[];
  /** Ordered plan for the next session. */
  plan: PlanStep[];
  /** Optional one-paragraph LLM narration. Never load-bearing. */
  narration?: string;
}

export type { ProblemItem, Skill };