/**
 * Content self-grader — uses the same gradeAnswer as the app (no duplicated logic).
 * Run: npm run content:check
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeAnswer } from "../src/lib/grading.ts";
import { hintCanonicalDrift, promptAskMismatch } from "../src/lib/coachAlign.ts";
import { BANNED_HINT_PHRASES } from "../src/content/item.ts";
import type { ProblemItem } from "../src/types/content.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src/content/data");

/** Loose compare for rung collapse: ignore spacing, braces, delimiters, case. */
function rungKey(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/\$\$?/g, "")
    .replace(/[{}()[\]\\]/g, "")
    .replace(/\s+/g, "")
    .replace(/\\,|\\;|\\!|\\quad|\\qquad/g, "");
}

/** Answer tokens that would give the graded value away if echoed. */
function leakKey(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[\s${}]/g, "")
    .replace(/\\langle|\\rangle|\\left|\\right/g, "");
}

const files = readdirSync(dataDir).filter((f) => f.endsWith(".json"));
let total = 0;
const failures: string[] = [];

for (const f of files) {
  const items = JSON.parse(
    readFileSync(join(dataDir, f), "utf8"),
  ) as ProblemItem[];
  for (const it of items) {
    total += 1;
    const hints = it.hints ?? {
      nudge: "",
      technique: "",
      nextStep: "",
      fullSolution: "",
    };
    for (const key of ["nudge", "technique", "nextStep", "fullSolution"] as const) {
      if (!String(hints[key] ?? "").trim()) {
        failures.push(`${it.id}: empty hint ${key}`);
      }
    }
    // Rung collapse: nextStep identical to fullSolution means escalating from
    // rung 3 to rung 4 gives the learner literally the same text.
    const nk = rungKey(hints.nextStep);
    if (nk && nk === rungKey(hints.fullSolution)) {
      failures.push(
        `${it.id}: collapsed rung — nextStep === fullSolution ("${hints.nextStep}")`,
      );
    }
    // Nudge leak: the nudge must be a smaller question, not the answer.
    const answerKey = leakKey(it.answer);
    if (answerKey.length >= 2 && leakKey(hints.nudge).includes(answerKey)) {
      failures.push(
        `${it.id}: nudge leaks answer ${it.answer} ("${hints.nudge}")`,
      );
    }
    const blob = Object.values(hints).join("\n");
    for (const phrase of BANNED_HINT_PHRASES) {
      if (blob.includes(phrase)) {
        failures.push(`${it.id}: banned phrase`);
      }
    }
    if (it.answerType === "interactive" && !it.interaction?.type) {
      failures.push(`${it.id}: interactive item missing interaction.type`);
    }
    if (!gradeAnswer(it, it.answer).correct) {
      failures.push(
        `${it.id}: canonical answer failed self-grade (${it.answer})`,
      );
    }
    for (const a of it.accept ?? []) {
      if (!gradeAnswer(it, a).correct) {
        failures.push(`${it.id}: accept "${a}" failed self-grade`);
      }
    }
    const drift = hintCanonicalDrift(it);
    if (drift) {
      failures.push(`${it.id}: ${drift}`);
    }
    const ask = promptAskMismatch(it);
    if (ask) {
      failures.push(`${it.id}: ${ask}`);
    }
  }
}

if (failures.length) {
  console.error(`FAIL ${failures.length}/${total} checks`);
  for (const line of failures.slice(0, 40)) console.error(" ", line);
  if (failures.length > 40) {
    console.error(`  …and ${failures.length - 40} more`);
  }
  process.exit(1);
}
console.log(`OK ${total} items self-grade + hints`);
