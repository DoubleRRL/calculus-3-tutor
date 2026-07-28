import type { SkillProgress } from "@/types/content";

export const XP = {
  firstTry: 10,
  withHints: 5,
  afterReveal: 2,
  wrong: 0,
  teachStep: 5,
  teachCapPerSkill: 15,
  crownAdvance: 15,
  sessionComplete: 20,
  perfectSession: 50,
  dailyGoal: 30,
} as const;

export const COMBO = {
  at5: 1.25,
  at10: 1.5,
} as const;

export const DAILY_GOAL_XP_DEFAULT = 50;
export const DAILY_GOAL_PRESETS = [30, 50, 100, 150] as const;

export function comboMultiplier(combo: number): number {
  if (combo >= 10) return COMBO.at10;
  if (combo >= 5) return COMBO.at5;
  return 1;
}

export function itemXp(opts: {
  correct: boolean;
  hintLevel: number;
  firstTry: boolean;
  combo: number;
}): number {
  if (!opts.correct) return XP.wrong;
  let base: number = XP.firstTry;
  if (opts.hintLevel >= 4) base = XP.afterReveal;
  else if (opts.hintLevel > 0) base = XP.withHints;
  else if (!opts.firstTry) base = XP.withHints;
  return Math.round(base * comboMultiplier(opts.combo));
}

/** Level from cumulative XP: L spans [50*L*(L-1), 50*L*(L+1)). */
export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (true) {
    const need = 100 * level;
    if (remaining < need) return { level, into: remaining, need };
    remaining -= need;
    level += 1;
    if (level > 200) return { level, into: remaining, need };
  }
}

export function stageToCrowns(stage: SkillProgress["stage"]): number {
  switch (stage) {
    case "learn":
      return 0;
    case "guided":
      return 1;
    case "drill":
      return 2;
    case "mix":
      return 3;
    case "mastery":
      return 4;
    case "done":
      return 5;
  }
}

export function todayXp(
  xpByDay: Record<string, number>,
  day = new Date().toISOString().slice(0, 10),
): number {
  return xpByDay[day] ?? 0;
}

export function weekKeys(ref = new Date()): string[] {
  const d = new Date(ref);
  const day = d.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    keys.push(x.toISOString().slice(0, 10));
  }
  return keys;
}
