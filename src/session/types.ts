import type { LessonPage } from "@/content/lessons";
import type { ProblemItem } from "@/types/content";
import type { QueueItem } from "@/lib/scheduler";

/** Single teach block: paged lesson + knowledge review (one progress segment). */
export type TeachStep = {
  kind: "teach";
  teach: "lesson";
  skillId: string;
  hook?: string;
  pages: LessonPage[];
  glossaryIds: string[];
};

export type ProblemStep = {
  kind: "problem";
  queue: QueueItem;
};

export type SessionStep = TeachStep | ProblemStep;

export function isTeach(step: SessionStep): step is TeachStep {
  return step.kind === "teach";
}

export function problemItem(step: ProblemStep): ProblemItem {
  return step.queue.item;
}
