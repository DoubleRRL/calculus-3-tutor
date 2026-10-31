/**
 * Reading the coach's structured reply.
 *
 * The model is asked for two header lines (`V:` verdict, `Q:` the one question)
 * followed by prose. A local 8B will sometimes ignore the format, so every
 * failure mode here degrades to "treat the whole reply as prose" rather than
 * dropping the turn.
 */

import type { Verdict } from "@/types/tutor";

export interface ParsedReply {
  /** Shown to the learner. Headers stripped. */
  text: string;
  /** What the coach asked, for repetition detection. Empty if it only stated a fact. */
  question: string;
  /** The model's self-reported verdict. Trusted only as a cross-check. */
  verdict: Verdict | null;
  /** True when the headers were present and well-formed. */
  structured: boolean;
}

const VERDICTS: Record<string, Verdict> = {
  correct: "correct",
  right: "correct",
  wrong: "wrong",
  incorrect: "wrong",
  empty: "empty",
};

/** `-`, `none`, `n/a`, or blank all mean "asked nothing". */
const NO_QUESTION = new Set(["-", "--", "none", "n/a", "na", "nothing", ""]);

function cleanQuestion(raw: string): string {
  const q = raw.trim();
  if (NO_QUESTION.has(q.toLowerCase())) return "";
  // A "question" line that is really a paragraph is a formatting failure, not
  // a question. Keep it short so it cannot poison the repetition history.
  const firstSentence = q.split(/(?<=[.?!])\s+/)[0] ?? q;
  return firstSentence.trim().slice(0, 200);
}

export function parseCoachReply(raw: string): ParsedReply {
  const text = raw.replace(/^\s+/, "");
  if (!text) {
    return { text: "", question: "", verdict: null, structured: false };
  }

  const lines = text.split("\n");
  let idx = 0;
  let verdict: Verdict | null = null;
  let question = "";
  let sawHeader = false;

  // Allow at most two leading blank-ish lines before the headers.
  while (idx < lines.length && idx < 3 && !lines[idx]!.trim()) idx += 1;

  const vLine = lines[idx]?.trim() ?? "";
  const vMatch = /^v\s*[:：]\s*(.+)$/i.exec(vLine);
  if (vMatch) {
    const key = vMatch[1]!.trim().toLowerCase().replace(/[^a-z]/g, "");
    verdict = VERDICTS[key] ?? null;
    sawHeader = true;
    idx += 1;
  }

  const qLine = lines[idx]?.trim() ?? "";
  const qMatch = /^q\s*[:：]\s*(.*)$/i.exec(qLine);
  if (qMatch) {
    question = cleanQuestion(qMatch[1] ?? "");
    sawHeader = true;
    idx += 1;
  }

  const body = lines.slice(idx).join("\n").trim();

  // A well-formed reply always has a body. If the model emitted headers and
  // nothing else, the headers themselves were the message.
  if (sawHeader && !body) {
    return { text: "", question, verdict, structured: true };
  }

  return {
    text: body || text,
    question,
    verdict,
    structured: sawHeader && Boolean(body),
  };
}