import type { ProblemItem, Skill, SkillProgress } from "@/types/content";
import { SKILLS } from "@/content/skills";
import { ALL_ITEMS, itemsForSkill, itemsOfKind } from "@/content";
import type { PersistedState } from "./store";
import { isDue } from "./fsrs";
import {
  DIAGNOSTIC_SESSION_SIZE,
  EXAM_SIZE,
  SESSION_MIX,
  SESSION_SIZE,
  UNIT_ORDER_BIAS_FROM,
} from "./pedagogy";

export type QueueItem = {
  item: ProblemItem;
  reason: "review" | "learn" | "guided" | "drill" | "mix" | "mastery" | "exam";
};

const STAGE_TO_KIND: Record<SkillProgress["stage"], ProblemItem["kind"]> = {
  learn: "learn",
  guided: "guided",
  drill: "drill",
  mix: "mix",
  mastery: "mastery",
  done: "mastery",
};

function pickRandom<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

function reasonForStage(stage: SkillProgress["stage"]): QueueItem["reason"] {
  if (stage === "done") return "drill";
  return stage;
}

function stageItems(skillId: string, stage: SkillProgress["stage"]): ProblemItem[] {
  const kind = STAGE_TO_KIND[stage];
  const primary = itemsOfKind(skillId, kind);
  if (primary.length) return primary;
  // Prefer advancing variety: try next kinds before collapsing to one item forever
  const fallbackOrder: ProblemItem["kind"][] = [
    "drill",
    "guided",
    "mix",
    "mastery",
  ];
  for (const k of fallbackOrder) {
    if (k === kind) continue;
    const pool = itemsOfKind(skillId, k);
    if (pool.length) return pool;
  }
  return itemsForSkill(skillId).filter((i) => i.kind !== "learn");
}

function pushUnique(
  queue: QueueItem[],
  used: Set<string>,
  item: ProblemItem | undefined,
  reason: QueueItem["reason"],
): boolean {
  if (!item || used.has(item.id)) return false;
  used.add(item.id);
  queue.push({ item, reason });
  return true;
}

function fillFromSkills(
  queue: QueueItem[],
  used: Set<string>,
  skills: Skill[],
  state: PersistedState,
  limit: number,
  pick: (skill: Skill, sp: SkillProgress) => {
    pool: ProblemItem[];
    reason: QueueItem["reason"];
  },
): number {
  let added = 0;
  for (const s of skills) {
    if (added >= limit) break;
    const sp = state.skills[s.id];
    if (!sp) continue;
    const { pool, reason } = pick(s, sp);
    const unused = pool.filter((i) => !used.has(i.id));
    const item = pickRandom(unused.length ? unused : []);
    if (pushUnique(queue, used, item, reason)) added += 1;
  }
  return added;
}

export function buildTodayQueue(
  state: PersistedState,
  target = SESSION_SIZE,
): QueueItem[] {
  const queue: QueueItem[] = [];
  const used = new Set<string>();
  const now = Date.now();
  const nReview = Math.ceil(target * SESSION_MIX.reviews);
  const nActive = Math.ceil(target * SESSION_MIX.active);
  const nInterleave = Math.max(0, target - nReview - nActive);

  const dueSkills = SKILLS.filter((s) => {
    const r = state.reviews[s.id];
    const sp = state.skills[s.id];
    return Boolean(sp?.unlocked && sp.seen && r && isDue(r, now));
  });
  fillFromSkills(queue, used, dueSkills.slice(0, nReview), state, nReview, (s) => ({
    pool: itemsForSkill(s.id).filter((i) => i.kind !== "learn"),
    reason: "review",
  }));

  const active = SKILLS.filter((s) => {
    const sp = state.skills[s.id];
    return sp?.unlocked && !sp.mastered;
  }).sort((a, b) => a.order - b.order);

  fillFromSkills(queue, used, active, state, nActive, (_s, sp) => ({
    pool: stageItems(_s.id, sp.stage),
    reason: reasonForStage(sp.stage),
  }));

  const mastered = SKILLS.filter((s) => state.skills[s.id]?.mastered).sort(
    (a, b) => b.order - a.order,
  );
  const lateFirst = [
    ...mastered.filter((s) => s.order >= UNIT_ORDER_BIAS_FROM),
    ...mastered.filter((s) => s.order < UNIT_ORDER_BIAS_FROM),
  ];
  fillFromSkills(queue, used, lateFirst, state, nInterleave, (s) => ({
    pool: itemsForSkill(s.id).filter((i) => i.kind === "drill" || i.kind === "mix"),
    reason: "mix",
  }));

  const unlocked = SKILLS.filter((s) => state.skills[s.id]?.unlocked);
  while (queue.length < target) {
    const before = queue.length;
    fillFromSkills(queue, used, unlocked, state, 1, (s, sp) => ({
      pool: stageItems(s.id, sp.stage),
      reason: reasonForStage(sp.stage),
    }));
    if (queue.length === before) break;
  }

  return queue;
}

/** Short placement session: diagnostic + early unit probes. */
export function buildDiagnosticQueue(
  count = DIAGNOSTIC_SESSION_SIZE,
): QueueItem[] {
  const diag = ALL_ITEMS.filter((i) => i.skillId.startsWith("diag_"));
  const early = ALL_ITEMS.filter(
    (i) =>
      (i.skillId.startsWith("u1_") || i.skillId.startsWith("u2_")) &&
      (i.kind === "drill" || i.kind === "mastery"),
  );
  const pool = [...diag, ...early];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((item) => ({
    item,
    reason: item.kind === "mastery" ? ("mastery" as const) : ("drill" as const),
  }));
}

export function buildExamQueue(count = EXAM_SIZE): QueueItem[] {
  const exams = ALL_ITEMS.filter((i) => i.kind === "exam");
  const shuffled = [...exams].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((item) => ({
    item,
    reason: "exam" as const,
  }));
}

/** Weighted exam score 0–100 using item.examWeight. */
export function scoreExamAttempt(
  results: { weight: number; correct: boolean }[],
): number {
  const totalW = results.reduce((s, r) => s + r.weight, 0);
  if (totalW <= 0) return 0;
  const earned = results.reduce((s, r) => s + (r.correct ? r.weight : 0), 0);
  return Math.round((100 * earned) / totalW);
}
