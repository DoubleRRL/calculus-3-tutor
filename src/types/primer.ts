/** Authored on-ramp items. Book exercises live in src/lib/book.ts. */

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
