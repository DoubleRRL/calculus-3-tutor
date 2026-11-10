export interface PrimerMasteryAttempt {
  kind: string;
  correct: boolean;
  usedHint: boolean;
  revealed: boolean;
}

/**
 * A primer is mastered only when the mastery item was answered cleanly and at
 * least one other item was also clean. One correct mastery item is not enough.
 */
export function isPrimerMastered(history: PrimerMasteryAttempt[]): boolean {
  const mastery = history.find((attempt) => attempt.kind === "mastery");
  if (!mastery?.correct || mastery.usedHint || mastery.revealed) return false;
  const clean = history.filter(
    (attempt) => attempt.correct && !attempt.usedHint && !attempt.revealed,
  );
  return clean.length >= 2;
}
