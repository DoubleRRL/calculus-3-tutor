/**
 * Pure animation-timeline core: parse, sample, resolve. No React, no DOM.
 *
 * Everything here is total — bad authored content is rejected at the parse
 * boundary and unknown targets fall back to documented defaults — so a
 * timeline can be scrubbed backwards, sampled in a unit test, or stored as
 * JSON. Wall-clock playback lives in `lib/useScene.ts`.
 */

import type {
  CallCue,
  ChannelMap,
  EasingName,
  LabelCue,
  SceneCue,
  SceneFrame,
  TargetCue,
  Timeline,
} from "@/types/scene";

/**
 * An authored cue with no `dur` still has to animate: in a lesson, dropping a
 * duration must never read as a teleport.
 */
export const DEFAULT_CUE_DUR = 0.6;

export const DEFAULT_EASE: EasingName = "easeInOutCubic";

/** Defaults for a target the timeline mentions but has not animated yet. */
export const DEFAULT_OPACITY = 1;
export const DEFAULT_DRAW = 0;
export const DEFAULT_CHANNEL = 0;

export const EMPTY_TIMELINE: Timeline = { duration: 0, cues: [] };

/**
 * Channel keys are joined on NUL so two authored ids can never collide into
 * one channel; `parseTimeline` rejects ids containing it.
 */
const KEY_SEP = "\u0000";

export type EasingFn = (x: number) => number;

export const EASING_NAMES: readonly EasingName[] = [
  "linear",
  "easeInOutCubic",
  "easeOutCubic",
  "easeOutBack",
  "spring",
];

/** Natural frequency of the closed-form spring: bigger settles slower. */
const SPRING_OMEGA = 6;

/**
 * Every preset lands exactly on 0 and 1.
 *
 * Both because an unclamped closed-form spring is still ~0.002 short of 1 at
 * `x = 1` (a scrub that never quite arrives reads as a stuck animation) and
 * because the back curve lands on 2e-16 at `x = 0` (a hairline of draw-on).
 */
function pin(fn: EasingFn): EasingFn {
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : fn(x));
}

export const EASINGS: Readonly<Record<EasingName, EasingFn>> = {
  linear: pin((x) => x),
  easeInOutCubic: pin((x) =>
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  ),
  easeOutCubic: pin((x) => 1 - Math.pow(1 - x, 3)),
  easeOutBack: pin((x) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }),
  // Closed form, not a simulation: sampling a spring stays pure.
  spring: pin((x) => 1 - (1 + SPRING_OMEGA * x) * Math.exp(-SPRING_OMEGA * x)),
};

type ChannelKind = "opacity" | "draw" | "transform";

interface Segment {
  key: string;
  kind: ChannelKind;
  target: string;
  /** Transform sub-channel; empty for whole-target channels. */
  channel: string;
  start: number;
  end: number;
  /** Departure value; null means "inherit whatever the frame held at start". */
  from: number | null;
  to: number;
  ease: EasingName;
  /** Author index, so simultaneous cues resolve in written order. */
  order: number;
  /** 1 = authored, 0 = the implicit pre-state an `appear` pins. */
  priority: 0 | 1;
  /** Channel default, used when nothing earlier wrote this channel. */
  fallback: number;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isNonNegative(v: unknown): v is number {
  return isFiniteNumber(v) && v >= 0;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function isEasingName(v: unknown): v is EasingName {
  return typeof v === "string" && EASING_NAMES.includes(v as EasingName);
}

function isCallCue(cue: SceneCue): cue is CallCue {
  return cue.kind === "call";
}

function isLabelCue(cue: SceneCue): cue is LabelCue {
  return cue.kind === "label";
}

function isTargetCue(cue: SceneCue): cue is TargetCue {
  return "target" in cue;
}

/** Clamp a playhead into `[0, duration]`; a non-finite `t` means "start". */
export function clampTime(t: number, duration: number): number {
  const d = duration > 0 ? duration : 0;
  if (!Number.isFinite(t)) return t === Infinity ? d : 0;
  return t < 0 ? 0 : t > d ? d : t;
}

/**
 * Cues can also be hand-built rather than parsed, so timing is sanitised on
 * the way in: a junk timestamp collapses to an instant cue at the start
 * instead of turning the whole frame into NaN.
 */
function cueStart(cue: SceneCue): number {
  return isFiniteNumber(cue.at) && cue.at > 0 ? cue.at : 0;
}

function cueDuration(cue: SceneCue): number {
  if (cue.kind === "label" || cue.kind === "call") return 0;
  return isFiniteNumber(cue.dur) && cue.dur > 0 ? cue.dur : 0;
}

function cueEase(cue: SceneCue): EasingName {
  if (cue.kind === "label" || cue.kind === "call" || cue.kind === "wait") {
    return DEFAULT_EASE;
  }
  return cue.ease ?? DEFAULT_EASE;
}

/** Every target a timeline addresses, in first-mention order. */
export function targetIds(timeline: Timeline): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cue of timeline.cues) {
    if (!isTargetCue(cue) || seen.has(cue.target)) continue;
    seen.add(cue.target);
    out.push(cue.target);
  }
  return out;
}

/** Declared duration wins; otherwise the timeline runs to its last cue. */
export function timelineDuration(timeline: Timeline): number {
  if (isNonNegative(timeline.duration)) return timeline.duration;
  let end = 0;
  for (const cue of timeline.cues) {
    end = Math.max(end, cueStart(cue) + cueDuration(cue));
  }
  return end;
}

function channelKey(
  kind: ChannelKind,
  target: string,
  channel = "",
): string {
  return `${kind}${KEY_SEP}${target}${KEY_SEP}${channel}`;
}

/**
 * Only finite numeric channels are honoured. Hand-built cues are allowed to
 * carry junk, and a NaN channel would poison every downstream prop.
 */
function numericEntries(to: ChannelMap): readonly [string, number][] {
  if (!isRecord(to)) return [];
  return Object.entries(to).filter(
    (entry): entry is [string, number] =>
      entry[0].length > 0 && isFiniteNumber(entry[1]),
  );
}

function segment(
  kind: ChannelKind,
  target: string,
  start: number,
  end: number,
  from: number | null,
  to: number,
  ease: EasingName,
  order: number,
  priority: 0 | 1,
  fallback: number,
  channel = "",
): Segment {
  return {
    key: channelKey(kind, target, channel),
    kind,
    target,
    channel,
    start,
    end,
    from,
    to,
    ease,
    order,
    priority,
    fallback,
  };
}

/**
 * Expand cues into per-channel segments.
 *
 * `appear`/`disappear` also emit an implicit hold over `[0, at)`: a reveal has
 * to mean "hidden before this", not "jump to visible". The hold is priority 0
 * so an authored fade earlier in the timeline still owns the channel.
 */
function cueSegments(cue: SceneCue, order: number): Segment[] {
  const start = cueStart(cue);
  const end = start + cueDuration(cue);
  const ease = cueEase(cue);

  switch (cue.kind) {
    case "appear":
      return [
        ...(start > 0
          ? [
              segment(
                "opacity",
                cue.target,
                0,
                start,
                0,
                0,
                "linear",
                order,
                0,
                DEFAULT_OPACITY,
              ),
            ]
          : []),
        segment(
          "opacity",
          cue.target,
          start,
          end,
          0,
          1,
          ease,
          order,
          1,
          DEFAULT_OPACITY,
        ),
      ];
    case "disappear":
      return [
        ...(start > 0
          ? [
              segment(
                "opacity",
                cue.target,
                0,
                start,
                1,
                1,
                "linear",
                order,
                0,
                DEFAULT_OPACITY,
              ),
            ]
          : []),
        segment(
          "opacity",
          cue.target,
          start,
          end,
          1,
          0,
          ease,
          order,
          1,
          DEFAULT_OPACITY,
        ),
      ];
    case "opacity":
      return [
        segment(
          "opacity",
          cue.target,
          start,
          end,
          null,
          clamp01(cue.to),
          ease,
          order,
          1,
          DEFAULT_OPACITY,
        ),
      ];
    case "draw":
      return [
        segment(
          "draw",
          cue.target,
          start,
          end,
          null,
          clamp01(cue.to),
          ease,
          order,
          1,
          DEFAULT_DRAW,
        ),
      ];
    case "move":
      return numericEntries(cue.to).map(([name, value]) =>
        segment(
          "transform",
          cue.target,
          start,
          end,
          null,
          value,
          ease,
          order,
          1,
          DEFAULT_CHANNEL,
          name,
        ),
      );
    default:
      // wait / label / call move nothing; they only shape time and crossings.
      return [];
  }
}

/** Rank: authored beats implicit, then later start, then written order. */
function compareRank(a: Segment, b: Segment): number {
  if (a.priority !== b.priority) return a.priority - b.priority;
  if (a.start !== b.start) return a.start - b.start;
  return a.order - b.order;
}

function segmentValue(s: Segment, t: number): number {
  if (s.end <= s.start || t >= s.end) return s.to;
  // A segment that was never resolved has no earlier writer, so the channel
  // default is exactly the value it would inherit.
  const from = s.from ?? s.fallback;
  const p = EASINGS[s.ease]((t - s.start) / (s.end - s.start));
  return from + (s.to - from) * p;
}

/**
 * Fill in every inherited `from` in one ascending pass. A cue's departure
 * value is the frame state at its start time — that is what makes "morph this
 * into that" read as a continuous morph instead of two independent tweens.
 */
function resolveSegments(cues: readonly SceneCue[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < cues.length; i += 1) segs.push(...cueSegments(cues[i], i));
  segs.sort((a, b) => a.start - b.start || compareRank(a, b));
  for (const s of segs) {
    if (s.from !== null) continue;
    let win: Segment | null = null;
    for (const other of segs) {
      if (other.key !== s.key) continue;
      // Same-start cues are treated as a single hold rather than a chain, so
      // resolution never has to recurse.
      if (other.start >= s.start) continue;
      if (!win || compareRank(other, win) > 0) win = other;
    }
    s.from = win ? segmentValue(win, s.start) : s.fallback;
  }
  return segs;
}

/**
 * One winner per channel at `t`: the last cue that has *started* keeps the
 * channel, even after it has finished — so an overlapping re-aim supersedes a
 * longer move instead of being silently swallowed by it.
 */
function winningSegments(
  segs: readonly Segment[],
  t: number,
): Segment[] {
  const winners = new Map<string, Segment>();
  for (const s of segs) {
    if (s.start > t) continue;
    const cur = winners.get(s.key);
    if (!cur || compareRank(s, cur) > 0) winners.set(s.key, s);
  }
  return [...winners.values()];
}

/**
 * Resolve every channel at time `t`. Deterministic and total: `t` clamps into
 * `[0, duration]`, unmentioned targets yield the documented defaults, and the
 * frame's record shape depends only on the timeline.
 */
export function sampleTimeline(timeline: Timeline, time: number): SceneFrame {
  const duration = timelineDuration(timeline);
  const t = clampTime(time, duration);
  const segs = resolveSegments(timeline.cues);

  const opacity: Record<string, number> = {};
  const draw: Record<string, number> = {};
  const transform: Record<string, Record<string, number>> = {};
  const labels: Record<string, string> = {};

  // Seed first so the frame shape is stable: a target that has not animated
  // yet — and a channel a `move` will touch later — is present at its default
  // rather than missing, so downstream props stay comparable frame to frame.
  const seeded = new Set<string>();
  for (const cue of timeline.cues) {
    if (!isTargetCue(cue) || seeded.has(cue.target)) continue;
    seeded.add(cue.target);
    opacity[cue.target] = DEFAULT_OPACITY;
    draw[cue.target] = DEFAULT_DRAW;
    transform[cue.target] = {};
  }
  for (const cue of timeline.cues) {
    if (cue.kind !== "move") continue;
    const next = transform[cue.target] ?? {};
    for (const [name] of numericEntries(cue.to)) next[name] = DEFAULT_CHANNEL;
    transform[cue.target] = next;
  }

  for (const s of winningSegments(segs, t)) {
    // Opacity and draw are clamped after easing: `easeOutBack` overshoots, and
    // a reveal that strobes past 1 is a bug, not a flourish.
    if (s.kind === "opacity") {
      opacity[s.target] = clamp01(segmentValue(s, t));
    } else if (s.kind === "draw") {
      draw[s.target] = clamp01(segmentValue(s, t));
    } else {
      const next = transform[s.target] ?? {};
      next[s.channel] = segmentValue(s, t);
      transform[s.target] = next;
    }
  }

  const labelRank = new Map<string, { at: number; order: number; text: string }>();
  for (let i = 0; i < timeline.cues.length; i += 1) {
    const cue = timeline.cues[i];
    if (!isLabelCue(cue)) continue;
    const at = cueStart(cue);
    if (at > t) continue;
    const cur = labelRank.get(cue.target);
    if (!cur || at > cur.at || (at === cur.at && i > cur.order)) {
      labelRank.set(cue.target, { at, order: i, text: cue.text });
    }
  }
  for (const [id, l] of labelRank) labels[id] = l.text;

  return { t, duration, opacity, transform, labels, draw };
}

export function opacityOf(frame: SceneFrame, target: string): number {
  const v = frame.opacity[target];
  return v === undefined ? DEFAULT_OPACITY : v;
}

export function drawOf(frame: SceneFrame, target: string): number {
  const v = frame.draw[target];
  return v === undefined ? DEFAULT_DRAW : v;
}

export function labelOf(frame: SceneFrame, target: string): string | null {
  return frame.labels[target] ?? null;
}

/** One numeric transform channel, defaulting to 0 when never written. */
export function channelOf(
  frame: SceneFrame,
  target: string,
  channel: string,
): number {
  const v = frame.transform[target]?.[channel];
  return v === undefined ? DEFAULT_CHANNEL : v;
}

export function transformOf(
  frame: SceneFrame,
  target: string,
): Readonly<Record<string, number>> {
  return frame.transform[target] ?? {};
}

/**
 * Cues crossed by moving the playhead from `from` to `to`, in crossing order.
 *
 * Reversing fires the same calls newest-first, so a scrub back through a reveal
 * replays it instead of leaving the scene out of sync with the playhead.
 */
export function callsCrossed(
  timeline: Timeline,
  from: number,
  to: number,
): readonly CallCue[] {
  const duration = timelineDuration(timeline);
  const a = clampTime(from, duration);
  const b = clampTime(to, duration);
  const calls = timeline.cues.filter(isCallCue);
  if (b >= a) return calls.filter((c) => cueStart(c) > a && cueStart(c) <= b);
  return calls.filter((c) => cueStart(c) > b && cueStart(c) <= a).reverse();
}

function parseTarget(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (v.trim().length === 0 || v.includes(KEY_SEP)) return null;
  return v;
}

function parseChannelMap(v: unknown): ChannelMap | null {
  if (!isRecord(v)) return null;
  const out: Record<string, number> = {};
  for (const [name, value] of Object.entries(v)) {
    if (name.length === 0 || name.includes(KEY_SEP)) return null;
    if (!isFiniteNumber(value)) return null;
    out[name] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Opacity and draw progress are both fractions; anything outside 0…1 is a typo. */
function parseFraction(v: unknown): number | null {
  return isNonNegative(v) && v <= 1 ? v : null;
}

function parseCue(raw: unknown): SceneCue | null {
  if (!isRecord(raw)) return null;
  const kind = raw.kind;
  const { at } = raw;
  if (!isNonNegative(at)) return null;

  if (raw.ease !== undefined && !isEasingName(raw.ease)) return null;

  const rawDur = raw.dur;
  let dur: number;
  if (rawDur === undefined) {
    // A wait with no length reserves nothing, so it is a typo, not a no-op.
    if (kind === "wait") return null;
    dur = DEFAULT_CUE_DUR;
  } else if (!isNonNegative(rawDur)) {
    return null;
  } else {
    dur = rawDur;
  }

  switch (kind) {
    case "wait":
      return { kind: "wait", at, dur };
    case "label": {
      const target = parseTarget(raw.target);
      if (target === null || typeof raw.text !== "string") return null;
      return { kind: "label", at, target, text: raw.text };
    }
    case "call": {
      if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
        return null;
      }
      return raw.arg === undefined
        ? { kind: "call", at, name: raw.name }
        : { kind: "call", at, name: raw.name, arg: raw.arg };
    }
    case "appear":
    case "disappear": {
      const target = parseTarget(raw.target);
      return target === null ? null : { kind, at, dur, target };
    }
    case "opacity": {
      const target = parseTarget(raw.target);
      const to = parseFraction(raw.to);
      return target === null || to === null
        ? null
        : { kind, at, dur, target, to };
    }
    case "draw": {
      const target = parseTarget(raw.target);
      const to = parseFraction(raw.to);
      return target === null || to === null
        ? null
        : { kind, at, dur, target, to };
    }
    case "move": {
      const target = parseTarget(raw.target);
      const to = parseChannelMap(raw.to);
      if (target === null || to === null) return null;
      return { kind: "move", at, dur, target, to };
    }
    default:
      return null;
  }
}

/**
 * Validate authored content into a `Timeline`, or `null` if it is malformed.
 *
 * Ranges are checked rather than repaired: a fade to opacity 1.4 or a negative
 * duration is an authoring bug worth failing a content check over, and
 * silently repairing it would hide the mistake. Unknown keys are ignored so
 * content files can carry annotations.
 */
export function parseTimeline(raw: unknown): Timeline | null {
  if (!isRecord(raw)) return null;
  if (!Array.isArray(raw.cues)) return null;
  const cues: SceneCue[] = [];
  for (const entry of raw.cues) {
    const cue = parseCue(entry);
    if (cue === null) return null;
    cues.push(cue);
  }
  const declared = raw.duration;
  if (declared !== undefined && !isNonNegative(declared)) return null;
  const checked: Timeline =
    declared === undefined ? { cues } : { cues, duration: declared };
  // Normalised timelines carry an explicit duration, so samplers and the
  // playback loop never re-derive it.
  return { cues, duration: timelineDuration(checked) };
}