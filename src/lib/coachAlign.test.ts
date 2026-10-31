import { describe, expect, it } from "vitest";
import type { ProblemItem } from "@/types/content";
import {
  extractAnswerLikeTokens,
  extractClaimedAnswer,
  hintCanonicalDrift,
  machineGradeOf,
  promptAskMismatch,
  askedQuantity,
  sanitizeCoachReply,
} from "./coachAlign";

const speedItem: ProblemItem = {
  id: "u2_al_guided",
  skillId: "u2_arc_length",
  kind: "guided",
  prompt:
    "$\\mathbf{r}(t)=\\langle \\cos 2t, \\sin 2t, 0\\rangle$ on $[0,\\pi]$. Not asking for $L$. Constant speed $\\|\\mathbf{r}'\\|=$?",
  answerType: "numeric",
  answer: "2",
  hints: {
    nudge: "$\\mathbf{r}'=\\langle -2\\sin 2t, 2\\cos 2t, 0\\rangle$",
    technique: "$\\|\\mathbf{r}'\\|=2$",
    nextStep: "2",
    fullSolution: "Speed is 2",
  },
  misconceptionTags: ["ARC_LENGTH"],
  rubric: "2",
  difficulty: 2,
};

describe("machineGradeOf", () => {
  it("labels empty / wrong / correct", () => {
    expect(machineGradeOf(speedItem, "")).toBe("empty");
    expect(machineGradeOf(speedItem, "2pi")).toBe("wrong");
    expect(machineGradeOf(speedItem, "2")).toBe("correct");
  });
});

describe("extractClaimedAnswer", () => {
  it("takes last $...$ in a Final answer sentence", () => {
    expect(
      extractClaimedAnswer("Not quite. Final answer: $2\\pi$. Try speed."),
    ).toBe("2\\pi");
  });

  it("takes 2π without dollars", () => {
    expect(extractClaimedAnswer("The answer is 2π")).toBe("2π");
  });

  it("returns null when there is no claim phrase", () => {
    expect(extractClaimedAnswer("Speed is constant. What is ||r'||?")).toBe(
      null,
    );
  });
});

describe("sanitizeCoachReply", () => {
  it("strips a Final-answer claim the grader rejects", () => {
    const out = sanitizeCoachReply(
      speedItem,
      "2pi",
      "Yes — that is arc length. Final answer: $2\\pi$.",
    );
    expect(out).not.toMatch(/2\\pi|2π|Final answer/i);
    expect(out).toMatch(/graded wrong/);
    expect(out).not.toMatch(/\b2\b/);
  });

  it("keeps a Final-answer claim the grader accepts", () => {
    const reply = "You insisted. Final answer: $2$.";
    expect(sanitizeCoachReply(speedItem, "2", reply)).toBe(reply);
  });

  it("leaves the reply when extraction fails", () => {
    const reply = "The answer is the constant speed.";
    expect(sanitizeCoachReply(speedItem, "2pi", reply)).toBe(reply);
  });
});

describe("hintCanonicalDrift", () => {
  it("does not flag the consistent speed item", () => {
    expect(hintCanonicalDrift(speedItem)).toBeNull();
  });

  it("flags solution text 2π when the graded answer is 2", () => {
    const drifted: ProblemItem = {
      ...speedItem,
      hints: {
        ...speedItem.hints,
        nextStep: "L=2π",
        fullSolution: "Arc length is 2π",
      },
    };
    expect(hintCanonicalDrift(drifted)).toMatch(/drift/);
  });

  it("does not flag 2π in the solution if the canonical 2 also appears", () => {
    const mixed: ProblemItem = {
      ...speedItem,
      hints: {
        ...speedItem.hints,
        nextStep: "Not L=2π",
        fullSolution: "Speed is 2",
      },
    };
    expect(hintCanonicalDrift(mixed)).toBeNull();
  });

  it("treats 2π as one token", () => {
    expect(extractAnswerLikeTokens("L=2π")).toContain("2π");
    expect(extractAnswerLikeTokens("L=2π").some((t) => t === "2")).toBe(false);
  });

  it("does not flag exact items whose solution contains the canonical expression", () => {
    const exact: ProblemItem = {
      ...speedItem,
      answerType: "exact",
      answer: "30x(3x^2+1)^4",
      accept: ["5(3x^2+1)^4 * 6x"],
      hints: {
        ...speedItem.hints,
        nextStep: "$f'(x) = 5(3x^2+1)^4 \\cdot 6x$",
        fullSolution:
          "$f'(x) = 5(3x^2+1)^4 \\cdot 6x = 30x(3x^2+1)^4$",
      },
    };
    expect(hintCanonicalDrift(exact)).toBeNull();
  });

  it("does not flag tuple solutions written with \\langle \\rangle", () => {
    const tup: ProblemItem = {
      ...speedItem,
      answerType: "tuple",
      answer: "t,t^2,0",
      accept: ["t, t^2, 0"],
      hints: {
        ...speedItem.hints,
        nextStep: "$\\langle t, t^2, 0\\rangle$",
        fullSolution: "$\\langle t, t^2, 0\\rangle$",
      },
    };
    expect(hintCanonicalDrift(tup)).toBeNull();
  });

  it("flags hints that never contain the canonical", () => {
    const missing: ProblemItem = {
      ...speedItem,
      hints: {
        ...speedItem.hints,
        nextStep: "compute the speed",
        fullSolution: "speed is constant",
      },
    };
    expect(hintCanonicalDrift(missing)).toMatch(/missing canonical/);
  });
});

describe("promptAskMismatch", () => {
  it("accepts the disambiguated speed item on the arc-length skill", () => {
    expect(askedQuantity(speedItem.prompt)).toBe("speed");
    expect(promptAskMismatch(speedItem)).toBeNull();
  });

  it("flags arc-length skill asking speed without disambiguating L", () => {
    const bad: ProblemItem = {
      ...speedItem,
      prompt:
        "$\\mathbf{r}(t)=\\langle \\cos 2t, \\sin 2t, 0\\rangle$ on $[0,\\pi]$. Constant speed $\\|\\mathbf{r}'\\|=$?",
    };
    expect(promptAskMismatch(bad)).toMatch(/disambiguating L/);
  });

  it("flags last-ask speed when the graded answer is 2π", () => {
    const asL: ProblemItem = {
      ...speedItem,
      answer: "2\\pi",
      accept: ["2pi", "2π"],
    };
    expect(promptAskMismatch(asL)).toMatch(/π/);
  });

  it("does not flag a true arc-length ask whose answer is 2π", () => {
    const L: ProblemItem = {
      ...speedItem,
      prompt:
        "For $\\mathbf{r}(t)=\\langle \\cos t,\\sin t,0\\rangle$ on $[0,2\\pi]$, $L=?$",
      answer: "2\\pi",
      accept: ["2pi", "2π"],
      hints: {
        ...speedItem.hints,
        nextStep: "$L=2\\pi$",
        fullSolution: "$L=2\\pi$",
      },
    };
    expect(askedQuantity(L.prompt)).toBe("arcLength");
    expect(promptAskMismatch(L)).toBeNull();
  });
});
