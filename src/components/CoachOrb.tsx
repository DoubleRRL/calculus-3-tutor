import { ThinkingOrb, type OrbState } from "thinking-orbs";

export type CoachOrbPhase = "working" | "composing";

const LABEL: Record<CoachOrbPhase, string> = {
  working: "Thinking…",
  composing: "Writing…",
};

/** Inline thinking-orbs status for the coach stream. */
export function CoachOrb({ phase }: { phase: CoachOrbPhase }) {
  const state: OrbState = phase;
  return (
    <div
      className="inline-flex items-center gap-2 text-[12px] text-[var(--ink-3)]"
      role="status"
      aria-live="polite"
    >
      <ThinkingOrb
        state={state}
        size={20}
        theme="auto"
        aria-label={LABEL[phase]}
      />
      <span>{LABEL[phase]}</span>
    </div>
  );
}
