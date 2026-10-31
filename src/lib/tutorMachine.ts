/**
 * The escalation ladder.
 *
 * The app owns the rung; the model only supplies words for the current one.
 * That inversion is deliberate: previously the model was told to "escalate only
 * if they insist twice" with no counter behind it, so it looped.
 *
 * Pure module — no React, no DOM, no model calls. Every transition is a total
 * function so it can be exhaustively tested.
 */

import type { HintLadder } from "@/types/content";
import {
  TUTOR_MODE_ORDER,
  escalate,
  isTutorMode,
  modeCostsMastery,
  modeIndex,
  type TutorMode,
  type TutorState,
  type Verdict,
} from "@/types/tutor";

export function initTutorState(): TutorState {
  return {
    mode: "talk",
    turn: 0,
    askedQuestions: [],
    clearedSteps: [],
    insists: 0,
    lastVerdict: "empty",
    lastAnswer: "",
    openedModes: [],
  };
}

export type TutorEvent =
  /**
   * A coach turn completed. The mode is deliberately absent: the app decides
   * the rung, so the model cannot propose one — least of all a lower one.
   */
  | { type: "reply"; question: string }
  /** Learner submitted an answer. */
  | { type: "submit"; correct: boolean; answer: string; revealed: boolean }
  /** Learner explicitly demanded the answer. */
  | { type: "insist" }
  /**
   * Learner said they are stuck and asked for more help.
   *
   * Distinct from `insist`: this escalates one rung but does NOT count toward
   * the two insists that unlock `reveal`. Being stuck is not demanding the answer.
   */
  | { type: "stuck" }
  /** Learner made progress on a sub-step without a full correct submit. */
  | { type: "settle"; step: string };

/** Why the ladder advanced — surfaced in the prompt and in traces. */
export type StallReason =
  | "repeat-question"
  | "unchanged-answer"
  | "insist"
  | "turn-cap";

export interface TutorOutcome {
  state: TutorState;
  /** Set when this event caused the mode to advance. */
  advanced: StallReason | null;
  /** True when the advance was suppressed by the one-rung-per-turn rule. */
  clamped: boolean;
}

/** Turns allowed at a rung before pressure escalates on its own. */
const TURN_CAP: Record<TutorMode, number> = {
  talk: 3,
  board: 2,
  clay: 2,
  walk: 2,
  reveal: Infinity,
};

/** Direct-answer demands. Matching any of these counts as an insist. */
const INSIST_PATTERNS = [
  /\bjust\s+tell\s+me\b/,
  /\bjust\s+give\s+me\b/,
  /\btell\s+me\s+the\s+answer\b/,
  /\bgive\s+me\s+the\s+answer\b/,
  /\bwhat(?:'s| is)\s+the\s+answer\b/,
  /\bwhat\s+is\s+it\b/,
  /\bstop\s+being\s+socratic\b/,
  /\bi\s+give\s+up\b/,
  /\bjust\s+answer\b/,
  /\banswer\s+please\b/,
  /\btell\s+me\s+right\s+now\b/,
];

export function isInsist(text: string): boolean {
  const t = text.toLowerCase().trim();
  return INSIST_PATTERNS.some((re) => re.test(t));
}

const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being", "of",
  "for", "to", "in", "on", "at", "by", "from", "with", "as", "if", "so", "do",
  "does", "did", "have", "has", "had", "will", "would", "should", "can",
  "could", "i", "you", "me", "my", "we", "it", "its", "that", "this", "these",
  "those", "and", "or", "but", "then", "than", "there", "here", "what", "how",
  "why", "which", "who", "not", "no", "yes", "please", "help", "know", "think",
  "get", "got", "am", "about", "into", "just", "still", "also", "any", "some",
]);

/**
 * Reduce a question to comparable content words. Math delimiters become
 * spaces but the symbols inside are kept — "what is 2+2" and "what is 3+4" are
 * genuinely different questions.
 */
export function normaliseQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/\$+/g, " ")
    .replace(/\\[a-z]+/g, " ")
    .replace(/[^\p{L}\p{N}+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function questionTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const tok of normaliseQuestion(text).split(/\s+/)) {
    if (!tok) continue;
    if (/^\d+$/.test(tok)) {
      out.add(`#${tok}`);
      continue;
    }
    if (STOPWORDS.has(tok)) continue;
    // Bare operators carry no topic, but single letters usually DO — "v" and
    // "x" are the variable under discussion, so dropping them would blind the
    // repetition detector to exactly the short questions that loop.
    if (/^[-+]+$/.test(tok)) continue;
    out.add(tok);
  }
  return out;
}

/**
 * Overlap coefficient: shared content words over the *smaller* set.
 *
 * Jaccard punishes a short repeat of a longer question ("what is the
 * divergence" inside a two-clause question). Overlap asks the question we
 * actually care about: are all the content words of one present in the other?
 */
export function questionSimilarity(a: string, b: string): number {
  const ta = questionTokens(a);
  const tb = questionTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  const smaller = Math.min(ta.size, tb.size);
  return smaller === 0 ? 0 : shared / smaller;
}

/** At or above this, two questions are "the same question again". */
export const REPEAT_THRESHOLD = 0.6;

export function isRepeatQuestion(
  candidate: string,
  prior: readonly string[],
  threshold = REPEAT_THRESHOLD,
): boolean {
  const norm = normaliseQuestion(candidate);
  if (!norm) return false;
  for (const p of prior) {
    if (normaliseQuestion(p) === norm) return true;
    if (questionSimilarity(candidate, p) >= threshold) return true;
  }
  return false;
}

function capFor(mode: TutorMode): number {
  return TURN_CAP[mode];
}

/** Can the ladder move past `reveal`? No — it is the terminal rung. */
function canAdvance(mode: TutorMode): boolean {
  return modeIndex(mode) < TUTOR_MODE_ORDER.length - 1;
}

/** What the ladder is being asked about this turn. */
export type StallProbe =
  | { type: "question"; question: string }
  | { type: "answer"; answer: string; correct: boolean }
  | { type: "insist" };

/**
 * Decide whether this turn should escalate, and why.
 * Exposed for tests and for the prompt, which states the intent to the model.
 */
export function assessStall(
  state: TutorState,
  event: StallProbe,
): StallReason | null {
  if (event.type === "insist") return "insist";

  if (event.type === "question") {
    if (isRepeatQuestion(event.question, state.askedQuestions)) {
      return "repeat-question";
    }
  }

  if (event.type === "answer" && !event.correct) {
    const prev = state.lastAnswer.trim();
    const next = event.answer.trim();
    // Learner re-submitted the identical wrong answer — nothing is moving.
    if (prev && next && prev === next && state.lastVerdict !== "correct") {
      return "unchanged-answer";
    }
  }

  if (state.turn >= capFor(state.mode)) return "turn-cap";
  return null;
}

/**
 * The rung to move to, or the current rung when nothing should move.
 *
 * `null` reason means "no stall" and never advances. `reveal` costs the
 * mastery flag, so it only opens on a counted insist.
 */
function nextAllowed(
  mode: TutorMode,
  reason: StallReason | null,
): TutorMode {
  if (reason === null) return mode;
  if (!canAdvance(mode)) return mode;
  const candidate = escalate(mode);
  if (candidate === "reveal" && reason !== "insist") return mode;
  return candidate;
}

function withMode(state: TutorState, mode: TutorMode): TutorState {
  const opened = state.openedModes.includes(mode)
    ? state.openedModes
    : [...state.openedModes, mode];
  return { ...state, mode, openedModes: opened };
}

export function tutorReducer(
  state: TutorState,
  event: TutorEvent,
): TutorOutcome {
  switch (event.type) {
    case "insist": {
      const insists = state.insists + 1;
      const bumped: TutorState = { ...state, insists };
      // Two insists unlock the reveal rung outright.
      if (insists >= 2) {
        const advanced = canAdvance(state.mode)
          ? ("reveal" as TutorMode)
          : null;
        return {
          state: advanced ? withMode({ ...bumped, turn: bumped.turn + 1 }, "reveal") : bumped,
          advanced: advanced ? "insist" : null,
          clamped: !advanced,
        };
      }
      const next = withMode(bumped, nextAllowed(state.mode, "insist"));
      return {
        state: { ...next, turn: state.turn + 1 },
        advanced: next.mode === state.mode ? null : "insist",
        clamped: next.mode === state.mode,
      };
    }

    case "stuck": {
      // Escalate one rung, but never straight to the answer.
      const next = nextAllowed(state.mode, "turn-cap");
      const candidate =
        next === "reveal" ? state.mode : next;
      const advanced = candidate !== state.mode;
      return {
        state: withMode({ ...state, turn: state.turn + 1 }, candidate),
        advanced: advanced ? "turn-cap" : null,
        clamped: !advanced,
      };
    }

    case "reply": {
      // Assess against questions asked BEFORE this turn, never including this
      // one — otherwise every question trivially repeats itself.
      const priorQuestions = state.askedQuestions;
      const turn = state.turn + 1;
      const reason = assessStall(state, { type: "question", question: event.question });
      const candidate = nextAllowed(state.mode, reason);
      const advanced = candidate !== state.mode;
      return {
        state: withMode(
          { ...state, askedQuestions: [...priorQuestions, event.question], turn },
          candidate,
        ),
        advanced: advanced ? reason : null,
        clamped: !advanced,
      };
    }

    case "submit": {
      const answer = event.answer;
      const verdict: Verdict = event.correct ? "correct" : answer.trim() ? "wrong" : "empty";
      const base: TutorState = { ...state, lastVerdict: verdict, lastAnswer: answer };

      if (verdict === "correct") {
        // A clean clear drops pressure back to talking, never below it.
        const reset: TutorState = {
          ...base,
          mode: "talk",
          turn: 0,
          askedQuestions: [],
        };
        return { state: reset, advanced: null, clamped: false };
      }

      // Assess against the PRE-event state. Passing `base` here would compare the
      // new answer against itself and fire "unchanged" on the first attempt.
      const reason = assessStall(state, { type: "answer", answer, correct: false });
      const candidate = nextAllowed(state.mode, reason);
      const advanced = candidate !== state.mode;
      const revealed = event.revealed || modeCostsMastery(state.mode);
      return {
        state: withMode(
          { ...base, turn: state.turn + 1 },
          candidate,
        ),
        advanced: advanced ? reason : null,
        clamped: !advanced && !revealed,
      };
    }

    case "settle": {
      const step = event.step.trim();
      if (!step) return { state, advanced: null, clamped: false };
      if (state.clearedSteps.includes(step)) {
        return { state, advanced: null, clamped: false };
      }
      return {
        state: { ...state, clearedSteps: [...state.clearedSteps, step] },
        advanced: null,
        clamped: false,
      };
    }

    default:
      return { state, advanced: null, clamped: false };
  }
}

/** Rungs the learner has actually been shown, in escalation order. */
export function openedModes(state: TutorState): TutorMode[] {
  return TUTOR_MODE_ORDER.filter((m) => state.openedModes.includes(m));
}

/** Does the learner still owe an honest attempt? Drives the mastery flag. */
export function hasRevealed(state: TutorState): boolean {
  return state.openedModes.some(modeCostsMastery);
}

/**
 * Authored text that backs each rung. The hint ladder is no longer *the* ladder
 * — it is the source material the ladder draws on, one rung at a time.
 */
export function ladderSource(hints: HintLadder, mode: TutorMode): string | null {
  switch (mode) {
    case "talk":
      return hints.nudge;
    case "board":
      return hints.technique;
    case "clay":
      // No authored text: the widget is the help. The UI supplies it instead.
      return null;
    case "walk":
      return hints.nextStep;
    case "reveal":
      return hints.fullSolution;
    default:
      return null;
  }
}

/**
 * The first rung whose authored text differs from every rung already opened.
 *
 * Defends against a collapsed ladder: if `nextStep` and `fullSolution` are the
 * same string, `reveal` would show nothing new. Now that the lint forbids this
 * in content, this is belt-and-braces.
 */
export function nextDistinctSource(
  hints: HintLadder,
  state: TutorState,
): TutorMode | null {
  const seen = new Set(
    state.openedModes
      .map((m) => ladderSource(hints, m))
      .filter((s): s is string => Boolean(s && s.trim()))
      .map(normaliseQuestion),
  );
  for (const mode of TUTOR_MODE_ORDER) {
    if (state.openedModes.includes(mode)) continue;
    if (mode === "clay") return mode;
    const src = ladderSource(hints, mode);
    if (!src || !src.trim()) continue;
    if (seen.has(normaliseQuestion(src))) continue;
    return mode;
  }
  return null;
}

/** Explicit "still stuck" from the learner — one rung, never the answer. */
export function escalateTutor(state: TutorState): TutorState {
  return tutorReducer(state, { type: "stuck" }).state;
}

/** Human label for the rung, used in the transcript and the traces. */
export const MODE_LABEL: Record<TutorMode, string> = {
  talk: "Asking a smaller question",
  board: "Stating the rule and drawing it",
  clay: "Letting you play with it",
  walk: "Walking the steps",
  reveal: "Full solution",
};

/** Clamp a mode arriving from untrusted model output. */
export function coerceMode(raw: unknown, fallback: TutorMode = "talk"): TutorMode {
  return isTutorMode(raw) ? raw : fallback;
}