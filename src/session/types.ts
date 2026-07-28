import type { InteractionSpec } from "@/types/interactions";
import type { LessonIntro } from "@/content/lessons";
import type { ProblemItem } from "@/types/content";
import type { QueueItem } from "@/lib/scheduler";

export type TeachKind =
  | "intro"
  | "eli5"
  | "analogy"
  | "demo"
  | "worked"
  | "grok";

export type TeachStep = {
  kind: "teach";
  teach: TeachKind;
  skillId: string;
  text: string;
  goal?: string;
  spec?: InteractionSpec;
  intro?: LessonIntro;
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
