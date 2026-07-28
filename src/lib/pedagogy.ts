/** Central pedagogy tunables for sessions and readiness. */

export const SESSION_SIZE = 12;

export const SESSION_SIZES = [5, 12, 20] as const;

export const EXAM_SIZE = 20;

/** Fractions of Today queue — should sum to ~1. */
export const SESSION_MIX = {
  reviews: 0.25,
  active: 0.55,
  interleave: 0.2,
} as const;

/** Exam readiness composite weights — sum to 1. */
export const READINESS_WEIGHTS = {
  examSims: 0.5,
  lateUnits: 0.3,
  overallMastery: 0.2,
} as const;

export const MASTERY = {
  consecutiveClean: 4,
  minRating: 1080,
  ratingGainClean: 25,
  ratingGainRevealed: 5,
  ratingLoss: -20,
  ratingMin: 600,
  ratingMax: 1600,
} as const;

/** Stage advances when consecutiveCorrect (or seen) crosses these. */
export const STAGE_THRESHOLDS = {
  learnToGuidedSeen: 1,
  guidedToDrillStreak: 1,
  drillToMixStreak: 3,
  mixToMasteryStreak: 2,
} as const;

export const UNIT_ORDER_BIAS_FROM = 30; // skill.order >= this ≈ Unit 3+

/** @deprecated Prefer DAILY_GOAL_XP_DEFAULT from gamify — kept for v1 migration. */
export const DAILY_GOAL_DEFAULT = 1;

export const DIAGNOSTIC_SESSION_SIZE = 8;

export function defaultExamWeight(w?: number): number {
  return w && w > 0 ? w : 1;
}
