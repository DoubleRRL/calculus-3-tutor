/** Settings that survive between launches. */

export type ThemeMode = "light" | "dark" | "system";

export interface AppSettings {
  /** Fallback model when no vision model is configured. */
  tutorModel: string;
  /** Multimodal model used by the exercise coach and answer checker. */
  visionModel: string;
  ollamaBaseUrl: string;
  theme: ThemeMode;
  /** Keep coach replies scrolled to the latest token while streaming. */
  coachFollowStream: boolean;
}
