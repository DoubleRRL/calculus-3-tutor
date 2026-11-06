/** Settings that survive between launches, plus the authored primer skill graph. */

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

/** Authored primer units. These are not the book's chapter numbers. */
export type UnitId =
  | "diagnostic"
  | "unit1"
  | "unit2"
  | "unit3"
  | "unit4"
  | "unit5"
  | "exam";

export interface Unit {
  id: UnitId;
  title: string;
  blurb: string;
  order: number;
}

export interface Skill {
  id: string;
  unitId: UnitId;
  title: string;
  objective: string;
  prerequisites: string[];
  order: number;
}
