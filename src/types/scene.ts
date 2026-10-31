/**
 * Declarative animation-timeline vocabulary.
 *
 * Split out from the sampler so authored lesson content can import the shape
 * without dragging in runtime code — and so a timeline stays plain JSON:
 * scrubbable, diffable, and testable with no renderer attached.
 */

/**
 * Curvature presets. `spring` is the closed-form critically damped response,
 * not a simulation, so sampling stays pure.
 */
export type EasingName =
  | "linear"
  | "easeInOutCubic"
  | "easeOutCubic"
  | "easeOutBack"
  | "spring";

/**
 * Numeric channels stay an open map rather than a fixed tuple: one `move` cue
 * has to drive 2D targets (`x`, `y`, `s`) and 3D targets (`z`, `rx`, `ry`) with
 * the same vocabulary.
 */
export type ChannelMap = Readonly<Record<string, number>>;

export type CueTiming = {
  /** Seconds from the start of the timeline. */
  at: number;
  /** Seconds to reach the end state; 0 jumps instantly. */
  dur?: number;
  ease?: EasingName;
};

/**
 * Cues address targets by string id rather than by reference, so one timeline
 * can choreograph a scene it does not itself render.
 */

/** Fade to an explicit opacity — the general form behind appear/disappear. */
export type OpacityCue = CueTiming & {
  kind: "opacity";
  target: string;
  to: number;
};

/** Reveal: hidden until `at`, then ramp to fully opaque. */
export type AppearCue = CueTiming & { kind: "appear"; target: string };

/** Dismiss: opaque until `at`, then ramp out. */
export type DisappearCue = CueTiming & { kind: "disappear"; target: string };

/** Morph/translate/rotate/scale: absolute channels, each inherited forward. */
export type MoveCue = CueTiming & {
  kind: "move";
  target: string;
  to: ChannelMap;
};

/** Stroke-reveal progress, 0…1. */
export type DrawCue = CueTiming & { kind: "draw"; target: string; to: number };

/** Text swap; instant, never interpolated. */
export type LabelCue = { kind: "label"; at: number; target: string; text: string };

/** Reserve time so beats line up without moving anything. */
export type WaitCue = { kind: "wait"; at: number; dur: number };

/** Imperative escape hatch for what a numeric channel cannot express. */
export type CallCue = { kind: "call"; at: number; name: string; arg?: unknown };

export type SceneCue =
  | OpacityCue
  | AppearCue
  | DisappearCue
  | MoveCue
  | DrawCue
  | LabelCue
  | WaitCue
  | CallCue;

/** Every cue that addresses a renderable target (i.e. all but wait/call). */
export type TargetCue = Extract<SceneCue, { target: string }>;

export interface Timeline {
  /** Seconds. Hard playback boundary; omit to derive from the cues. */
  duration?: number;
  cues: readonly SceneCue[];
}

/**
 * Fully resolved scene state at one instant. Record shape only depends on the
 * timeline, never on `t`, so downstream props stay referentially comparable.
 */
export interface SceneFrame {
  /** Playhead after clamping into `[0, duration]`. */
  readonly t: number;
  readonly duration: number;
  readonly opacity: Readonly<Record<string, number>>;
  readonly transform: Readonly<Record<string, Readonly<Record<string, number>>>>;
  readonly labels: Readonly<Record<string, string>>;
  readonly draw: Readonly<Record<string, number>>;
}

export type SceneCallHandler = (name: string, arg?: unknown) => void;

export interface SceneOptions {
  /** Run from `t = 0` on mount. Never engages under reduced motion. */
  autoplay?: boolean;
  /** Wrap at the end instead of stopping. */
  loop?: boolean;
  /** Overrides the OS preference when set. */
  reduced?: boolean;
  /** Playback speed multiplier. */
  rate?: number;
  /** Fired once per crossing of a `call` cue, in crossing order. */
  onCall?: SceneCallHandler;
}

export interface SceneHandle {
  readonly frame: SceneFrame;
  /** Current playhead, in seconds. */
  readonly t: number;
  readonly duration: number;
  /** `t / duration`; 0 for an empty timeline. */
  readonly progress: number;
  readonly playing: boolean;
  play(): void;
  pause(): void;
  toggle(): void;
  /** Back to `t = 0`; like any seek this pauses, so pair it with `play()`. */
  restart(): void;
  /** Interruptible seek; springs to the target unless motion is reduced. */
  seek(t: number): void;
  /** Seek by normalised progress, for binding straight to a range input. */
  scrub(progress: number): void;
}