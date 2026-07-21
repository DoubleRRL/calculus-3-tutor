/**
 * Content self-grader — uses the same gradeAnswer as the app (no duplicated logic).
 * Run: npm run content:check
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gradeAnswer } from "../src/lib/grading.ts";
import { BANNED_HINT_PHRASES } from "../src/content/item.ts";
import type { ProblemItem } from "../src/types/content.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "src/content/data");

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
