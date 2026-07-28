import { lessonForSkill } from "@/content/lessons";
import type { PersistedState } from "@/lib/store";
import {
  buildDiagnosticQueue,
  buildExamQueue,
  buildSkillQueue,
  buildTodayQueue,
  type QueueItem,
} from "@/lib/scheduler";
import { EXAM_SIZE } from "@/lib/pedagogy";
import type { SessionMode } from "@/types/content";
import type { SessionStep, TeachStep } from "./types";

function teachDeck(skillId: string): TeachStep[] {
  const lesson = lessonForSkill(skillId);
  if (!lesson) return [];
  const steps: TeachStep[] = [];

  if (lesson.intro) {
    const intro = lesson.intro;
    steps.push({
      kind: "teach",
      teach: "intro",
      skillId,
      text: intro.caption,
      intro,
    });
  }

  steps.push({
    kind: "teach",
    teach: "eli5",
    skillId,
    text: lesson.eli5,
  });

  if (lesson.analogy) {
    steps.push({
      kind: "teach",
      teach: "analogy",
      skillId,
      text: lesson.analogy,
    });
  }
  if (lesson.demo) {
    steps.push({
      kind: "teach",
      teach: "demo",
      skillId,
      text: lesson.demo.goal,
      goal: lesson.demo.goal,
      spec: lesson.demo.spec,
    });
  }
  if (lesson.workedExample) {
    steps.push({
      kind: "teach",
      teach: "worked",
      skillId,
      text: lesson.workedExample,
    });
  }
  steps.push({
    kind: "teach",
    teach: "grok",
    skillId,
    text: "Ready to try a few? Practice locks this idea in.",
  });
  return steps;
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
  if (mode === "placement") {
    return problemsFrom(buildDiagnosticQueue());
  }
  // skill
  const skillId = opts?.skillId;
  if (!skillId) return [];
  const grokked = state.grokked.includes(skillId);
  const force = opts?.forceTeach;
  const deck = !grokked || force ? teachDeck(skillId) : [];
  const practice = problemsFrom(buildSkillQueue(skillId, state, 8));
  return [...deck, ...practice];
}
