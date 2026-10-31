import type { ProblemItem } from "@/types/content";
import { gradeAnswer } from "@/lib/grading";

export type MachineGrade = "empty" | "correct" | "wrong";

const CLAIM_RE = /final\s+answer|the\s+answer\s+is/i;

export function machineGradeOf(item: ProblemItem, attempt: string): MachineGrade {
  if (!attempt.trim()) return "empty";
  return gradeAnswer(item, attempt).correct ? "correct" : "wrong";
}

function tokenKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/\$/g, "")
    .replace(/\\pi/g, "pi")
    .replace(/π/g, "pi")
    .replace(/\s+/g, "");
}

function flexNorm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\$+/g, "")
    .replace(/\\cdot/g, "*")
    .replace(/\\langle/g, "")
    .replace(/\\rangle/g, "")
    .replace(/\\sqrt\s*\{([^}]+)\}/g, "sqrt$1")
    .replace(/√/g, "sqrt")
    .replace(/\\pi/g, "pi")
    .replace(/π/g, "pi")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, "");
}

function isBareNumericAnswer(s: string): boolean {
  const t = s.trim().replace(/\$/g, "");
  return /^-?\d+(?:\.\d+)?$/.test(t);
}

function blobContainsCanonical(item: ProblemItem, blob: string): boolean {
  const stripped = blob.replace(/\$+/g, " ").trim();
  if (gradeAnswer(item, stripped).correct) return true;
  for (const m of blob.matchAll(/\$([^$]+)\$/g)) {
    if (gradeAnswer(item, m[1]!.trim()).correct) return true;
  }
  for (const t of extractAnswerLikeTokens(blob)) {
    if (gradeAnswer(item, t).correct) return true;
  }
  const blobN = flexNorm(blob);
  for (const a of [item.answer, ...(item.accept ?? [])]) {
    if (isBareNumericAnswer(a)) continue;
    const an = flexNorm(a);
    if (an.length >= 2 && blobN.includes(an)) return true;
  }
  return false;
}

/** Self-contained numeric / tuple tokens (2π stays one token, not 2). */
export function extractAnswerLikeTokens(text: string): string[] {
  const s = text.replace(/\$+/g, " ");
  const found: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    const k = tokenKey(t);
    if (!k || seen.has(k)) return;
    seen.add(k);
    found.push(t);
  };

  for (const m of s.matchAll(/\\langle([\s\S]*?)\\rangle/g)) {
    if (m[1]!.includes(",")) push(m[1]!.trim());
  }
  for (const m of s.matchAll(/\\sqrt\s*\{([^}]+)\}/g)) {
    push(`\\sqrt{${m[1]}}`);
  }
  for (const m of s.matchAll(/[⟨<([][^⟩>)\]\n]{1,80}[⟩>)\]]/g)) {
    if (m[0]!.includes(",")) push(m[0]!);
  }
  for (const m of s.matchAll(
    /-?(?:\d+(?:\.\d+)?(?:\s*\/\s*-?\d+)?|(?:\\pi|π|pi))(?:\s*,\s*-?(?:\d+(?:\.\d+)?(?:\s*\/\s*-?\d+)?|(?:\\pi|π|pi)))+/gi,
  )) {
    push(m[0]!);
  }
  for (const m of s.matchAll(
    /-?\d+(?:\.\d+)?(?:\s*\/\s*-?\d+)?(?:\s*(?:\\pi|π|pi))?|(?<![a-zA-Z\\])(?:\\pi|π)(?![a-zA-Z])/gi,
  )) {
    push(m[0]!);
  }
  return found;
}

function extractLastMathOrToken(text: string): string | null {
  const dollars = [...text.matchAll(/\$([^$]+)\$/g)];
  if (dollars.length) {
    const last = dollars[dollars.length - 1]![1]!.trim();
    if (last) return last;
  }
  const tokens = extractAnswerLikeTokens(text);
  if (tokens.length) return tokens[tokens.length - 1]!;
  return null;
}

/** Last $...$ or numeric/tuple in a “final answer” / “the answer is” sentence. */
export function extractClaimedAnswer(text: string): string | null {
  const claims = text
    .split(/(?<=[.!?\n])\s+/)
    .filter((s) => CLAIM_RE.test(s));
  if (!claims.length) return null;
  return extractLastMathOrToken(claims[claims.length - 1]!);
}

/**
 * If the coach dumped a final-answer value the grader rejects, strip that
 * sentence. Do not invent a replacement number.
 */
export function sanitizeCoachReply(
  item: ProblemItem,
  attempt: string,
  reply: string,
): string {
  if (!item.answer.trim()) return reply;
  if (
    item.answerType === "interactive" ||
    item.answerType === "clickFill" ||
    item.answerType === "free"
  ) {
    return reply;
  }
  if (!CLAIM_RE.test(reply)) return reply;
  const extracted = extractClaimedAnswer(reply);
  if (extracted == null) return reply;
  if (gradeAnswer(item, extracted).correct) return reply;

  const stripped = reply
    .split(/(?<=[.!?\n])\s+/)
    .filter((s) => !CLAIM_RE.test(s))
    .join(" ")
    .trim();
  const grade = machineGradeOf(item, attempt);
  const gradeWord =
    grade === "correct" ? "right" : grade === "wrong" ? "wrong" : "empty";
  const note = `The prompt asks for the quantity in the problem; the attempt was graded ${gradeWord} by the app.`;
  return stripped ? `${stripped}\n${note}` : note;
}

/**
 * Flag when nextStep/fullSolution never contain the graded answer, or only
 * contain a competing number/tuple. Tokens that already occur in the prompt
 * are ignored as competitors.
 */
export function hintCanonicalDrift(item: ProblemItem): string | null {
  if (
    item.answerType !== "numeric" &&
    item.answerType !== "exact" &&
    item.answerType !== "tuple"
  ) {
    return null;
  }
  const blob = `${item.hints.nextStep}\n${item.hints.fullSolution}`;
  const promptKeys = new Set(
    extractAnswerLikeTokens(item.prompt).map(tokenKey),
  );
  const tokens = extractAnswerLikeTokens(blob);
  const canonical = blobContainsCanonical(item, blob);
  const competing: string[] = [];
  for (const t of tokens) {
    if (gradeAnswer(item, t).correct) continue;
    if (!promptKeys.has(tokenKey(t))) competing.push(t);
  }
  if (!canonical) {
    return competing.length
      ? `hint/solution drift (${competing.join(", ")}) vs canonical ${item.answer}`
      : `hints missing canonical ${item.answer}`;
  }
  return null;
}

const DISAMBIGUATE_L = /not asking for\s*\$?L\$?|not asking for L/i;

function lastSentence(prompt: string): string {
  const t = prompt.trim();
  const parts = t.split(/(?<=[.!?])\s+/);
  return (parts[parts.length - 1] ?? t).trim();
}

export type AskedQuantity =
  | "speed"
  | "arcLength"
  | "velocity"
  | "acceleration"
  | "flux"
  | "divergence"
  | "curl"
  | "unknown";

export function askedQuantity(prompt: string): AskedQuantity {
  const last = lastSentence(prompt);
  if (/arc length|\bL\s*=/i.test(last) && !DISAMBIGUATE_L.test(last)) {
    return "arcLength";
  }
  if (
    /speed|\\\|\\mathbf\{r\}'|\\\|\\mathbf\{v\}'|\\\|r'/i.test(last)
  ) {
    return "speed";
  }
  if (/acceleration|\\mathbf\{a\}(\(t\))?\s*(as|=)/i.test(last)) {
    return "acceleration";
  }
  if (/\bvelocity\b|\\mathbf\{v\}(\(t\))?\s*(as|=)/i.test(last)) {
    return "velocity";
  }
  if (/\bflux\b/i.test(last)) return "flux";
  if (/\bdiv\b|divergence/i.test(last)) return "divergence";
  if (/\bcurl\b/i.test(last)) return "curl";
  return "unknown";
}

/**
 * Last-sentence quantity vs graded answer. Conservative: skip interactive
 * / clickFill / free. Do not run a model.
 */
export function promptAskMismatch(item: ProblemItem): string | null {
  if (
    item.answerType === "interactive" ||
    item.answerType === "clickFill" ||
    item.answerType === "free"
  ) {
    return null;
  }
  const ask = askedQuantity(item.prompt);

  if (item.skillId === "u2_arc_length" && ask === "speed") {
    if (!DISAMBIGUATE_L.test(item.prompt)) {
      return "arc-length skill asks speed without disambiguating L";
    }
  }

  if (ask === "speed") {
    for (const t of extractAnswerLikeTokens(item.prompt)) {
      if (/pi|π/i.test(t) && gradeAnswer(item, t).correct) {
        return `last ask is speed but graded answer matches interval/π token ${t}`;
      }
    }
    if (/\\pi|π|pi/i.test(item.answer)) {
      return "last ask is speed but graded answer contains π (looks like L)";
    }
  }

  if (ask === "acceleration") {
    const a = item.answer.replace(/\s/g, "");
    if (/(?:^|,)t(?:$|,|\^)|(?:^|,)\d*t(?:$|,)/.test(a)) {
      return "last ask is acceleration but answer still has t (looks like velocity)";
    }
  }

  if (ask === "divergence" && item.answerType === "tuple") {
    return "last ask is divergence but answer is a tuple (looks like curl/field)";
  }
  if (ask === "flux" && item.answerType === "tuple") {
    return "last ask is flux but answer is a tuple (looks like a field/curl)";
  }

  return null;
}
