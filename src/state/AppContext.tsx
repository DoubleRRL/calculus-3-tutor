import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AttemptRecord, AppSettings, SessionSummary } from "@/types/content";
import {
  applyAttempt,
  applyDayRollover,
  awardXp,
  computeReadiness,
  loadState,
  markSkillGroked,
  recordCheckpointScore,
  recordExamScore,
  recordSessionComplete,
  resetState,
  saveState,
  setResumeSkillId,
  type PersistedState,
} from "@/lib/store";
import { review, newCard } from "@/lib/fsrs";

function resolveTheme(theme: AppSettings["theme"]): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

interface AppCtx {
  state: PersistedState;
  readiness: ReturnType<typeof computeReadiness>;
  recordAttempt: (attempt: AttemptRecord, grade: 1 | 2 | 3 | 4) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  reset: () => void;
  replaceState: (next: PersistedState) => void;
  pushExamScore: (pct: number) => void;
  pushCheckpointScore: (pct: number) => void;
  completeSession: (summary?: SessionSummary) => void;
  addXp: (amount: number) => void;
  markGroked: (skillId: string) => void;
  setResume: (skillId: string | null) => void;
  focusSkillId: string | null;
  setFocusSkillId: (skillId: string | null) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => {
    const initial = loadState();
    document.documentElement.dataset.theme = resolveTheme(initial.settings.theme);
    return initial;
  });
  const [focusSkillId, setFocusSkillId] = useState<string | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(state.settings.theme);
    };
    apply();
    if (state.settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [state.settings.theme]);

  useEffect(() => {
    const tick = () => setState((prev) => applyDayRollover(prev));
    tick();
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const readiness = useMemo(() => computeReadiness(state), [state]);

  const recordAttempt = useCallback(
    (attempt: AttemptRecord, grade: 1 | 2 | 3 | 4) => {
      setState((prev) => {
        const card = prev.reviews[attempt.skillId];
        const fsrs = review(card ?? { skillId: attempt.skillId, ...newCard() }, grade);
        return applyAttempt(prev, attempt, fsrs);
      });
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  }, []);

  const reset = useCallback(() => {
    setState(resetState());
  }, []);

  const replaceState = useCallback((next: PersistedState) => {
    saveState(next);
    setState(next);
  }, []);

  const pushExamScore = useCallback((pct: number) => {
    setState((prev) => recordExamScore(prev, pct));
  }, []);

  const pushCheckpointScore = useCallback((pct: number) => {
    setState((prev) => recordCheckpointScore(prev, pct));
  }, []);

  const completeSession = useCallback((summary?: SessionSummary) => {
    setState((prev) => recordSessionComplete(prev, summary));
  }, []);

  const addXp = useCallback((amount: number) => {
    setState((prev) => awardXp(prev, amount));
  }, []);

  const markGroked = useCallback((skillId: string) => {
    setState((prev) => markSkillGroked(prev, skillId));
  }, []);

  const setResume = useCallback((skillId: string | null) => {
    setState((prev) => setResumeSkillId(prev, skillId));
  }, []);

  const value = useMemo(
    () => ({
      state,
      readiness,
      recordAttempt,
      updateSettings,
      reset,
      replaceState,
      pushExamScore,
      pushCheckpointScore,
      completeSession,
      addXp,
      markGroked,
      setResume,
      focusSkillId,
      setFocusSkillId,
    }),
    [
      state,
      readiness,
      recordAttempt,
      updateSettings,
      reset,
      replaceState,
      pushExamScore,
      pushCheckpointScore,
      completeSession,
      addXp,
      markGroked,
      setResume,
      focusSkillId,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
