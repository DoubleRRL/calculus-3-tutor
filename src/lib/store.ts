import type {
  AppSettings,
  AttemptRecord,
  ExplainStyle,
  LearnerBackground,
  LearnerProfile,
  ReadinessSnapshot,
  ReviewCard,
  SessionSummary,
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
import {
  DAILY_GOAL_XP_DEFAULT,
  stageToCrowns,
  todayXp,
} from "./gamify";

const STORAGE_KEY_V1 = "calctutor.v1";
const STORAGE_KEY = "calctutor.v2";

export const DEFAULT_SETTINGS: AppSettings = {
  coachModel: "qwen3:8b",
  qualityModel: "phi4",
  qualityMode: false,
  ollamaBaseUrl: "http://127.0.0.1:11434",
  onboardingDone: false,
  personalizerDone: false,
  learnerProfile: null,
  sessionSize: SESSION_SIZE as 5 | 12 | 20,
  theme: "system",
  dailyGoalXp: DAILY_GOAL_XP_DEFAULT,
  coachFollowStream: true,
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseLearnerProfile(raw: unknown): LearnerProfile | null {
  if (!isObject(raw)) return null;
  const bg = raw.background;
  const background: LearnerBackground | null =
    bg === "recent" || bg === "rusty" || bg === "strong3d" || bg === "refresher"
      ? bg
      : null;
  const mins = Number(raw.dailyMinutes);
  const dailyMinutes =
    mins === 5 || mins === 15 || mins === 30 ? mins : null;
  if (!background || !dailyMinutes) return null;
  const style = raw.explainStyle;
  const explainStyle: ExplainStyle | undefined =
    style === "analogies" || style === "formulas" || style === "tldr"
      ? style
      : undefined;
  return { background, dailyMinutes, explainStyle };
}

export function sessionSizeFromMinutes(m: 5 | 15 | 30): 5 | 12 | 20 {
  if (m <= 5) return 5;
  if (m <= 15) return 12;
  return 20;
}

export interface PersistedState {
  settings: AppSettings;
  skills: Record<string, SkillProgress>;
  reviews: Record<string, ReviewCard>;
  attempts: AttemptRecord[];
  examScores: number[];
  streak: number;
  lastActiveDay: string | null;
  longestStreak: number;
  streakFreezes: number;
  /** Skill ids where the learner finished the teach deck. */
  grokked: string[];
  xp: number;
  xpByDay: Record<string, number>;
  lastGoalMetDay: string | null;
  crowns: Record<string, number>;
  badges: string[];
  sessionHistory: SessionSummary[];
  schemaVersion: 2;
  /** Transient display helpers kept for migration compat (derived). */
  goalMetToday: boolean;
  /** Last skill the learner was working on — resume target. */
  resumeSkillId: string | null;
}

export function dayKey(d = new Date()): string {
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
  const crowns: Record<string, number> = {};
  for (const s of SKILLS) {
    skills[s.id] = defaultSkillProgress(s.id, s.prerequisites.length === 0);
    crowns[s.id] = 0;
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
    longestStreak: 0,
    streakFreezes: 0,
    grokked: [],
    xp: 0,
    xpByDay: {},
    lastGoalMetDay: null,
    crowns,
    badges: [],
    sessionHistory: [],
    schemaVersion: 2,
    goalMetToday: false,
    resumeSkillId: null,
  };
}

function parseTheme(raw: unknown): AppSettings["theme"] {
  if (raw === "dark" || raw === "light" || raw === "system") return raw;
  return DEFAULT_SETTINGS.theme;
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

  const dailyGoalXp =
    typeof raw.settings.dailyGoalXp === "number" && raw.settings.dailyGoalXp > 0
      ? Number(raw.settings.dailyGoalXp)
      : typeof raw.dailyGoal === "number" && raw.dailyGoal > 0
        ? Math.max(30, Number(raw.dailyGoal) * 50)
        : DAILY_GOAL_XP_DEFAULT;

  const learnerProfile = parseLearnerProfile(raw.settings.learnerProfile);
  // Soft-migrate conversational factory pair → faster Socratic defaults.
  let coachModel = String(
    raw.settings.coachModel ?? DEFAULT_SETTINGS.coachModel,
  );
  let qualityModel = String(
    raw.settings.qualityModel ?? DEFAULT_SETTINGS.qualityModel,
  );
  if (
    (coachModel === "phi4" || coachModel === "phi4:latest") &&
    (qualityModel === "qwen2.5:latest" || qualityModel === "qwen2.5")
  ) {
    coachModel = DEFAULT_SETTINGS.coachModel;
    qualityModel = DEFAULT_SETTINGS.qualityModel;
  }
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    coachModel,
    qualityModel,
    qualityMode: Boolean(
      raw.settings.qualityMode ?? DEFAULT_SETTINGS.qualityMode,
    ),
    ollamaBaseUrl: String(
      raw.settings.ollamaBaseUrl ?? DEFAULT_SETTINGS.ollamaBaseUrl,
    ),
    onboardingDone: Boolean(
      raw.settings.onboardingDone ?? DEFAULT_SETTINGS.onboardingDone,
    ),
    // Existing saves that finished welcome skip the new personalizer.
    personalizerDone: Boolean(
      raw.settings.personalizerDone ??
        learnerProfile ??
        raw.settings.onboardingDone,
    ),
    learnerProfile,
    sessionSize,
    theme: parseTheme(raw.settings.theme),
    dailyGoalXp,
    coachFollowStream:
      raw.settings.coachFollowStream === undefined
        ? DEFAULT_SETTINGS.coachFollowStream
        : Boolean(raw.settings.coachFollowStream),
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

  const crowns: Record<string, number> = { ...base.crowns };
  if (isObject(raw.crowns)) {
    for (const id of Object.keys(base.crowns)) {
      const n = Number((raw.crowns as Record<string, number>)[id]);
      if (Number.isFinite(n)) crowns[id] = Math.max(0, Math.min(5, n));
    }
  } else {
    for (const id of Object.keys(skills)) {
      crowns[id] = stageToCrowns(skills[id]!.stage);
    }
  }

  const today = dayKey();
  const lastActiveDay =
    typeof raw.lastActiveDay === "string" ? raw.lastActiveDay : null;
  let streak = typeof raw.streak === "number" ? raw.streak : 0;
  const xpByDay = isObject(raw.xpByDay)
    ? Object.fromEntries(
        Object.entries(raw.xpByDay).filter(
          ([, v]) => typeof v === "number",
        ) as [string, number][],
      )
    : {};

  const lastGoalMetDay =
    typeof raw.lastGoalMetDay === "string"
      ? raw.lastGoalMetDay
      : Boolean(raw.goalMetToday) && lastActiveDay === today
        ? today
        : null;

  const state: PersistedState = {
    settings,
    skills,
    reviews,
    attempts: raw.attempts as AttemptRecord[],
    examScores: (raw.examScores as number[]).filter((n) => typeof n === "number"),
    streak,
    lastActiveDay,
    longestStreak:
      typeof raw.longestStreak === "number"
        ? raw.longestStreak
        : streak,
    streakFreezes:
      typeof raw.streakFreezes === "number" ? raw.streakFreezes : 0,
    grokked: Array.isArray(raw.grokked)
      ? (raw.grokked as unknown[]).filter((id): id is string => typeof id === "string")
      : [],
    xp: typeof raw.xp === "number" ? raw.xp : 0,
    xpByDay,
    lastGoalMetDay,
    crowns,
    badges: Array.isArray(raw.badges)
      ? (raw.badges as unknown[]).filter((id): id is string => typeof id === "string")
      : [],
    sessionHistory: Array.isArray(raw.sessionHistory)
      ? (raw.sessionHistory as SessionSummary[]).slice(-50)
      : [],
    schemaVersion: 2,
    goalMetToday: lastGoalMetDay === today,
    resumeSkillId:
      typeof raw.resumeSkillId === "string" ? raw.resumeSkillId : null,
  };
  recomputeUnlocks(state);
  return state;
}

export function loadState(): PersistedState {
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) {
      return parsePersisted(JSON.parse(v2) as unknown) ?? createInitialState();
    }
    const v1 = localStorage.getItem(STORAGE_KEY_V1);
    if (v1) {
      const migrated = parsePersisted(JSON.parse(v1) as unknown) ?? createInitialState();
      saveState(migrated);
      return migrated;
    }
    return createInitialState();
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

/** Recompute unlock flags from the current prerequisite graph (never re-locks). */
export function recomputeUnlocks(state: PersistedState): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const skill of SKILLS) {
      const prog = state.skills[skill.id];
      if (!prog || prog.unlocked) continue;
      const ready =
        skill.prerequisites.length === 0 ||
        skill.prerequisites.every((p) => state.skills[p]?.mastered);
      if (ready) {
        prog.unlocked = true;
        changed = true;
      }
    }
  }
}

export function unlockDependents(state: PersistedState): void {
  recomputeUnlocks(state);
}

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
  next.crowns[attempt.skillId] = stageToCrowns(
    next.skills[attempt.skillId]!.stage,
  );

  unlockDependents(next);
  return next;
}

export function awardXp(state: PersistedState, amount: number): PersistedState {
  if (amount <= 0) return state;
  const next = structuredClone(state);
  const today = dayKey();
  next.xp += amount;
  next.xpByDay[today] = (next.xpByDay[today] ?? 0) + amount;
  // trim old days
  const keys = Object.keys(next.xpByDay).sort();
  if (keys.length > 120) {
    for (const k of keys.slice(0, keys.length - 120)) {
      delete next.xpByDay[k];
    }
  }
  if (
    todayXp(next.xpByDay, today) >= next.settings.dailyGoalXp &&
    next.lastGoalMetDay !== today
  ) {
    next.lastGoalMetDay = today;
  }
  next.goalMetToday = next.lastGoalMetDay === today;
  return next;
}

export function recordSessionComplete(
  state: PersistedState,
  summary?: SessionSummary,
): PersistedState {
  const next = structuredClone(state);
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86_400_000));

  if (next.lastActiveDay === today) {
    // same day — streak unchanged
  } else if (next.lastActiveDay === yesterday) {
    next.streak += 1;
  } else if (next.lastActiveDay == null) {
    next.streak = 1;
  } else {
    // missed day(s)
    if (next.streakFreezes > 0) {
      next.streakFreezes -= 1;
      next.streak += 1;
    } else {
      next.streak = 1;
    }
  }
  next.lastActiveDay = today;
  next.longestStreak = Math.max(next.longestStreak, next.streak);
  next.goalMetToday = next.lastGoalMetDay === today;

  if (summary) {
    next.sessionHistory = [...next.sessionHistory, summary].slice(-50);
  }
  return next;
}

export function markSkillGroked(
  state: PersistedState,
  skillId: string,
): PersistedState {
  if (state.grokked.includes(skillId)) return state;
  return { ...state, grokked: [...state.grokked, skillId] };
}

export function applyDayRollover(state: PersistedState): PersistedState {
  const today = dayKey();
  const goalMetToday = state.lastGoalMetDay === today;
  if (state.goalMetToday === goalMetToday) return state;
  return { ...state, goalMetToday };
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

export function nextUnlockedSkill(state: PersistedState) {
  return SKILLS.filter(
    (s) =>
      s.unitId !== "diagnostic" &&
      state.skills[s.id]?.unlocked &&
      !state.skills[s.id]?.mastered,
  ).sort((a, b) => a.order - b.order)[0];
}

/**
 * Next course skill after `afterSkillId` by order that is unlocked
 * (and not yet mastered). Used when the current topic is mastered.
 */
export function nextSequentialSkill(
  state: PersistedState,
  afterSkillId: string | undefined,
) {
  const course = SKILLS.filter(
    (s) => s.unitId !== "diagnostic" && s.unitId !== "exam",
  ).sort((a, b) => a.order - b.order);
  if (!afterSkillId) return nextUnlockedSkill(state);
  const after = course.find((s) => s.id === afterSkillId);
  if (!after) return nextUnlockedSkill(state);
  return course.find(
    (s) =>
      s.order > after.order &&
      state.skills[s.id]?.unlocked &&
      !state.skills[s.id]?.mastered,
  );
}

/** Next skill in course order after `afterSkillId` (ignores unlock). */
export function peekNextSkill(afterSkillId: string | undefined) {
  const course = SKILLS.filter(
    (s) => s.unitId !== "diagnostic" && s.unitId !== "exam",
  ).sort((a, b) => a.order - b.order);
  if (!afterSkillId) return course[0];
  const after = course.find((s) => s.id === afterSkillId);
  if (!after) return course[0];
  return course.find((s) => s.order > after.order);
}

export type MasteryProgress = {
  streak: number;
  need: number;
  rating: number;
  minRating: number;
  mastered: boolean;
};

export function masteryProgress(
  state: PersistedState,
  skillId: string,
): MasteryProgress {
  const prog = state.skills[skillId];
  return {
    streak: prog?.consecutiveCorrect ?? 0,
    need: MASTERY.consecutiveClean,
    rating: prog?.rating ?? 1000,
    minRating: MASTERY.minRating,
    mastered: Boolean(prog?.mastered),
  };
}

/** Skill to continue — last resume if still in progress, else next on path. */
export function resumeSkill(state: PersistedState) {
  const id = state.resumeSkillId;
  if (id) {
    const s = SKILLS.find((x) => x.id === id);
    const prog = state.skills[id];
    if (
      s &&
      s.unitId !== "diagnostic" &&
      prog?.unlocked &&
      !prog.mastered
    ) {
      return s;
    }
  }
  return nextUnlockedSkill(state);
}

export function setResumeSkillId(
  state: PersistedState,
  skillId: string | null,
): PersistedState {
  if (state.resumeSkillId === skillId) return state;
  return { ...state, resumeSkillId: skillId };
}

// silence unused import if DAILY_GOAL_DEFAULT only used in comment path
void DAILY_GOAL_DEFAULT;
