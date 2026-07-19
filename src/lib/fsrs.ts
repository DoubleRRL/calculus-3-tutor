/** FSRS-lite scheduler for skill review cards */

import type { ReviewCard } from "@/types/content";

const DAY = 86_400_000;

export type FsrsState = Omit<ReviewCard, "skillId">;

export function newCard(now = Date.now()): FsrsState {
  return {
    dueAt: now,
    stability: 1,
    difficulty: 5,
    reps: 0,
    lapses: 0,
    lastReviewAt: null,
  };
}

/** grade: 1 again, 2 hard, 3 good, 4 easy */
export function review(
  card: FsrsState,
  grade: 1 | 2 | 3 | 4,
  now = Date.now(),
): FsrsState {
  let { stability, difficulty, reps, lapses } = card;

  if (grade === 1) {
    lapses += 1;
    stability = Math.max(0.5, stability * 0.5);
    difficulty = Math.min(10, difficulty + 1);
    return {
      dueAt: now + 0.5 * DAY,
      stability,
      difficulty,
      reps: reps + 1,
      lapses,
      lastReviewAt: now,
    };
  }

  const factor = grade === 2 ? 1.2 : grade === 3 ? 2.0 : 2.8;
  stability = Math.max(
    1,
    stability * factor * (11 - difficulty) * 0.15 + stability,
  );
  difficulty = Math.max(
    1,
    difficulty + (grade === 2 ? 0.2 : grade === 4 ? -0.3 : 0),
  );
  const intervalDays = Math.min(60, Math.max(1, stability));

  return {
    dueAt: now + intervalDays * DAY,
    stability,
    difficulty,
    reps: reps + 1,
    lapses,
    lastReviewAt: now,
  };
}

export function isDue(card: FsrsState, now = Date.now()): boolean {
  return card.dueAt <= now;
}
