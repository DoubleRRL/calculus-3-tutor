import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHANNEL,
  DEFAULT_CUE_DUR,
  DEFAULT_DRAW,
  DEFAULT_EASE,
  DEFAULT_OPACITY,
  EASING_NAMES,
  EASINGS,
  EMPTY_TIMELINE,
  channelOf,
  callsCrossed,
  clampTime,
  drawOf,
  labelOf,
  opacityOf,
  parseTimeline,
  sampleTimeline,
  targetIds,
  timelineDuration,
  transformOf,
} from "./scene";
import type { SceneCue, Timeline } from "@/types/scene";

function tl(cues: readonly SceneCue[], duration?: number): Timeline {
  return duration === undefined ? { cues } : { cues, duration };
}

/** Opacity cue at an exact progress, so assertions need no float wrangling. */
function fade(
  at: number,
  dur: number,
  to: number,
  target = "surface",
): SceneCue {
  return { kind: "opacity", at, dur, to, target, ease: "linear" };
}

function move(
  at: number,
  dur: number,
  to: Record<string, number>,
  target = "surface",
): SceneCue {
  return { kind: "move", at, dur, to, target, ease: "linear" };
}

/** Every numeric channel in a frame, flattened, for finiteness sweeps. */
function numbers(frame: {
  opacity: Readonly<Record<string, number>>;
  draw: Readonly<Record<string, number>>;
  transform: Readonly<Record<string, Readonly<Record<string, number>>>>;
}): number[] {
  return [
    ...Object.values(frame.opacity),
    ...Object.values(frame.draw),
    ...Object.values(frame.transform).flatMap((t) => Object.values(t)),
  ];
}

describe("easing", () => {
  it("pins both endpoints for every preset", () => {
    for (const name of EASING_NAMES) {
      expect(EASINGS[name](0)).toBe(0);
      expect(EASINGS[name](1)).toBe(1);
    }
  });

  it("exposes linear as the identity", () => {
    expect(EASINGS.linear(0.37)).toBe(0.37);
  });

  it("keeps the spring response inside 0…1 (critically damped, no overshoot)", () => {
    for (let x = 0; x <= 1; x += 0.05) {
      const v = EASINGS.spring(x);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("overshoots on easeOutBack, which is why opacity and draw clamp", () => {
    let peak = 0;
    for (let x = 0; x <= 1; x += 0.01) peak = Math.max(peak, EASINGS.easeOutBack(x));
    expect(peak).toBeGreaterThan(1);
  });

  it("has no default ease outside the preset list", () => {
    expect(EASING_NAMES).toContain(DEFAULT_EASE);
  });
});

describe("parseTimeline — accepts", () => {
  const GOOD: readonly unknown[] = [
    { cues: [] },
    { duration: 0, cues: [] },
    { cues: [{ kind: "appear", at: 0, target: "a" }] },
    { cues: [{ kind: "disappear", at: 1, dur: 0.5, target: "a" }] },
    { cues: [{ kind: "wait", at: 0, dur: 0 }] },
    { cues: [{ kind: "label", at: 0, target: "a", text: "" }] },
    { cues: [{ kind: "call", at: 1, name: "split" }] },
    { cues: [{ kind: "opacity", at: 0, target: "a", to: 0 }] },
    { cues: [{ kind: "opacity", at: 0, target: "a", to: 1, dur: 0 }] },
    { cues: [{ kind: "draw", at: 0, target: "a", to: 1 }] },
    { cues: [{ kind: "move", at: 0, target: "a", to: { x: 0 } }] },
    { cues: [{ kind: "appear", at: 0, target: "a", ease: "spring" }] },
    // Unknown keys are ignored so content files can carry annotations.
    { note: "authored by hand", cues: [{ kind: "appear", at: 0, target: "a" }] },
  ];

  it.each(GOOD.map((raw) => [JSON.stringify(raw), raw] as const))(
    "parses %s",
    (_label, raw) => {
      expect(parseTimeline(raw)).not.toBeNull();
    },
  );

  it("keeps a valid call argument verbatim", () => {
    const parsed = parseTimeline({
      cues: [{ kind: "call", at: 0, name: "split", arg: { halves: 2 } }],
    });
    expect(parsed?.cues[0]).toEqual({
      kind: "call",
      at: 0,
      name: "split",
      arg: { halves: 2 },
    });
  });
});

describe("parseTimeline — rejects", () => {
  const BAD: readonly unknown[] = [
    null,
    undefined,
    42,
    "timeline",
    true,
    [],
    {},
    { cues: {} },
    { cues: [null] },
    { cues: ["appear"] },
    { cues: [{ kind: "nope", at: 0, target: "a" }] },
    { cues: [{ kind: "appear", target: "a" }] },
    { cues: [{ kind: "appear", at: -1, target: "a" }] },
    { cues: [{ kind: "appear", at: Number.NaN, target: "a" }] },
    { cues: [{ kind: "appear", at: "0", target: "a" }] },
    { cues: [{ kind: "appear", at: 0, dur: -1, target: "a" }] },
    { cues: [{ kind: "appear", at: 0, dur: Infinity, target: "a" }] },
    { cues: [{ kind: "appear", at: 0, target: "a", ease: "bouncy" }] },
    { cues: [{ kind: "appear", at: 0 }] },
    { cues: [{ kind: "appear", at: 0, target: "" }] },
    { cues: [{ kind: "appear", at: 0, target: "   " }] },
    { cues: [{ kind: "appear", at: 0, target: 7 }] },
    // NUL is the internal channel-key separator, so it cannot be in an id.
    { cues: [{ kind: "appear", at: 0, target: "a\u0000b" }] },
    { cues: [{ kind: "wait", at: 0 }] },
    { cues: [{ kind: "wait", at: 0, dur: -1 }] },
    { cues: [{ kind: "opacity", at: 0, target: "a", to: 1.4 }] },
    { cues: [{ kind: "opacity", at: 0, target: "a", to: -0.2 }] },
    { cues: [{ kind: "opacity", at: 0, target: "a", to: "1" }] },
    { cues: [{ kind: "opacity", at: 0, target: "a" }] },
    { cues: [{ kind: "draw", at: 0, target: "a" }] },
    { cues: [{ kind: "draw", at: 0, target: "a", to: Number.NaN }] },
    { cues: [{ kind: "move", at: 0, target: "a", to: {} }] },
    { cues: [{ kind: "move", at: 0, target: "a", to: [] }] },
    { cues: [{ kind: "move", at: 0, target: "a", to: { x: "2" } }] },
    { cues: [{ kind: "move", at: 0, target: "a", to: { x: Number.NaN } }] },
    { cues: [{ kind: "move", at: 0, target: "a", to: { "": 1 } }] },
    { cues: [{ kind: "move", at: 0, target: "a" }] },
    { cues: [{ kind: "label", at: 0, target: "a" }] },
    { cues: [{ kind: "label", at: 0, target: "a", text: 5 }] },
    { cues: [{ kind: "call", at: 0 }] },
    { cues: [{ kind: "call", at: 0, name: "" }] },
    { cues: [], duration: -1 },
    { cues: [], duration: "4" },
    // One bad cue poisons the timeline rather than silently dropping a beat.
    { cues: [{ kind: "appear", at: 0, target: "a" }, { kind: "oops", at: 1 }] },
  ];

  it.each(BAD.map((raw) => [JSON.stringify(raw) ?? String(raw), raw] as const))(
    "rejects %s",
    (_label, raw) => {
      expect(parseTimeline(raw)).toBeNull();
    },
  );

  it("never throws, whatever it is handed", () => {
    for (const raw of BAD) {
      expect(() => parseTimeline(raw)).not.toThrow();
    }
  });
});

describe("parseTimeline — normalisation", () => {
  it("fills in the default cue duration", () => {
    const parsed = parseTimeline({
      cues: [{ kind: "appear", at: 0.5, target: "a" }],
    });
    expect(parsed?.cues[0]).toEqual({
      kind: "appear",
      at: 0.5,
      dur: DEFAULT_CUE_DUR,
      target: "a",
    });
  });

  it("derives a duration and stores it explicitly", () => {
    const parsed = parseTimeline({
      cues: [{ kind: "appear", at: 0.5, dur: 0.25, target: "a" }],
    });
    expect(parsed?.duration).toBe(0.75);
  });

  it("survives a JSON round trip unchanged", () => {
    const raw = {
      duration: 3,
      cues: [
        { kind: "appear", at: 0.5, dur: 0.4, target: "a" },
        { kind: "move", at: 1, dur: 1, target: "a", to: { x: 2, ry: 0.5 } },
        { kind: "draw", at: 1, dur: 0.5, target: "a", to: 1 },
        { kind: "label", at: 2, target: "a", text: "S = S₁ ∪ S₂" },
        { kind: "call", at: 2.5, name: "split", arg: 2 },
        { kind: "wait", at: 3, dur: 0.5 },
      ],
    };
    const parsed = parseTimeline(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.duration).toBe(3);
    const round = parseTimeline(JSON.parse(JSON.stringify(parsed)) as unknown);
    expect(round).toEqual(parsed);
    expect(round).toEqual(raw);
  });
});

describe("timelineDuration", () => {
  it("prefers a declared duration", () => {
    expect(timelineDuration(tl([fade(9, 0, 1)], 2))).toBe(2);
  });

  it("derives from the last cue when undeclared", () => {
    expect(timelineDuration(tl([fade(1, 0.5, 1)]))).toBe(1.5);
  });

  it("counts a wait as padding, since that is its only job", () => {
    expect(
      timelineDuration(
        tl([fade(1, 0.5, 1), { kind: "wait", at: 1.5, dur: 2 }]),
      ),
    ).toBe(3.5);
  });

  it("counts a trailing call as a beat with no length", () => {
    expect(timelineDuration(tl([{ kind: "call", at: 4, name: "done" }]))).toBe(4);
  });

  it("is zero for an empty timeline", () => {
    expect(timelineDuration(EMPTY_TIMELINE)).toBe(0);
    expect(timelineDuration(tl([]))).toBe(0);
  });

  it("is finite for a corrupt declared duration", () => {
    const junk = { duration: Number.NaN, cues: [fade(1, 0.5, 1)] } as unknown as Timeline;
    expect(Number.isFinite(timelineDuration(junk))).toBe(true);
  });
});

describe("targetIds", () => {
  it("lists first-mention order, deduplicated", () => {
    expect(
      targetIds(
        tl([
          move(0, 1, { x: 1 }, "b"),
          fade(0, 0, 1, "a"),
          move(1, 1, { y: 1 }, "b"),
        ]),
      ),
    ).toEqual(["b", "a"]);
  });

  it("ignores cues with no target", () => {
    expect(
      targetIds(
        tl([
          { kind: "wait", at: 0, dur: 1 },
          { kind: "call", at: 0, name: "go" },
          fade(0, 0, 1),
        ]),
      ),
    ).toEqual(["surface"]);
  });
});

describe("clamping", () => {
  const timeline = tl([fade(0, 1, 1), move(1, 1, { x: 4 })], 2);

  it("clamps below zero to the first frame", () => {
    expect(sampleTimeline(timeline, -5)).toEqual(sampleTimeline(timeline, 0));
  });

  it("clamps past the end to the last frame", () => {
    expect(sampleTimeline(timeline, 99)).toEqual(sampleTimeline(timeline, 2));
  });

  it("treats NaN as the start and ±Infinity as the ends", () => {
    expect(clampTime(Number.NaN, 2)).toBe(0);
    expect(clampTime(Number.POSITIVE_INFINITY, 2)).toBe(2);
    expect(clampTime(Number.NEGATIVE_INFINITY, 2)).toBe(0);
    expect(sampleTimeline(timeline, Number.NaN)).toEqual(
      sampleTimeline(timeline, 0),
    );
  });

  it("never extrapolates past a cue end", () => {
    const frame = sampleTimeline(tl([move(0, 1, { x: 10 })], 1), 5);
    expect(channelOf(frame, "surface", "x")).toBe(10);
  });

  it("reports the clamped playhead and duration", () => {
    const frame = sampleTimeline(timeline, 99);
    expect(frame.t).toBe(2);
    expect(frame.duration).toBe(2);
  });
});

describe("determinism and purity", () => {
  const timeline = tl([
    { kind: "appear", at: 0.5, dur: 0.5, target: "a" },
    move(1, 1, { x: 2, rz: 1 }),
    { kind: "draw", at: 0, dur: 2, target: "curve", to: 1 },
    { kind: "label", at: 2, target: "a", text: "S" },
  ], 3);

  it("returns the same frame for the same t", () => {
    expect(sampleTimeline(timeline, 1.25)).toEqual(sampleTimeline(timeline, 1.25));
  });

  it("does not depend on the order or history of previous samples", () => {
    const first = sampleTimeline(timeline, 2.5);
    sampleTimeline(timeline, 0.1);
    sampleTimeline(timeline, 3);
    expect(sampleTimeline(timeline, 2.5)).toEqual(first);
  });

  it("does not mutate the timeline it is given", () => {
    const before = structuredClone(timeline);
    for (const t of [0, 0.3, 1.1, 2, 3]) sampleTimeline(timeline, t);
    expect(timeline).toEqual(before);
  });

  it("keeps the record shape stable across t so props stay comparable", () => {
    const a = sampleTimeline(timeline, 0);
    const b = sampleTimeline(timeline, 3);
    expect(Object.keys(a.opacity).sort()).toEqual(Object.keys(b.opacity).sort());
    expect(Object.keys(a.draw).sort()).toEqual(Object.keys(b.draw).sort());
    expect(Object.keys(a.transform).sort()).toEqual(
      Object.keys(b.transform).sort(),
    );
    expect(Object.keys(a.transform.surface).sort()).toEqual(
      Object.keys(b.transform.surface).sort(),
    );
  });

  it("is total: no throw and no NaN for out-of-range playheads", () => {
    const plays = [-5, 0, 1e-9, 0.5, 1, 2.5, 3, 1e6, Number.NaN, Infinity, -Infinity];
    for (const t of plays) {
      const frame = sampleTimeline(timeline, t);
      expect(numbers(frame).every(Number.isFinite)).toBe(true);
    }
  });

  it("is total: no throw and no NaN for a hand-built broken timeline", () => {
    const junk = {
      duration: Number.NaN,
      cues: [
        { kind: "move", at: Number.NaN, target: "a", to: { x: 1 } },
        { kind: "move", at: 1, target: "a", to: "not a channel map" },
        { kind: "move", at: 1, target: "a", to: null },
        { kind: "move", at: 1, target: "a", to: { y: Number.NaN } },
        { kind: "opacity", at: 5, target: "b", to: Number.POSITIVE_INFINITY },
        { kind: "appear", at: Number.NEGATIVE_INFINITY, target: "c" },
        { kind: "label", at: Number.NaN, target: "a", text: "x" },
      ],
    } as unknown as Timeline;
    for (const t of [-1, 0, 2]) {
      const frame = sampleTimeline(junk, t);
      expect(numbers(frame).every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(frame.t)).toBe(true);
    }
  });

  it("samples an empty timeline as a zero-length no-op", () => {
    const frame = sampleTimeline(EMPTY_TIMELINE, 5);
    expect(frame).toEqual({
      t: 0,
      duration: 0,
      opacity: {},
      transform: {},
      labels: {},
      draw: {},
    });
  });
});

describe("unknown targets", () => {
  const frame = sampleTimeline(tl([fade(0, 1, 0, "known")], 1), 1);

  it("falls back to the documented defaults", () => {
    expect(opacityOf(frame, "ghost")).toBe(DEFAULT_OPACITY);
    expect(drawOf(frame, "ghost")).toBe(0);
    expect(labelOf(frame, "ghost")).toBeNull();
    expect(channelOf(frame, "ghost", "x")).toBe(DEFAULT_CHANNEL);
    expect(transformOf(frame, "ghost")).toEqual({});
  });

  it("keeps a mentioned-but-untouched target at its defaults", () => {
    const mentioned = sampleTimeline(
      tl([{ kind: "move", at: 5, dur: 1, target: "later", to: { x: 1 } }], 6),
      0,
    );
    expect(opacityOf(mentioned, "later")).toBe(DEFAULT_OPACITY);
    expect(drawOf(mentioned, "later")).toBe(DEFAULT_DRAW);
    expect(transformOf(mentioned, "later")).toEqual({ x: DEFAULT_CHANNEL });
  });
});

describe("appear / disappear / opacity", () => {
  it("keeps a target hidden until its appear, then reveals it", () => {
    const timeline = tl([{ kind: "appear", at: 1, dur: 1, target: "a" }], 2);
    expect(opacityOf(sampleTimeline(timeline, 0), "a")).toBe(0);
    expect(opacityOf(sampleTimeline(timeline, 1), "a")).toBe(0);
    expect(opacityOf(sampleTimeline(timeline, 1.25), "a")).toBeCloseTo(0.0625);
    expect(opacityOf(sampleTimeline(timeline, 1.5), "a")).toBeCloseTo(0.5);
    expect(opacityOf(sampleTimeline(timeline, 2), "a")).toBe(1);
  });

  it("reveals from t = 0 when the appear is not deferred", () => {
    const timeline = tl([{ kind: "appear", at: 0, dur: 1, target: "a" }], 1);
    expect(opacityOf(sampleTimeline(timeline, 0), "a")).toBe(0);
    expect(opacityOf(sampleTimeline(timeline, 1), "a")).toBe(1);
  });

  it("keeps a target opaque until its disappear, then fades it out", () => {
    const timeline = tl([{ kind: "disappear", at: 1, dur: 1, target: "a" }], 2);
    expect(opacityOf(sampleTimeline(timeline, 0), "a")).toBe(1);
    expect(opacityOf(sampleTimeline(timeline, 0.9), "a")).toBe(1);
    expect(opacityOf(sampleTimeline(timeline, 2), "a")).toBe(0);
  });

  it("lets an authored fade own the channel before an appear", () => {
    // The implicit "hidden" pre-state is priority 0, so it must not stomp a
    // fade the author already wrote.
    const timeline = tl([
      fade(0, 0.5, 0.5),
      { kind: "appear", at: 2, dur: 1, target: "surface" },
    ], 3);
    expect(opacityOf(sampleTimeline(timeline, 0.25), "surface")).toBeCloseTo(0.75);
    expect(opacityOf(sampleTimeline(timeline, 0.75), "surface")).toBe(0.5);
    expect(opacityOf(sampleTimeline(timeline, 1.5), "surface")).toBe(0.5);
    expect(opacityOf(sampleTimeline(timeline, 3), "surface")).toBe(1);
  });

  it("gives a later overlapping fade the channel, even after it has ended", () => {
    const timeline = tl(
      [
        {
          kind: "appear",
          at: 0,
          dur: 4,
          target: "surface",
          ease: "linear",
        },
        fade(1, 1, 0.2),
      ],
      4,
    );
    // The reveal is still climbing at t = 0.5; the second cue takes over at 1.
    expect(opacityOf(sampleTimeline(timeline, 0.5), "surface")).toBeCloseTo(0.125);
    expect(opacityOf(sampleTimeline(timeline, 1), "surface")).toBeCloseTo(0.25);
    expect(opacityOf(sampleTimeline(timeline, 2), "surface")).toBeCloseTo(0.2);
    expect(opacityOf(sampleTimeline(timeline, 3.9), "surface")).toBeCloseTo(0.2);
  });

  it("resolves simultaneous cues on the same channel in written order", () => {
    const timeline = tl([fade(1, 1, 0.25), fade(1, 1, 0.75)], 2);
    expect(opacityOf(sampleTimeline(timeline, 2), "surface")).toBe(0.75);
  });

  it("jumps instantly for a zero-length cue", () => {
    const timeline = tl([fade(1, 0, 0)], 2);
    expect(opacityOf(sampleTimeline(timeline, 0.99), "surface")).toBe(1);
    expect(opacityOf(sampleTimeline(timeline, 1), "surface")).toBe(0);
  });

  it("clamps opacity after easing so an overshoot cannot strobe", () => {
    const timeline = tl(
      [{ kind: "opacity", at: 0, dur: 1, to: 1, target: "a", ease: "easeOutBack" }],
      1,
    );
    let peak = 0;
    for (let x = 0; x <= 1; x += 0.01) {
      peak = Math.max(peak, opacityOf(sampleTimeline(timeline, x), "a"));
    }
    expect(peak).toBe(1);
  });

  it("interpolates a hand-built cue honouring its explicit ease", () => {
    const timeline = tl(
      [{ kind: "appear", at: 0, dur: 1, target: "a", ease: "linear" }],
      1,
    );
    expect(opacityOf(sampleTimeline(timeline, 0.4), "a")).toBeCloseTo(0.4);
    const eased = tl(
      [{ kind: "appear", at: 0, dur: 1, target: "a", ease: "easeOutCubic" }],
      1,
    );
    expect(opacityOf(sampleTimeline(eased, 0.4), "a")).toBeCloseTo(0.784);
  });

  it("inherits the frame state, so fading to the value it already holds is a no-op", () => {
    // An untouched target reads as fully visible; revealing from hidden is what
    // `appear` is for.
    const timeline = tl([fade(0, 1, 1)], 1);
    expect(opacityOf(sampleTimeline(timeline, 0.5), "surface")).toBe(1);
    const dimmed = tl([fade(1, 1, 0.25), fade(2, 1, 1)], 3);
    expect(opacityOf(sampleTimeline(dimmed, 3), "surface")).toBe(1);
  });
});

describe("move / transform", () => {
  it("morphs a channel forward from wherever it already was", () => {
    const timeline = tl([move(0, 1, { x: 2 }), move(1, 1, { x: 5 })], 2);
    expect(channelOf(sampleTimeline(timeline, 0), "surface", "x")).toBe(0);
    expect(channelOf(sampleTimeline(timeline, 0.5), "surface", "x")).toBe(1);
    expect(channelOf(sampleTimeline(timeline, 1), "surface", "x")).toBe(2);
    expect(channelOf(sampleTimeline(timeline, 1.5), "surface", "x")).toBeCloseTo(3.5);
    expect(channelOf(sampleTimeline(timeline, 2), "surface", "x")).toBe(5);
  });

  it("drives every listed channel at once, for camera-style reveals", () => {
    const timeline = tl([move(0, 1, { x: 4, y: -2, rz: Math.PI })], 1);
    const frame = sampleTimeline(timeline, 1);
    expect(channelOf(frame, "surface", "x")).toBe(4);
    expect(channelOf(frame, "surface", "y")).toBe(-2);
    expect(channelOf(frame, "surface", "rz")).toBeCloseTo(Math.PI);
  });

  it("leaves unlisted channels at their inherited value", () => {
    const timeline = tl([move(0, 1, { x: 2 }), move(1, 1, { y: 3 })], 2);
    const mid = sampleTimeline(timeline, 1.5);
    expect(channelOf(mid, "surface", "x")).toBe(2);
    expect(channelOf(mid, "surface", "y")).toBeCloseTo(1.5);
  });

  it("does not extrapolate a channel the timeline never writes", () => {
    const frame = sampleTimeline(tl([move(0, 1, { x: 1 })], 1), 1);
    expect(channelOf(frame, "surface", "scale")).toBe(DEFAULT_CHANNEL);
  });
});

describe("draw", () => {
  it("reveals a stroke from 0 to the requested progress", () => {
    const timeline = tl(
      [{ kind: "draw", at: 0, dur: 1, to: 1, target: "curve", ease: "linear" }],
      1,
    );
    expect(drawOf(sampleTimeline(timeline, 0), "curve")).toBe(0);
    expect(drawOf(sampleTimeline(timeline, 0.35), "curve")).toBeCloseTo(0.35);
    expect(drawOf(sampleTimeline(timeline, 1), "curve")).toBe(1);
  });

  it("holds at 0 before the draw-on and past the end", () => {
    const timeline = tl([{ kind: "draw", at: 1, dur: 1, to: 1, target: "curve" }], 2);
    expect(drawOf(sampleTimeline(timeline, 0.5), "curve")).toBe(DEFAULT_DRAW);
    expect(drawOf(sampleTimeline(timeline, 5), "curve")).toBe(1);
  });

  it("re-draws from the current progress instead of jumping to 0", () => {
    const timeline = tl(
      [
        { kind: "draw", at: 0, dur: 1, to: 1, target: "curve", ease: "linear" },
        { kind: "draw", at: 1, dur: 1, to: 0, target: "curve", ease: "linear" },
      ],
      2,
    );
    expect(drawOf(sampleTimeline(timeline, 1), "curve")).toBe(1);
    expect(drawOf(sampleTimeline(timeline, 1.5), "curve")).toBeCloseTo(0.5);
    expect(drawOf(sampleTimeline(timeline, 2), "curve")).toBe(0);
  });

  it("clamps an overshooting reveal into 0…1", () => {
    const timeline = tl(
      [
        {
          kind: "draw",
          at: 0,
          dur: 1,
          to: 1,
          target: "curve",
          ease: "easeOutBack",
        },
      ],
      1,
    );
    let peak = 0;
    for (let x = 0; x <= 1; x += 0.01) {
      peak = Math.max(peak, drawOf(sampleTimeline(timeline, x), "curve"));
    }
    expect(peak).toBe(1);
  });
});

describe("label", () => {
  const timeline = tl(
    [
      { kind: "label", at: 1, target: "a", text: "one" },
      { kind: "label", at: 2, target: "a", text: "two" },
      { kind: "label", at: 3, target: "b", text: "" },
    ],
    3,
  );

  it("swaps instantly and holds", () => {
    expect(labelOf(sampleTimeline(timeline, 0.99), "a")).toBeNull();
    expect(labelOf(sampleTimeline(timeline, 1), "a")).toBe("one");
    expect(labelOf(sampleTimeline(timeline, 1.99), "a")).toBe("one");
    expect(labelOf(sampleTimeline(timeline, 2), "a")).toBe("two");
  });

  it("distinguishes an empty label from no label", () => {
    expect(labelOf(sampleTimeline(timeline, 2), "b")).toBeNull();
    expect(labelOf(sampleTimeline(timeline, 3), "b")).toBe("");
  });
});

describe("wait / call cues", () => {
  it("adds duration without touching any channel", () => {
    const withWait = tl([fade(0, 1, 1), { kind: "wait", at: 1, dur: 3 }], 4);
    const without = tl([fade(0, 1, 1)], 4);
    const frame = sampleTimeline(withWait, 2);
    expect(frame.opacity).toEqual(sampleTimeline(without, 2).opacity);
    expect(frame.transform).toEqual(sampleTimeline(without, 2).transform);
    expect(frame.draw).toEqual(sampleTimeline(without, 2).draw);
    expect(frame.labels).toEqual(sampleTimeline(without, 2).labels);
  });

  it("reports the calls a forward move crosses, in order", () => {
    const timeline = tl(
      [
        { kind: "call", at: 0.5, name: "first" },
        { kind: "call", at: 2, name: "second" },
        { kind: "call", at: 3, name: "third" },
      ],
      4,
    );
    expect(callsCrossed(timeline, 0, 3).map((c) => c.name)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("re-fires the same calls when a scrub runs backwards", () => {
    const timeline = tl(
      [
        { kind: "call", at: 1, name: "first" },
        { kind: "call", at: 2, name: "second" },
      ],
      3,
    );
    expect(callsCrossed(timeline, 3, 0).map((c) => c.name)).toEqual([
      "second",
      "first",
    ]);
  });

  it("is silent when the playhead does not move", () => {
    const timeline = tl([{ kind: "call", at: 1, name: "only" }], 2);
    expect(callsCrossed(timeline, 1, 1)).toHaveLength(0);
  });

  it("clamps both ends before deciding what was crossed", () => {
    const timeline = tl([{ kind: "call", at: 1, name: "only" }], 2);
    expect(callsCrossed(timeline, -5, 99).map((c) => c.name)).toEqual(["only"]);
    expect(callsCrossed(timeline, 99, -5).map((c) => c.name)).toEqual(["only"]);
  });

  it("carries the call argument through", () => {
    const timeline = tl([{ kind: "call", at: 1, name: "split", arg: 2 }], 2);
    expect(callsCrossed(timeline, 0, 2)[0]?.arg).toBe(2);
  });
});