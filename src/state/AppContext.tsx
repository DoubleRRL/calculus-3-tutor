import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppSettings } from "@/types/content";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "@/lib/settings";

function resolveTheme(theme: AppSettings["theme"]): "light" | "dark" {
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

interface AppCtx {
  state: { settings: AppSettings };
  updateSettings: (patch: Partial<AppSettings>) => void;
  reset: () => void;
  replaceState: (next: { settings: AppSettings }) => void;
  /** Kept for the glossary drawer; the topic cockpit has no single focus skill. */
  focusSkillId: string | null;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const initial = loadSettings();
    document.documentElement.dataset.theme = resolveTheme(initial.theme);
    return initial;
  });

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const apply = () => {
      document.documentElement.dataset.theme = resolveTheme(settings.theme);
    };
    apply();
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, []);

  const replaceState = useCallback((next: { settings: AppSettings }) => {
    setSettings(next.settings);
    saveSettings(next.settings);
  }, []);

  const state = useMemo(() => ({ settings }), [settings]);

  const value = useMemo(
    () => ({ state, updateSettings, reset, replaceState, focusSkillId: null }),
    [state, updateSettings, reset, replaceState],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside provider");
  return v;
}
