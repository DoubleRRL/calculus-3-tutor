import { describe, expect, it } from "vitest";
import type { AppSettings, ProblemItem } from "@/types/content";
import { buildSystemPrompt, buildUserPayload, type CoachContext } from "./ollama";
import { initTutorState } from "./tutorMachine";
import type { TutorState } from "@/types/tutor";

const settings: AppSettings = {
  tutorModel: "qwen3:8b",
  analysisModel: "",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  onboardingDone: true,
  personalizerDone: true,
  learnerProfile: null,
  sessionSize: 5,
  theme: "light",
  dailyGoalXp: 20,
  coachFollowStream: true,
};

const item: ProblemItem = {
  id: "u2_al_guided",
  skillId: "u2_arc_length",
  kind: "guided",
  prompt:
    "$\\mathbf{r}(t)=\\langle \\cos 2t, \\sin 2t, 0\\rangle$ on $[0,\\pi]$. Not asking for $L$. Constant speed $\\|\\mathbf{r}'\\|=$?",
  answerType: "numeric",
  answer: "2",
  accept: ["2.0"],
  hints: {
    nudge: "n",
    technique: "t",
    nextStep: "2",
    fullSolution: "Speed is 2",
  },
  misconceptionTags: ["ARC_LENGTH"],
  rubric: "2",
  difficulty: 2,
};

function ctx(
  attempt: string,
  tutor: TutorState = initTutorState(),
  turn = 1,
): CoachContext {
  return {
    item,
    skillTitle: "Arc length",
    skillObjective: "Compute arc length of a space curve.",
    attempt,
    tutor,
    turn,
  };
}

describe("practice coach prompt", () => {
  it("injects GRADED one-liner and skill-is-not-the-question", () => {
    const sys = buildSystemPrompt(ctx("2pi"), settings);
    expect(sys).toMatch(/GRADED: 2 \(secret\)/);
    expect(sys).toMatch(/PROBLEM text is the question, not the skill title/);
    expect(sys).not.toMatch(/ASKS FOR/);
    expect(sys).not.toMatch(/GRADED ANSWER/);
    expect(sys).not.toMatch(/ACCEPT:/);
    expect(sys).not.toMatch(/LESSON INTRO/);
  });

  // The escalation rule used to be an instruction with no counter behind it.
  // It is now app-owned, so the prompt states the rung and the history.
  it("states the current rung instead of asking the model to escalate", () => {
    const sys = buildSystemPrompt(ctx("2pi"), settings);
    expect(sys).toMatch(/RUNG: talk/);
    expect(sys).toMatch(/V: correct\|wrong\|empty/);
    expect(sys).not.toMatch(/escalate toward the answer only if/i);
    expect(sys).not.toMatch(/Hint level:/);
  });

  it("lists questions already asked so the model cannot repeat itself", () => {
    const asked = initTutorState();
    asked.askedQuestions = [
      "What is the first component of r prime?",
      "Which component is constant?",
    ];
    const sys = buildSystemPrompt(ctx("", asked, 3), settings);
    expect(sys).toMatch(/YOU ALREADY ASKED/);
    expect(sys).toMatch(/first component of r prime/);
    expect(sys).toMatch(/do not repeat/i);
  });

  it("tells the model when the learner has demanded the answer", () => {
    const insistent = initTutorState();
    insistent.insists = 2;
    const sys = buildSystemPrompt(ctx("", insistent, 5), settings);
    expect(sys).toMatch(/ASKED FOR THE ANSWER 2/);
    expect(sys).toMatch(/entitled to it/);
  });

  it("restates the problem only on the first turn", () => {
    const first = buildUserPayload(ctx("", initTutorState(), 1), "where do I start");
    expect(first).toMatch(/FIRST TURN ON THIS PROBLEM/);
    expect(first).toMatch(/PROBLEM:/);

    const later = buildUserPayload(ctx("", initTutorState(), 4), "still stuck");
    expect(later).not.toMatch(/FIRST TURN/);
    expect(later).not.toMatch(/^PROBLEM:/m);
    expect(later).toMatch(/Same problem as turn 1/);
  });

  it("injects GRADE of the current attempt", () => {
    expect(buildUserPayload(ctx("2pi"), "check")).toMatch(/^GRADE: wrong$/m);
    expect(buildUserPayload(ctx("2"), "check")).toMatch(/^GRADE: correct$/m);
    expect(buildUserPayload(ctx(""), "hint")).toMatch(/^GRADE: empty$/m);
  });

  it("does not inject GRADED or GRADE on lesson intro", () => {
    const intro = {
      ...ctx(""),
      lessonIntro: "Arc length is the distance along a curve.",
    };
    expect(buildSystemPrompt(intro, settings)).not.toMatch(/GRADED:/);
    expect(buildUserPayload(intro, "what")).not.toMatch(/^GRADE:/m);
  });
});
