import type { HintLadder, ProblemItem } from "@/types/content";

/** Require explicit hints — no generic integral fallback. */
export function item(
  partial: Omit<ProblemItem, "hints"> & { hints: HintLadder },
): ProblemItem {
  const { hints } = partial;
  if (
    !hints.nudge?.trim() ||
    !hints.technique?.trim() ||
    !hints.nextStep?.trim() ||
    !hints.fullSolution?.trim()
  ) {
    throw new Error(`Item ${partial.id} is missing a complete hint ladder`);
  }
  return { ...partial, hints };
}

export const BANNED_HINT_PHRASES = [
  "Identify the region and the natural coordinates",
  "Write limits before integrating",
  "Simplify the iterated integral",
] as const;

export function assertItemHints(items: ProblemItem[]): void {
  for (const it of items) {
    const blob = [
      it.hints.nudge,
      it.hints.technique,
      it.hints.nextStep,
      it.hints.fullSolution,
    ].join("\n");
    for (const phrase of BANNED_HINT_PHRASES) {
      if (blob.includes(phrase)) {
        throw new Error(
          `Item ${it.id} still has banned generic hint phrase: "${phrase}"`,
        );
      }
    }
    if (
      !it.hints.nudge.trim() ||
      !it.hints.technique.trim() ||
      !it.hints.nextStep.trim() ||
      !it.hints.fullSolution.trim()
    ) {
      throw new Error(`Item ${it.id} has empty hint level(s)`);
    }
  }
}
