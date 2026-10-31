/**
 * React binding for the timeline core: owns wall-clock time, nothing else.
 *
 * Sampling stays in `lib/scene.ts`; this file only turns a playhead into one.
 * It follows the codebase's `useDraggablePanel` split — a hook-only module
 * beside a pure module — so the core keeps zero React imports and stays
 * testable without a renderer.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/lib/motion";
import { animateSpring } from "@/lib/spring";
import { callsCrossed, clampTime, sampleTimeline, timelineDuration } from "@/lib/scene";
import type {
  SceneFrame,
  SceneHandle,
  SceneOptions,
  Timeline,
} from "@/types/scene";

/** Long frames (tab wake, GC) must not teleport the playhead. */
const MAX_STEP_SECONDS = 0.05;

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Scrubbable playback over a declarative timeline.
 *
 * Scrubbing is what the interruptible spring is for: a drag retargets the
 * playhead continuously instead of replaying a canned curve, and the sampled
 * frame always agrees with the playhead. Autoplay uses the wall clock, which
 * is already continuous. Reduced motion never autoplays and seeks instantly —
 * a timeline under `prefers-reduced-motion` is a set of key poses to page
 * through, not a film.
 *
 * A seek pauses playback, like a video scrubber, so the clock and the spring
 * never fight over the same playhead.
 */
export function useScene(
  timeline: Timeline,
  options?: SceneOptions,
): SceneHandle {
  const duration = timelineDuration(timeline);
  const systemReduced = useReducedMotion();
  const reduced = options?.reduced ?? systemReduced ?? false;
  const loop = options?.loop ?? false;
  const rate = options?.rate ?? 1;
  const autoplay = options?.autoplay ?? false;

  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(
    autoplay && !reduced && duration > 0,
  );

  const tRef = useRef(0);
  const playingRef = useRef(playing);
  const onCallRef = useRef(options?.onCall);
  const cancelSeekRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onCallRef.current = options?.onCall;
  });

  const setPlayingState = useCallback((next: boolean) => {
    playingRef.current = next;
    setPlaying(next);
  }, []);

  /** Move the playhead and fire whatever `call` cues the move crossed. */
  const commit = useCallback(
    (next: number) => {
      const clamped = clampTime(next, duration);
      const prev = tRef.current;
      if (clamped === prev) return;
      tRef.current = clamped;
      for (const call of callsCrossed(timeline, prev, clamped)) {
        onCallRef.current?.(call.name, call.arg);
      }
      setPlayhead(clamped);
    },
    [duration, timeline],
  );

  useEffect(() => {
    if (!playingRef.current || duration <= 0) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(MAX_STEP_SECONDS, (now - last) / 1000) * rate;
      last = now;
      const next = tRef.current + dt;
      if (next < duration) {
        commit(next);
      } else if (loop) {
        commit(next % duration);
      } else {
        commit(duration);
        setPlayingState(false);
        return;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [commit, duration, loop, rate, playing, setPlayingState]);

  // Autoplay is a promise not to move things unasked for; drop it if the
  // preference resolves after mount.
  useEffect(() => {
    if (reduced) setPlayingState(false);
  }, [reduced, setPlayingState]);

  const play = useCallback(() => {
    if (reduced || duration <= 0) return;
    // Pressing play at the end restarts rather than sitting still.
    if (tRef.current >= duration && !loop) commit(0);
    setPlayingState(true);
  }, [commit, duration, loop, reduced, setPlayingState]);

  const pause = useCallback(() => {
    setPlayingState(false);
  }, [setPlayingState]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  const seek = useCallback(
    (target: number) => {
      cancelSeekRef.current?.();
      cancelSeekRef.current = null;
      const to = clampTime(target, duration);
      if (reduced) {
        commit(to);
        return;
      }
      // Retargeting mid-flight keeps the current velocity, so a scrub that
      // changes direction eases out instead of snapping.
      cancelSeekRef.current = animateSpring(tRef.current, to, commit);
      setPlayingState(false);
    },
    [commit, duration, reduced, setPlayingState],
  );

  const scrub = useCallback(
    (progress: number) => {
      const p = Number.isFinite(progress) ? clamp01(progress) : 0;
      seek(p * duration);
    },
    [duration, seek],
  );

  const restart = useCallback(() => {
    seek(0);
  }, [seek]);

  useEffect(() => () => cancelSeekRef.current?.(), []);

  // A shorter timeline (content swap) must not leave the playhead past the end.
  const t = clampTime(playhead, duration);
  const frame = useMemo(() => sampleTimeline(timeline, t), [timeline, t]);

  return useMemo(
    () => ({
      frame,
      t,
      duration,
      progress: duration > 0 ? clamp01(t / duration) : 0,
      playing,
      play,
      pause,
      toggle,
      restart,
      seek,
      scrub,
    }),
    [
      frame,
      t,
      duration,
      playing,
      play,
      pause,
      toggle,
      restart,
      seek,
      scrub,
    ],
  );
}

/** One channel out of a sampled frame, for components that render a single value. */
export function useSceneValue<T>(
  timeline: Timeline,
  select: (frame: SceneFrame) => T,
  options?: SceneOptions,
): T {
  return select(useScene(timeline, options).frame);
}