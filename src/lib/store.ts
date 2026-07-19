import type {
  AppSettings,
  AttemptRecord,
  ReadinessSnapshot,
  ReviewCard,
  SkillProgress,
} from "@/types/content";
import { SKILLS, UNITS } from "@/content/skills";
import { newCard, type FsrsState } from "./fsrs";
import {
  DAILY_GOAL_DEFAULT,
  MASTERY,
  READINESS_WEIGHTS,
  SESSION_SIZE,
  STAGE_THRESHOLDS,
} from "./pedagogy";

const STORAGE_KEY = "calctutor.v1";

export const DEFAULT_SETTINGS: AppSettings = {
  coachModel: "qwen3:8b",
  qualityModel: "phi4",
  qualityMode: false,
  ollamaBaseUrl: "http://127.0.0.1:11434",
  onboardingDone: false,
  sessionSize: SESSION_SIZE as 5 | 12 | 20,
  theme: "light",
};

export interface PersistedState {
  settings: AppSettings;
  skills: Record<string, SkillProgress>;
  reviews: Record<string, ReviewCard>;
  attempts: AttemptRecord[];
  examScores: number[];
  streak: number;
  lastActiveDay: string | null;
  dailyGoal: number;
  sessionsCompletedToday: number;
  goalMetToday: boolean;
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function defaultSkillProgress(skillId: string, unlocked: boolean): SkillProgress {
  return {
    skillId,
    rating: 1000,
    consecutiveCorrect: 0,
    seen: 0,
    mastered: false,
    unlocked,
    stage: "learn",
    lastSeenAt: null,
    revealedCount: 0,
  };
}

export function createInitialState(): PersistedState {
  const skills: Record<string, SkillProgress> = {};
  const reviews: Record<string, ReviewCard> = {};
  for (const s of SKILLS) {
    skills[s.id] = defaultSkillProgress(s.id, s.prerequisites.length === 0);
    const c = newCard();
    reviews[s.id] = {
      skillId: s.id,
      dueAt: c.dueAt + 365 * 86_400_000,
      stability: c.stability,
      difficulty: c.difficulty,
      reps: 0,
      lapses: 0,
      lastReviewAt: null,
    };
  }
  return {
    settings: { ...DEFAULT_SETTINGS },
    skills,
    reviews,
    attempts: [],
    examScores: [],
    streak: 0,
    lastActiveDay: null,
    dailyGoal: DAILY_GOAL_DEFAULT,
    sessionsCompletedToday: 0,
    goalMetToday: false,
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Minimal structural validate + merge new skills / engagement fields. */
export function parsePersisted(raw: unknown): PersistedState | null {
  if (!isObject(raw)) return null;
  if (!isObject(raw.settings) || !isObject(raw.skills) || !isObject(raw.reviews)) {
    return null;
  }
  if (!Array.isArray(raw.attempts) || !Array.isArray(raw.examScores)) return null;

  const base = createInitialState();
  const sizeRaw = Number(raw.settings.sessionSize ?? DEFAULT_SETTINGS.sessionSize);
  const sessionSize = ([5, 12, 20] as const).includes(sizeRaw as 5 | 12 | 20)
    ? (sizeRaw as 5 | 12 | 20)
    : DEFAULT_SETTINGS.sessionSize;

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    coachModel: String(raw.settings.coachModel ?? DEFAULT_SETTINGS.coachModel),
    qualityModel: String(
      raw.settings.qualityModel ?? DEFAULT_SETTINGS.qualityModel,
    ),
    qualityMode: Boolean(
      raw.settings.qualityMode ?? DEFAULT_SETTINGS.qualityMode,
    ),
    ollamaBaseUrl: String(
      raw.settings.ollamaBaseUrl ?? DEFAULT_SETTINGS.ollamaBaseUrl,
    ),
    onboardingDone: Boolean(
      raw.settings.onboardingDone ?? DEFAULT_SETTINGS.onboardingDone,
    ),
    sessionSize,
    theme:
      raw.settings.theme === "dark" || raw.settings.theme === "light"
        ? raw.settings.theme
        : DEFAULT_SETTINGS.theme,
  };

  const skills = { ...base.skills };
  for (const id of Object.keys(base.skills)) {
    const incoming = (raw.skills as Record<string, SkillProgress>)[id];
    if (incoming && typeof incoming === "object") {
      skills[id] = { ...base.skills[id], ...incoming, skillId: id };
    }
  }

  const reviews = { ...base.reviews };
  for (const id of Object.keys(base.reviews)) {
    const incoming = (raw.reviews as Record<string, ReviewCard>)[id];
    if (incoming && typeof incoming === "object") {
      reviews[id] = { ...base.reviews[id], ...incoming, skillId: id };
    }
  }

  const today = dayKey();
  const lastActiveDay =
    typeof raw.lastActiveDay === "string" ? raw.lastActiveDay : null;
  let streak = typeof raw.streak === "number" ? raw.streak : 0;
  let sessionsCompletedToday =
    typeof raw.sessionsCompletedToday === "number"
      ? raw.sessionsCompletedToday
      : 0;
  let goalMetToday = Boolean(raw.goalMetToday);
  if (lastActiveDay && lastActiveDay !== today) {
    sessionsCompletedToday = 0;
    goalMetToday = false;
  }

  return {
    settings,
    skills,
    reviews,
    attempts: raw.attempts as AttemptRecord[],
    examScores: (raw.examScores as number[]).filter((n) => typeof n === "number"),
    streak,
    lastActiveDay,
    dailyGoal:
      typeof raw.dailyGoal === "number" && raw.dailyGoal > 0
        ? raw.dailyGoal
        : DAILY_GOAL_DEFAULT,
    sessionsCompletedToday,
    goalMetToday,
  };
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return parsePersisted(JSON.parse(raw) as unknown) ?? createInitialState();
  } catch {
    return createInitialState();
  }
}

export function saveState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): PersistedState {
  const s = createInitialState();
  saveState(s);
  return s;
}

export function unlockDependents(state: PersistedState): void {
  for (const skill of SKILLS) {
    const prog = state.skills[skill.id];
    if (!prog || prog.unlocked) continue;
    if (skill.prerequisites.every((p) => state.skills[p]?.mastered)) {
      prog.unlocked = true;
    }
  }
}

/** Single mastery/stage transition. */
export function advanceSkill(
  sp: SkillProgress,
  attempt: AttemptRecord,
): SkillProgress {
  const next = { ...sp };
  next.seen += 1;
  next.lastSeenAt = attempt.at;
  if (attempt.revealed) next.revealedCount += 1;

  const delta =
    attempt.correct && !attempt.revealed
      ? MASTERY.ratingGainClean
      : attempt.correct
        ? MASTERY.ratingGainRevealed
        : MASTERY.ratingLoss;
  next.rating = Math.max(
    MASTERY.ratingMin,
    Math.min(MASTERY.ratingMax, next.rating + delta),
  );

  if (attempt.correct && !attempt.revealed) {
    next.consecutiveCorrect += 1;
  } else {
    next.consecutiveCorrect = 0;
  }

  if (
    next.stage === "learn" &&
    next.seen >= STAGE_THRESHOLDS.learnToGuidedSeen
  ) {
    next.stage = "guided";
  }
  if (
    next.stage === "guided" &&
    next.consecutiveCorrect >= STAGE_THRESHOLDS.guidedToDrillStreak
  ) {
    next.stage = "drill";
  }
  if (
    next.stage === "drill" &&
    next.consecutiveCorrect >= STAGE_THRESHOLDS.drillToMixStreak
  ) {
    next.stage = "mix";
  }
  if (
    next.stage === "mix" &&
    next.consecutiveCorrect >= STAGE_THRESHOLDS.mixToMasteryStreak
  ) {
    next.stage = "mastery";
  }

  if (
    !next.mastered &&
    next.consecutiveCorrect >= MASTERY.consecutiveClean &&
    next.rating >= MASTERY.minRating &&
    !attempt.revealed
  ) {
    next.mastered = true;
    next.stage = "done";
  }

  return next;
}

export function applyAttempt(
  state: PersistedState,
  attempt: AttemptRecord,
  fsrsUpdate: FsrsState,
): PersistedState {
  const next = structuredClone(state);
  next.attempts.push(attempt);
  const sp = next.skills[attempt.skillId];
  if (!sp) return next;

  next.skills[attempt.skillId] = advanceSkill(sp, attempt);
  next.reviews[attempt.skillId] = {
    skillId: attempt.skillId,
    ...fsrsUpdate,
  };

  unlockDependents(next);
  return next;
}

/** Record a completed practice/exam session for streak + daily goal. */
export function recordSessionComplete(state: PersistedState): PersistedState {
  const next = structuredClone(state);
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));

  if (next.lastActiveDay === today) {
    next.sessionsCompletedToday += 1;
  } else if (next.lastActiveDay === yesterday) {
    next.streak += 1;
    next.sessionsCompletedToday = 1;
  } else {
    next.streak = 1;
    next.sessionsCompletedToday = 1;
  }
  next.lastActiveDay = today;
  next.goalMetToday = next.sessionsCompletedToday >= next.dailyGoal;
  return next;
}

export function computeReadiness(state: PersistedState): ReadinessSnapshot {
  const courseSkills = SKILLS.filter((s) => s.unitId !== "diagnostic");
  const total = courseSkills.length;
  const mastered = courseSkills.filter((s) => state.skills[s.id]?.mastered).length;
  const now = Date.now();
  const reviewSkills = SKILLS.filter((s) => state.skills[s.id]?.seen > 0);
  const due = reviewSkills.filter(
    (s) => (state.reviews[s.id]?.dueAt ?? 0) <= now,
  );
  const retentionPct =
    reviewSkills.length === 0
      ? 100
      : Math.round(100 * (1 - due.length / reviewSkills.length));

  const lateUnits = SKILLS.filter(
    (s) => s.unitId === "unit4" || s.unitId === "unit5",
  );
  const lateMastered = lateUnits.filter((s) => state.skills[s.id]?.mastered).length;
  const latePct = lateUnits.length ? lateMastered / lateUnits.length : 0;

  const examAvg =
    state.examScores.length === 0
      ? 0
      : state.examScores.slice(-3).reduce((a, b) => a + b, 0) /
        Math.min(3, state.examScores.length);

  const masteryPct = Math.round((100 * mastered) / Math.max(1, total));
  const examReadiness = Math.round(
    READINESS_WEIGHTS.examSims * examAvg +
      READINESS_WEIGHTS.lateUnits * (100 * latePct) +
      READINESS_WEIGHTS.overallMastery * masteryPct,
  );

  return {
    masteryPct,
    retentionPct,
    examReadiness,
    masteredSkills: mastered,
    totalSkills: total,
    dueReviews: due.length,
  };
}

/** Human-readable next unlock milestone for the score strip. */
export function nextMilestone(state: PersistedState): string {
  const locked = SKILLS.filter((s) => !state.skills[s.id]?.unlocked).sort(
    (a, b) => a.order - b.order,
  );
  if (!locked.length) {
    const unmastered = SKILLS.filter((s) => !state.skills[s.id]?.mastered);
    if (!unmastered.length) return "All skills unlocked and mastered";
    return `${unmastered.length} skills left to master`;
  }
  const next = locked[0]!;
  const missing = next.prerequisites.filter((p) => !state.skills[p]?.mastered);
  const unit = UNITS.find((u) => u.id === next.unitId);
  if (missing.length === 0) {
    return `Next: ${next.title}`;
  }
  const unitLabel = unit?.title ?? next.unitId;
  return `${missing.length} skill${missing.length === 1 ? "" : "s"} from unlocking ${unitLabel}`;
}
