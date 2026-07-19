/**
 * Content self-grader: every item must grade its own canonical answer as correct,
 * and pass hint asserts. Run: node scripts/content-self-grade.mjs
 */
import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src/content/data");

const BANNED = [
  "Identify the region and the natural coordinates",
  "Write limits before integrating",
  "Simplify the iterated integral",
];

function normalize(s) {
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

function toNumber(s) {
  const t = String(s).trim().replace(/,/g, "");
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  const frac = t.match(/^(-?\d+)\s*\/\s*(-?\d+)$/);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return null;
    return Number(frac[1]) / den;
  }
  return null;
}

function numericClose(a, b, tol = 0.02) {
  const na = toNumber(a);
  const nb = toNumber(b);
  if (na != null && nb != null && Number.isFinite(na) && Number.isFinite(nb)) {
    return Math.abs(na - nb) <= tol * Math.max(1, Math.abs(nb));
  }
  return false;
}

function partsEqual(a, b) {
  return normalize(a) === normalize(b) || numericClose(a, b, 0.03);
}

function gradeTuple(item, given) {
  const candidates = [item.answer, ...(item.accept ?? [])];
  const gp = given.split(",").map((x) => x.trim()).filter(Boolean);
  for (const c of candidates) {
    const cp = String(c).split(",").map((x) => x.trim()).filter(Boolean);
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
    } else if (gp.every((p, i) => partsEqual(p, cp[i]))) {
      return true;
    }
  }
  return false;
}

function gradeAnswer(item, raw) {
  const given = String(raw).trim();
  if (!given) return false;
  if (item.answerType === "choice") {
    return (
      normalize(given) === normalize(item.answer) ||
      (item.choices?.some(
        (c) =>
          normalize(c) === normalize(given) &&
          normalize(c) === normalize(item.answer),
      ) ??
        false)
    );
  }
  if (
    item.answerType === "tuple" ||
    (given.includes(",") && String(item.answer).includes(","))
  ) {
    return gradeTuple(item, given);
  }
  const candidates = [item.answer, ...(item.accept ?? [])];
  const g = normalize(given);
  for (const c of candidates) {
    if (normalize(String(c)) === g) return true;
    if (
      (item.answerType === "numeric" || item.answerType === "exact") &&
      numericClose(given, String(c))
    ) {
      return true;
    }
  }
  return false;
}

const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
let total = 0;
let failures = [];

for (const f of files) {
  const items = JSON.parse(readFileSync(join(dataDir, f), "utf8"));
  for (const it of items) {
    total += 1;
    const hints = it.hints ?? {};
    for (const key of ["nudge", "technique", "nextStep", "fullSolution"]) {
      if (!String(hints[key] ?? "").trim()) {
        failures.push(`${it.id}: empty hint ${key}`);
      }
    }
    const blob = Object.values(hints).join("\n");
    for (const phrase of BANNED) {
      if (blob.includes(phrase)) {
        failures.push(`${it.id}: banned phrase`);
      }
    }
    if (!gradeAnswer(it, it.answer)) {
      failures.push(`${it.id}: canonical answer failed self-grade (${it.answer})`);
    }
    for (const a of it.accept ?? []) {
      if (!gradeAnswer(it, a)) {
        failures.push(`${it.id}: accept "${a}" failed self-grade`);
      }
    }
  }
}

if (failures.length) {
  console.error(`FAIL ${failures.length}/${total} checks`);
  for (const f of failures.slice(0, 40)) console.error(" ", f);
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more`);
  process.exit(1);
}
console.log(`OK ${total} items self-grade + hints`);
