import type { AppSettings, ThemeMode } from "@/types/content";

export const SETTINGS_KEY = "calctutor.settings.v1";
const LEGACY_KEY = "calctutor.v3";

export const DEFAULT_SETTINGS: AppSettings = {
  tutorModel: "qwen3:8b",
  visionModel: "gemma4:e4b",
  ollamaBaseUrl: "http://127.0.0.1:11434",
  theme: "system",
  coachFollowStream: true,
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/**
 * The first vision default was a model this machine never had. Treat that
 * exact value as "unset" so an older save picks up the working default.
 */
function visionModelFor(raw: unknown): string {
  const stored = str(raw);
  if (!stored || stored === "qwen2.5vl:7b") return DEFAULT_SETTINGS.visionModel;
  return stored;
}

function parseTheme(raw: unknown): ThemeMode {
  return raw === "light" || raw === "dark" || raw === "system"
    ? raw
    : DEFAULT_SETTINGS.theme;
}

/** Accepts either a settings object or a backup with a `settings` field. */
export function parseSettings(raw: unknown): AppSettings | null {
  if (!isObject(raw)) return null;
  const src = isObject(raw.settings) ? raw.settings : raw;
  return {
    tutorModel: str(src.tutorModel) || DEFAULT_SETTINGS.tutorModel,
    visionModel: visionModelFor(src.visionModel),
    ollamaBaseUrl:
      str(src.ollamaBaseUrl) || DEFAULT_SETTINGS.ollamaBaseUrl,
    theme: parseTheme(src.theme),
    coachFollowStream: src.coachFollowStream !== false,
  };
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return parseSettings(JSON.parse(raw)) ?? DEFAULT_SETTINGS;
  } catch {
    // fall through to the old save
  }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = parseSettings(JSON.parse(legacy));
      if (parsed) return parsed;
    }
  } catch {
    // ignore a corrupt legacy save
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // storage full; settings just won't survive a reload
  }
}
