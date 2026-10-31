import {
  lessonForSkill,
  synthesizeLessonPages,
} from "@/content/lessons";
import type { PersistedState } from "@/lib/store";
import {
  buildCheckpointQueue,
  buildDiagnosticQueue,
  buildExamQueue,
  buildSkillQueue,
  buildTodayQueue,
  type QueueItem,
} from "@/lib/scheduler";
import { CHECKPOINT_SIZE, EXAM_SIZE } from "@/lib/pedagogy";
import type { SessionMode } from "@/types/content";
import type { SessionStep, TeachStep } from "./types";

function shouldForceTeach(
  skillId: string,
  state: PersistedState,
  force?: boolean,
): boolean {
  if (force) return true;
  const bg = state.settings.learnerProfile?.background;
  if (
    (bg === "rusty" || bg === "refresher") &&
    skillId.startsWith("u1_")
  ) {
    return true;
  }
  return false;
}

function teachDeck(skillId: string): TeachStep[] {
  const lesson = lessonForSkill(skillId);
  if (!lesson) return [];
  return [
    {
      kind: "teach",
      teach: "lesson",
      skillId,
      hook: lesson.hook,
      pages: synthesizeLessonPages(lesson),
      glossaryIds: (lesson.glossaryIds ?? []).slice(0, 5),
    },
  ];
}

function problemsFrom(queue: QueueItem[]): SessionStep[] {
  return queue.map((q) => ({ kind: "problem" as const, queue: q }));
}

export function buildSessionSteps(
  mode: SessionMode,
  state: PersistedState,
  opts?: { skillId?: string; forceTeach?: boolean },
): SessionStep[] {
  if (mode === "today") {
    return problemsFrom(buildTodayQueue(state, state.settings.sessionSize));
  }
  if (mode === "review") {
    const q = buildTodayQueue(state, state.settings.sessionSize).filter(
      (i) => i.reason === "review",
    );
    return problemsFrom(q.length ? q : buildTodayQueue(state, 5));
  }
  if (mode === "exam") {
    return problemsFrom(buildExamQueue(EXAM_SIZE));
  }
  if (mode === "checkpoint") {
    return problemsFrom(buildCheckpointQueue(state, CHECKPOINT_SIZE));
  }
  if (mode === "placement") {
    return problemsFrom(buildDiagnosticQueue());
  }
  const skillId = opts?.skillId;
  if (!skillId) return [];
  const grokked = state.grokked.includes(skillId);
  const force = shouldForceTeach(skillId, state, opts?.forceTeach);
  const deck = !grokked || force ? teachDeck(skillId) : [];
  const practice = problemsFrom(
    buildSkillQueue(skillId, state, state.settings.sessionSize),
  );
  return [...deck, ...practice];
}
