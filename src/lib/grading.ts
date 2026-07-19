import type { ProblemItem } from "@/types/content";

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\\\s*/g, "")
    .replace(/\s+/g, "")
    .replace(/\{|\}/g, "")
    .replace(/⋅/g, "*")
    .replace(/×/g, "*")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/\^\{([^}]+)\}/g, "^$1")
    .replace(/left|right/g, "");
}

/** Parse simple a/b fractions and plain numbers. */
function toNumber(s: string): number | null {
  const t = s.trim().replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const frac = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }
  return null;
}

function numericClose(a: string, b: string, tol = 0.02): boolean {
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na != null && nb != null && Number.isFinite(na) && Number.isFinite(nb)) {
    return Math.abs(na - nb) <= tol * Math.max(1, Math.abs(nb));
  }
  return false;
}

function partsEqual(a: string, b: string): boolean {
  return normalize(a) === normalize(b) || numericClose(a, b, 0.03);
}

function gradeTuple(item: ProblemItem, given: string): boolean {
  const candidates = [item.answer, ...(item.accept ?? [])];
  const gp = given.split(",").map((x) => x.trim()).filter(Boolean);
  for (const c of candidates) {
    const cp = c.split(",").map((x) => x.trim()).filter(Boolean);
    if (gp.length !== cp.length) continue;
    if (item.tupleUnordered) {
      const remaining = [...cp];
      let ok = true;
      for (const p of gp) {
        const idx = remaining.findIndex((r) => partsEqual(p, r));
        if (idx < 0) {
          ok = false;
          break;
        }
        remaining.splice(idx, 1);
      }
      if (ok) return true;
    } else if (gp.every((p, i) => partsEqual(p, cp[i]!))) {
      return true;
    }
  }
  return false;
}

/** Wrap TeX-ish answers so MathText can render them. */
export function formatAnswerForDisplay(answer: string): string {
  const a = answer.trim();
  if (!a) return a;
  if (a.includes("$")) return a;
  let tex = a
    .replace(/√(\d+)/g, "\\sqrt{$1}")
    .replace(/√\{/g, "\\sqrt{")
    .replace(/√/g, "\\sqrt{}")
    .replace(/π/g, "\\pi")
    .replace(/\bsqrt\(([^)]+)\)/gi, "\\sqrt{$1}");
  if (!/[\\^_{}]/.test(tex) && !/\\[a-zA-Z]/.test(tex)) {
    return a;
  }
  return `$${tex}$`;
}

export interface GradeResult {
  correct: boolean;
  feedback: string;
}

export function gradeAnswer(item: ProblemItem, raw: string): GradeResult {
  const given = raw.trim();
  if (!given) {
    return { correct: false, feedback: "Enter an answer." };
  }

  if (item.answerType === "choice") {
    const ok =
      normalize(given) === normalize(item.answer) ||
      (item.choices?.some(
        (c) =>
          normalize(c) === normalize(given) &&
          normalize(c) === normalize(item.answer),
      ) ??
        false);
    return {
      correct: ok,
      feedback: ok
        ? "Correct."
        : `Not quite. Expected: ${formatAnswerForDisplay(item.answer)}`,
    };
  }

  if (item.answerType === "tuple" || (given.includes(",") && item.answer.includes(","))) {
    const ok = gradeTuple(item, given);
    return {
      correct: ok,
      feedback: ok
        ? "Correct."
        : `Not quite. Canonical: ${formatAnswerForDisplay(item.answer)}`,
    };
  }

  const candidates = [item.answer, ...(item.accept ?? [])];
  const g = normalize(given);

  for (const c of candidates) {
    if (normalize(c) === g) {
      return { correct: true, feedback: "Correct." };
    }
    if (
      (item.answerType === "numeric" || item.answerType === "exact") &&
      numericClose(given, c)
    ) {
      return { correct: true, feedback: "Correct." };
    }
  }

  return {
    correct: false,
    feedback: `Not quite. Canonical: ${formatAnswerForDisplay(item.answer)}`,
  };
}
