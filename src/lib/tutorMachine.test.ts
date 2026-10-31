import { describe, expect, it } from "vitest";
import {
  assessStall,
  coerceMode,
  hasRevealed,
  initTutorState,
  isInsist,
  isRepeatQuestion,
  ladderSource,
  nextDistinctSource,
  normaliseQuestion,
  openedModes,
  questionSimilarity,
  questionTokens,
  tutorReducer,
  type TutorEvent,
} from "./tutorMachine";
import { escalate, modeIndex, type TutorMode, type TutorState } from "@/types/tutor";
import type { HintLadder } from "@/types/content";

/** Drive a list of events from a fresh state. */
function run(events: TutorEvent[], from = initTutorState()): TutorState {
  return events.reduce((s, e) => tutorReducer(s, e).state, from);
}

const LADDER: HintLadder = {
  nudge: "Differentiate each component separately.",
  technique: "d/dt sin t = cos t",
  nextStep: "The first component is cos t",
  fullSolution: "r'(t) = <cos t, -sin t, 1>",
};

describe("normaliseQuestion / similarity", () => {
  it("strips math delimiters and commands but keeps the symbol", () => {
    // normaliseQuestion lowercases and strips delimiters; dropping stopwords
    // is questionTokens' job, so "what is the" survives here.
    expect(normaliseQuestion("What is the $\\mathbf{v}$?")).toBe("what is the v");
    expect([...questionTokens("What is the $\\mathbf{v}$?")]).toEqual(["v"]);
  });

  it("treats a reworded question as similar", () => {
    const a = "What is the first component of the derivative?";
    const b = "What is the first component of r prime?";
    expect(questionSimilarity(a, b)).toBeGreaterThan(0.6);
  });

  it("treats genuinely different questions as dissimilar", () => {
    const a = "What is the arc length of the curve?";
    const b = "What is the divergence of the field?";
    expect(questionSimilarity(a, b)).toBeLessThan(0.3);
  });

  it("keeps numbers so 2+2 and 3+4 differ", () => {
    expect(isRepeatQuestion("what is 2+2", ["what is 3+4"])).toBe(false);
  });

  it("detects an identical repeat", () => {
    expect(isRepeatQuestion("what is the first component?", [
      "what is the first component?",
    ])).toBe(true);
  });

  it("does not flag the first question as a repeat", () => {
    expect(isRepeatQuestion("what is the first component?", [])).toBe(false);
  });

  it("ignores empty candidates rather than matching everything", () => {
    expect(isRepeatQuestion("", ["anything at all"])).toBe(false);
    expect(isRepeatQuestion("   ", ["anything"])).toBe(false);
  });
});

describe("isInsist", () => {
  const demands = [
    "just tell me",
    "Just tell me the answer",
    "give me the answer please",
    "what's the answer",
    "stop being socratic",
    "i give up",
    "just answer",
  ];
  for (const d of demands) {
    it(`counts "${d}" as an insist`, () => expect(isInsist(d)).toBe(true));
  }

  const notDemands = [
    "I don't get part b",
    "can you check my cross product",
    "why is it negative",
    "where do I start",
    "is this right?",
    "",
  ];
  for (const d of notDemands) {
    it(`does not count "${d}" as an insist`, () => expect(isInsist(d)).toBe(false));
  }
});

describe("mode escalation is one rung per turn", () => {
  it("starts in talk", () => {
    expect(initTutorState().mode).toBe("talk");
  });

  it("does not escalate a first distinct question", () => {
    const { state, advanced } = tutorReducer(initTutorState(), {
      type: "reply",
      question: "What is the first component of r prime?",
    });
    expect(state.mode).toBe("talk");
    expect(advanced).toBeNull();
    expect(state.turn).toBe(1);
  });

  it("escalates exactly one rung when a question repeats", () => {
    const first = run([
      { type: "reply", question: "What is the first component?" },
    ]);
    const { state, advanced } = tutorReducer(first, {
      type: "reply",
      question: "What is the first component?", // same question again
    });
    expect(advanced).toBe("repeat-question");
    expect(state.mode).toBe("board");
    expect(modeIndex(state.mode)).toBe(modeIndex("talk") + 1);
  });

  it("never jumps more than one rung even on a double stall", () => {
    let s = run([
      { type: "reply", question: "same thing here" },
    ]);
    // Force a state that is already stall-ridden.
    const stalled: TutorState = { ...s, turn: 9 };
    const { state } = tutorReducer(stalled, {
      type: "reply",
      question: "same thing here",
    });
    expect(modeIndex(state.mode)).toBeLessThanOrEqual(modeIndex("talk") + 1);
  });

  it("walks the full ladder in order when stalled repeatedly", () => {
    let s = initTutorState();
    const seen: TutorMode[] = [];
    for (let i = 0; i < 8; i++) {
      // Same question every turn forces repeated escalation.
      const out = tutorReducer(s, {
        type: "reply",
        question: "the very same question",
      });
      seen.push(out.state.mode);
      s = out.state;
    }
    // Turn 1 has nothing to repeat, so talk holds; one rung per turn after.
    expect(seen).toEqual([
      "talk", "board", "clay", "walk", "walk", "walk", "walk", "walk",
    ]);
    // Repetition alone must never reach the rung that gives the answer.
    expect(seen.at(-1)).toBe("walk");
    expect(hasRevealed(s)).toBe(false);
  });
});

describe("reveal is gated on a real insist", () => {
  it("refuses to reveal on a turn cap alone", () => {
    // Push turn count past the cap without any insist.
    let s: TutorState = { ...initTutorState(), turn: 99 };
    s = run(
      Array.from({ length: 8 }, (_, i) => ({
        type: "reply" as const,
        question: `unique question number ${i} about bounds setup`,
      })),
      s,
    );
    expect(s.mode).not.toBe("reveal");
  });

  it("stays put on the first insist and moves on the second", () => {
    const one = tutorReducer(initTutorState(), { type: "insist" });
    expect(one.state.mode).toBe("board");
    expect(hasRevealed(one.state)).toBe(false);

    const two = tutorReducer(one.state, { type: "insist" });
    expect(two.state.mode).toBe("reveal");
    expect(hasRevealed(two.state)).toBe(true);
  });

  it("counts insists cumulatively", () => {
    const s = run([{ type: "insist" }, { type: "insist" }, { type: "insist" }]);
    expect(s.insists).toBe(3);
  });

  it("marks the mastery flag only once reveal has been shown", () => {
    let s = run([
      { type: "reply", question: "a question here" },
      { type: "reply", question: "a question here" },
    ]);
    expect(hasRevealed(s)).toBe(false);
    s = tutorReducer(s, { type: "insist" }).state;
    s = tutorReducer(s, { type: "insist" }).state;
    expect(hasRevealed(s)).toBe(true);
  });
});

describe("unchanged wrong answers escalate", () => {
  it("escalates when the learner resubmits the same wrong answer", () => {
    const first = run([
      { type: "submit", correct: false, answer: "2+2i", revealed: false },
    ]);
    const { state, advanced } = tutorReducer(first, {
      type: "submit",
      correct: false,
      answer: "2+2i", // identical, still wrong
      revealed: false,
    });
    expect(advanced).toBe("unchanged-answer");
    expect(state.mode).toBe("board");
  });

  it("does not escalate when the learner changes the answer", () => {
    const first = run([
      { type: "submit", correct: false, answer: "2+2i", revealed: false },
    ]);
    const { advanced } = tutorReducer(first, {
      type: "submit",
      correct: false,
      answer: "1+1i", // different attempt
      revealed: false,
    });
    expect(advanced).toBeNull();
  });

  it("does not escalate when an empty submission repeats", () => {
    const first = run([
      { type: "submit", correct: false, answer: "", revealed: false },
    ]);
    const { advanced } = tutorReducer(first, {
      type: "submit",
      correct: false,
      answer: "",
      revealed: false,
    });
    expect(advanced).toBeNull();
  });
});

describe("a clean clear resets pressure but never below talk", () => {
  it("returns to talk and clears the question history", () => {
    const stuck = run([
      { type: "reply", question: "what about this" },
      { type: "reply", question: "what about this" },
    ]);
    expect(stuck.mode).toBe("board");

    const cleared = tutorReducer(stuck, {
      type: "submit",
      correct: true,
      answer: "cos t",
      revealed: false,
    }).state;
    expect(cleared.mode).toBe("talk");
    expect(cleared.turn).toBe(0);
    expect(cleared.askedQuestions).toEqual([]);
  });

  it("records the verdict", () => {
    const wrong = run([
      { type: "submit", correct: false, answer: "x", revealed: false },
    ]);
    expect(wrong.lastVerdict).toBe("wrong");
    const empty = run([
      { type: "submit", correct: false, answer: "  ", revealed: false },
    ]);
    expect(empty.lastVerdict).toBe("empty");
  });
});

describe("settle", () => {
  it("records a cleared sub-step once", () => {
    const s = run([{ type: "settle", step: "set bounds" }]);
    expect(s.clearedSteps).toEqual(["set bounds"]);
    const again = run([{ type: "settle", step: "set bounds" }], s);
    expect(again.clearedSteps).toEqual(["set bounds"]);
  });

  it("ignores a blank step", () => {
    expect(run([{ type: "settle", step: "  " }]).clearedSteps).toEqual([]);
  });
});

describe("openedModes", () => {
  it("returns rungs in escalation order, not insertion order", () => {
    const s = run([
      { type: "reply", question: "q one here" },
      { type: "reply", question: "q one here" },
      { type: "insist" },
    ]);
    expect(openedModes(s)).toEqual(["talk", "board", "clay"]);
  });
});

describe("ladderSource", () => {
  it("maps each rung to its authored text", () => {
    expect(ladderSource(LADDER, "talk")).toBe(LADDER.nudge);
    expect(ladderSource(LADDER, "board")).toBe(LADDER.technique);
    expect(ladderSource(LADDER, "walk")).toBe(LADDER.nextStep);
    expect(ladderSource(LADDER, "reveal")).toBe(LADDER.fullSolution);
  });

  it("has no authored text for clay — the widget is the help", () => {
    expect(ladderSource(LADDER, "clay")).toBeNull();
  });
});

describe("nextDistinctSource survives a collapsed ladder", () => {
  const collapsed: HintLadder = {
    ...LADDER,
    nextStep: "cone",
    fullSolution: "cone", // the defect the lint now forbids
  };

  it("skips a rung whose text would repeat one already shown", () => {
    const s = run([
      { type: "reply", question: "a question" },
      { type: "reply", question: "a question" },
    ]);
    // board is current and distinct; walking would land on the collapsed pair.
    const next = nextDistinctSource(collapsed, s);
    expect(next).not.toBe("walk");
    expect(next).toBe("clay");
  });

  it("returns talk on a fresh state", () => {
    expect(nextDistinctSource(collapsed, initTutorState())).toBe("talk");
  });

  it("returns null once everything has been opened", () => {
    const s: TutorState = {
      ...initTutorState(),
      openedModes: ["talk", "board", "clay", "walk", "reveal"],
    };
    expect(nextDistinctSource(LADDER, s)).toBeNull();
  });
});

describe("coerceMode", () => {
  it("accepts a valid mode", () => {
    expect(coerceMode("clay")).toBe("clay");
  });
  it("rejects garbage from the model", () => {
    expect(coerceMode("ascii-art")).toBe("talk");
    expect(coerceMode(undefined)).toBe("talk");
    expect(coerceMode(7)).toBe("talk");
  });
  it("honours an explicit fallback", () => {
    expect(coerceMode("nope", "board")).toBe("board");
  });
});

describe("assessStall", () => {
  it("reports a repeat against prior questions", () => {
    const s = run([{ type: "reply", question: "why is it negative" }]);
    expect(assessStall(s, { type: "question", question: "why is it negative" })).toBe("repeat-question");
  });

  it("reports nothing for a fresh distinct question", () => {
    const s = run([{ type: "reply", question: "why is it negative" }]);
    expect(assessStall(s, { type: "question", question: "what is the flux integral" })).toBeNull();
  });

  it("reports the turn cap once exceeded", () => {
    const s: TutorState = { ...initTutorState(), turn: 3 };
    expect(assessStall(s, { type: "question", question: "something totally new here" })).toBe("turn-cap");
  });
});

describe("escalate helper bounds", () => {
  it("clamps at the terminal rung", () => {
    expect(escalate("reveal")).toBe("reveal");
    expect(escalate("reveal", 5)).toBe("reveal");
  });
  it("clamps at the floor", () => {
    expect(escalate("talk", -1)).toBe("talk");
  });
});

describe("the anti-circularity guarantee", () => {
  it("advances when the model keeps asking the same thing", () => {
    // Simulate the exact failure mode: the model re-asks the same question
    // every turn. Without app-owned escalation this is an infinite loop.
    let s = initTutorState();
    const modes: TutorMode[] = [];
    for (let i = 0; i < 6; i++) {
      s = tutorReducer(s, {
        type: "reply",
        question: "What is the first component of r prime?",
      }).state;
      modes.push(s.mode);
    }
    // Turn 1 is not yet a repeat; after that the app climbs on its own.
    expect(modes).toEqual(["talk", "board", "clay", "walk", "walk", "walk"]);
    expect(new Set(modes).size).toBe(4);
    // It never reaches the answer rung without a counted insist.
    expect(modes).not.toContain("reveal");
  });

  it("cannot be talked back down by a model proposing talk", () => {
    let s = run([
      { type: "reply", question: "a question" },
      { type: "reply", question: "a question" },
    ]);
    expect(s.mode).toBe("board");
    for (let i = 0; i < 5; i++) {
      s = tutorReducer(s, {
        type: "reply",
        question: `fresh distinct question ${i} about divergence`,
        // model insists on staying gentle
      }).state;
    }
    expect(modeIndex(s.mode)).toBeGreaterThan(modeIndex("board"));
  });
});