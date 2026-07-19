import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AttemptRecord, AppSettings } from "@/types/content";
import {
  applyAttempt,
  computeReadiness,
  loadState,
  recordSessionComplete,
  resetState,
  saveState,
  type PersistedState,
} from "@/lib/store";
import { review, newCard } from "@/lib/fsrs";

interface AppCtx {
  state: PersistedState;
  readiness: ReturnType<typeof computeReadiness>;
  recordAttempt: (attempt: AttemptRecord, grade: 1 | 2 | 3 | 4) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  reset: () => void;
  pushExamScore: (pct: number) => void;
  completeSession: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(() => {
    const initial = loadState();
    document.documentElement.dataset.theme = initial.settings.theme;
    return initial;
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);

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

  const pushExamScore = useCallback((pct: number) => {
    setState((prev) => ({
      ...prev,
      examScores: [...prev.examScores, pct].slice(-10),
    }));
  }, []);

  const completeSession = useCallback(() => {
    setState((prev) => recordSessionComplete(prev));
  }, []);

  const value = useMemo(
    () => ({
      state,
      readiness,
      recordAttempt,
      updateSettings,
      reset,
      pushExamScore,
      completeSession,
    }),
    [
      state,
      readiness,
      recordAttempt,
      updateSettings,
      reset,
      pushExamScore,
      completeSession,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
