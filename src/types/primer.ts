/** Authored on-ramp items. Book exercises live in src/lib/book.ts. */

import type { RegionInteraction } from "./interactions";

export type PrimerItemKind = "learn" | "guided" | "drill" | "mix" | "mastery";

export type PrimerAnswerType = "exact" | "numeric" | "choice" | "clickFill" | "tuple";

export interface PrimerHintLadder {
  nudge: string;
  technique: string;
  nextStep: string;
  fullSolution: string;
}

export interface PrimerItem {
  id: string;
  skillId: string;
  kind: PrimerItemKind;
  prompt: string;
  answerType: PrimerAnswerType;
  answer: string;
  accept?: string[];
  choices?: string[];
  tupleUnordered?: boolean;
  tupleLabels?: string[];
  tupleSkeleton?: string;
  hints: PrimerHintLadder;
  misconceptionTags: string[];
  rubric: string;
  fadePrompt?: string;
  difficulty: 1 | 2 | 3 | 4;
  examWeight?: number;
}

export interface PrimerWorkedExample {
  prompt: string;
  solution: string;
}

export interface PrimerDemo {
  goal: string;
  spec: RegionInteraction;
}

export interface PrimerLesson {
  skillId: string;
  eli5: string;
  analogy?: string;
  /** One-line topic tip shown above the example. */
  firstMove?: string;
  /** Structured (revealable) or a complete legacy baby example. */
  workedExample?: PrimerWorkedExample | string;
  demo?: PrimerDemo;
  glossaryIds?: string[];
}
