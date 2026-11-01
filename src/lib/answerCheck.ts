import type { MathJsStatic, MathNode } from "mathjs";

export type AnswerVerdict = "correct" | "wrong" | "unknown";

export interface AnswerComparison {
  verdict: AnswerVerdict;
  reason?: string;
}

type AnyNode = {
  isFunctionNode?: boolean;
  isSymbolNode?: boolean;
  name?: string;
  fn?: AnyNode;
  args?: AnyNode[];
};

let mathPromise: Promise<MathJsStatic> | null = null;

async function getMath(): Promise<MathJsStatic> {
  if (!mathPromise) {
    mathPromise = import("mathjs").then(({ create, all }) =>
      create(all, { number: "number" }),
    );
  }
  return mathPromise;
}

/** Read a balanced {...} group starting at `start` (points at the brace). */
function readGroup(s: string, start: number): { body: string; end: number } | null {
  if (s[start] !== "{") return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return { body: s.slice(start + 1, i), end: i };
    }
  }
  return null;
}

/**
 * Turn what a person types into something mathjs can parse. Accepts plain
 * math, LaTeX-lite, and the symbols the palette inserts.
 */
export function normalizeAnswer(input: string): string {
  let s = input.trim().toLowerCase();

  s = s
    .replace(/\$/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\!|\\,|\\;|\\:/g, "")
    .replace(/\\\(|\\\)|\\\[|\\\]/g, "");

  // Fractions and roots keep their braces, so they are handled before the
  // generic backslash-command strip below.
  for (let k = 0; k < 3; k++) {
    const before = s;
    s = replaceFrac(s);
    if (s === before) break;
  }
  s = replaceSqrt(s);

  s = s
    .replace(/\\cdot|\\times/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\pi\b/g, "pi")
    .replace(/\\theta\b/g, "theta")
    .replace(/\\phi\b|\\varphi\b/g, "phi")
    .replace(/\\rho\b/g, "rho")
    .replace(/\\tau\b/g, "tau")
    .replace(/\\lambda\b/g, "lambda")
    .replace(/\\mu\b/g, "mu")
    .replace(/\\infty\b/g, "Infinity")
    .replace(/\\ln\b/g, "log")
    .replace(/\\log\b/g, "log")
    .replace(/\\sin\b/g, "sin")
    .replace(/\\cos\b/g, "cos")
    .replace(/\\tan\b/g, "tan")
    .replace(/\\sec\b/g, "sec")
    .replace(/\\csc\b/g, "csc")
    .replace(/\\cot\b/g, "cot")
    .replace(/\\exp\b/g, "exp")
    .replace(/\\operatorname\{[^{}]*\}/g, "")
    .replace(/\\text\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^{}]*)\}/g, "$1")
    .replace(/\\[a-zA-Z]+/g, "");

  s = s
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/θ/g, "theta")
    .replace(/φ|ϕ/g, "phi")
    .replace(/ρ/g, "rho")
    .replace(/τ/g, "tau")
    .replace(/λ/g, "lambda")
    .replace(/μ/g, "mu")
    .replace(/∞/g, "Infinity")
    .replace(/⟨/g, "<")
    .replace(/⟩/g, ">")
    .replace(/[−–—]/g, "-")
    .replace(/[×·⋅]/g, "*")
    .replace(/÷/g, "/")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'");

  // Superscripts people actually type: sin^2(x), sin^2 x, x^{2}.
  s = s.replace(/\^\{([^{}]*)\}/g, "^($1)");
  s = s.replace(
    /\b(sin|cos|tan|sec|csc|cot)\s*\^\s*(\d+)\s*\(([^()]*)\)/g,
    "($1($3))^$2",
  );
  s = s.replace(
    /\b(sin|cos|tan|sec|csc|cot)\(([^()]*)\)\s*\^\s*(\d+)/g,
    "($1($2))^$3",
  );

  // |x| -> abs(x)
  s = s.replace(/\|([^|]+)\|/g, "abs($1)");

  // Vectors: <1,2,3> and (1,2,3) both become [1,2,3]. Intervals keep their
  // mismatched brackets and fall through to the word comparison.
  const vec = s.match(/^[<(]([^<>()[\]]+)[>)]$/);
  if (vec && splitTop(vec[1], ",").length > 1) {
    s = `[${vec[1]}]`;
  }

  s = s
    .replace(/^\s*(answer|ans)\s*[:=]\s*/i, "")
    .replace(/^[a-z]\w*(\([^=]*\))?\s*=\s*/i, "")
    .replace(/\binfinity\b/gi, "Infinity")
    .replace(/\s+/g, " ")
    .trim();

  return s;
}

/** \sqrt{x} -> sqrt(x); \sqrt[3]{x} -> (x)^(1/3). */
function replaceSqrt(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s.startsWith("\\sqrt", i)) {
      let j = i + 5;
      while (s[j] === " ") j++;
      let index: string | null = null;
      if (s[j] === "[") {
        const close = s.indexOf("]", j);
        if (close > j) {
          index = s.slice(j + 1, close);
          j = close + 1;
          while (s[j] === " ") j++;
        }
      }
      const group = readGroup(s, j);
      if (group) {
        out += index
          ? `((${group.body})^(1/(${index})))`
          : `sqrt(${group.body})`;
        i = group.end + 1;
        continue;
      }
    }
    out += s[i];
    i++;
  }
  return out;
}

/** \frac{a}{b} -> ((a)/(b)), handling the two groups. */
function replaceFrac(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s.startsWith("\\frac", i)) {
      let j = i + 5;
      while (s[j] === " ") j++;
      const a = readGroup(s, j);
      if (a) {
        let k = a.end + 1;
        while (s[k] === " ") k++;
        const b = readGroup(s, k);
        if (b) {
          out += `((${a.body})/(${b.body}))`;
          i = b.end + 1;
          continue;
        }
      }
    }
    out += s[i];
    i++;
  }
  return out;
}

function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const WORD_ANSWERS: Record<string, string> = {
  dne: "dne",
  "does not exist": "dne",
  "doesn't exist": "dne",
  "no limit": "dne",
  "does not converge": "diverges",
  "not convergent": "diverges",
  diverges: "diverges",
  divergent: "diverges",
  converges: "converges",
  convergent: "converges",
  "all real numbers": "all reals",
  "all reals": "all reals",
  none: "none",
  empty: "none",
};

function wordAnswer(s: string): string | null {
  const key = s
    .toLowerCase()
    .replace(/[.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (WORD_ANSWERS[key]) return WORD_ANSWERS[key];
  if (/^[a-z]{4,}$/.test(key)) return key;
  if (/^[a-z]{2,}(\s+[a-z]{2,})+$/.test(key)) return key;
  return null;
}

function numbersClose(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= 1e-6 * scale;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof v === "object" && "re" in v) return null;
  return null;
}

function asArray(v: unknown): unknown[] | null {
  if (Array.isArray(v)) return v;
  if (v && typeof v === "object" && "toArray" in v) {
    const arr = (v as { toArray: () => unknown }).toArray();
    return Array.isArray(arr) ? arr : null;
  }
  return null;
}

function tryParse(math: MathJsStatic, s: string): MathNode | null {
  if (!s) return null;
  try {
    return math.parse(s);
  } catch {
    return null;
  }
}

function freeSymbols(node: MathNode): string[] {
  const fnNames = new Set<string>();
  node.traverse((n: MathNode) => {
    const anyNode = n as unknown as AnyNode;
    if (anyNode.isFunctionNode && anyNode.fn?.name) fnNames.add(anyNode.fn.name);
  });
  const consts = new Set(["pi", "e", "tau", "Infinity", "i"]);
  const out = new Set<string>();
  node.traverse((n: MathNode) => {
    const anyNode = n as unknown as AnyNode;
    if (anyNode.isSymbolNode && anyNode.name) {
      const name = anyNode.name;
      if (!fnNames.has(name) && !consts.has(name)) out.add(name);
    }
  });
  return [...out];
}

let seed = 987654321;
function rng(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

function sampleValue(): number {
  const v = (rng() * 2 - 1) * 3;
  return Math.abs(v) < 0.35 ? (v < 0 ? -0.35 : 0.35) : v;
}

function samplePositive(): number {
  return 0.35 + rng() * 2.65;
}

function evaluateNode(node: MathNode, scope: Record<string, number>): unknown {
  try {
    return node.evaluate(scope);
  } catch {
    return undefined;
  }
}

function compareValues(a: unknown, b: unknown): boolean | null {
  const arrA = asArray(a);
  const arrB = asArray(b);
  if (arrA || arrB) {
    if (!arrA || !arrB || arrA.length !== arrB.length) return false;
    let all = true;
    for (let i = 0; i < arrA.length; i++) {
      const c = compareValues(arrA[i], arrB[i]);
      if (c === false) return false;
      if (c === null) all = false;
    }
    return all ? true : null;
  }

  const na = asNumber(a);
  const nb = asNumber(b);
  if (na !== null || nb !== null) {
    if (na === null || nb === null) return null;
    return numbersClose(na, nb);
  }

  if (typeof a === "string" && typeof b === "string") {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  return null;
}

/**
 * Numeric sampling is the equivalence test: two closed-form answers that agree
 * at several random points are almost always the same function. Symbolic
 * simplification is avoided because mathjs can stall on large expressions.
 */
function compareNodes(
  nodeA: MathNode,
  nodeB: MathNode,
): AnswerComparison | null {
  const symbols = [
    ...new Set([...freeSymbols(nodeA), ...freeSymbols(nodeB)]),
  ].sort();

  if (symbols.length === 0) {
    const a = evaluateNode(nodeA, {});
    const b = evaluateNode(nodeB, {});
    const same = compareValues(a, b);
    if (same === true) return { verdict: "correct" };
    if (same === false) return { verdict: "wrong" };
    return null;
  }

  const points = symbols.length > 2 ? 4 : 7;
  seed = 987654321;

  // Some answers (roots, logs) are undefined on half the line. Try signed
  // samples first, then positive-only, and require at least three good points.
  for (const positive of [false, true]) {
    let valid = 0;
    for (let i = 0; i < points; i++) {
      const scope: Record<string, number> = {};
      for (const sym of symbols) {
        scope[sym] = positive ? samplePositive() : sampleValue();
      }
      const a = evaluateNode(nodeA, scope);
      const b = evaluateNode(nodeB, scope);
      if (a === undefined || b === undefined) continue;
      const same = compareValues(a, b);
      if (same === null) continue;
      valid++;
      if (!same) return { verdict: "wrong" };
    }
    if (valid >= 3) return { verdict: "correct" };
  }

  return null;
}

/**
 * Compare a typed final answer to the book's answer (or a model transcription
 * of it). Returns "unknown" when the form is outside what can be checked
 * locally, so the caller can ask the coach to judge.
 */
export async function compareAnswers(
  student: string,
  expected: string,
): Promise<AnswerComparison> {
  const a = normalizeAnswer(student);
  const b = normalizeAnswer(expected);
  if (!a || !b) return { verdict: "unknown", reason: "Empty answer." };

  if (a === b) return { verdict: "correct" };

  const wa = wordAnswer(a);
  const wb = wordAnswer(b);
  if (wa && wb && wa === wb) return { verdict: "correct" };
  if (wa && wb) {
    // "diverges" vs "converges" is a real disagreement; "see graph" vs "4"
    // is not decidable here.
    const bothKnown = Boolean(WORD_ANSWERS[wa] && WORD_ANSWERS[wb]);
    return bothKnown ? { verdict: "wrong" } : { verdict: "unknown" };
  }
  if (wa || wb) return { verdict: "unknown" };

  // {1,2,3} sets
  const setA = /^\{(.*)\}$/.exec(a);
  const setB = /^\{(.*)\}$/.exec(b);
  if (setA && setB) {
    const itemsA = splitTop(setA[1], ",").map(normalizeAnswer).sort();
    const itemsB = splitTop(setB[1], ",").map(normalizeAnswer).sort();
    return itemsA.length === itemsB.length &&
      itemsA.every((v, i) => v === itemsB[i])
      ? { verdict: "correct" }
      : { verdict: "wrong" };
  }

  const math = await getMath();
  const nodeA = tryParse(math, a);
  const nodeB = tryParse(math, b);
  if (!nodeA || !nodeB) return { verdict: "unknown" };

  const result = compareNodes(nodeA, nodeB);
  return result ?? { verdict: "unknown" };
}

export interface AnswerTextCache {
  get(topicId: string, number: number): string | null;
  set(topicId: string, number: number, text: string): void;
}

export function answerTextKey(topicId: string, number: number): string {
  return `calctutor.answertext.v1.${topicId}.${number}`;
}
