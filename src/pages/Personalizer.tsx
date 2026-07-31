import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { sessionSizeFromMinutes } from "@/lib/store";
import type {
  ExplainStyle,
  LearnerBackground,
  LearnerProfile,
} from "@/types/content";
import { Button } from "@/ui";
import {
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

const STEPS = 3;

export function PersonalizerPage() {
  const { updateSettings, setResume } = useApp();
  const nav = useNavigate();
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [background, setBackground] = useState<LearnerBackground | null>(null);
  const [dailyMinutes, setDailyMinutes] = useState<5 | 15 | 30 | null>(null);
  const [explainStyle, setExplainStyle] = useState<ExplainStyle | null>(null);

  function finish(style: ExplainStyle | null) {
    if (!background || !dailyMinutes) return;
    const profile: LearnerProfile = {
      background,
      dailyMinutes,
      explainStyle: style ?? undefined,
    };
    updateSettings({
      onboardingDone: true,
      personalizerDone: true,
      learnerProfile: profile,
      sessionSize: sessionSizeFromMinutes(dailyMinutes),
    });
    setResume("u1_coords3d");
    nav("/");
  }

  return (
    <motion.div
      className="min-h-[60vh] flex flex-col justify-center max-w-md"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springOrInstant(reduced, springs.soft)}
    >
      <div className="flex gap-1.5 mb-6">
        {Array.from({ length: STEPS }).map((_, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= step ? "bg-[var(--accent)]" : "bg-[var(--line)]"
            }`}
          />
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <h1 className="text-[22px] font-medium text-[var(--ink-1)]">
            How&apos;s your Calc 1–2?
          </h1>
          <p className="text-[13px] text-[var(--ink-3)]">
            We&apos;ll tune early Unit 1 lessons — not regenerate a course.
          </p>
          {(
            [
              ["recent", "Took it recently"],
              ["rusty", "A bit rusty"],
              ["strong3d", "Strong, new to 3D"],
              ["refresher", "Want a full refresher"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setBackground(id);
                setStep(1);
              }}
              className="w-full text-left px-4 py-3 rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--card)] text-[14px] hover:border-[var(--line-2)]"
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-[22px] font-medium text-[var(--ink-1)]">
            Daily practice time?
          </h1>
          <p className="text-[13px] text-[var(--ink-3)]">
            Sets how many practice items a session aims for.
          </p>
          {(
            [
              [5, "About 5 minutes"],
              [15, "About 15 minutes"],
              [30, "30+ minutes"],
            ] as const
          ).map(([mins, label]) => (
            <button
              key={mins}
              type="button"
              onClick={() => {
                setDailyMinutes(mins);
                setStep(2);
              }}
              className="w-full text-left px-4 py-3 rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--card)] text-[14px] hover:border-[var(--line-2)]"
            >
              {label}
            </button>
          ))}
          <Button variant="ghost" className="w-full" onClick={() => setStep(0)}>
            Back
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-[22px] font-medium text-[var(--ink-1)]">
            How should the coach explain?
          </h1>
          <p className="text-[13px] text-[var(--ink-3)]">Optional — skip if unsure.</p>
          {(
            [
              ["analogies", "Analogies first"],
              ["formulas", "Formulas first"],
              ["tldr", "TL;DR then detail"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setExplainStyle(id);
                finish(id);
              }}
              className="w-full text-left px-4 py-3 rounded-[var(--r-input)] border border-[var(--line)] bg-[var(--card)] text-[14px] hover:border-[var(--line-2)]"
            >
              {label}
            </button>
          ))}
          <Button
            className="w-full"
            onClick={() => finish(explainStyle)}
          >
            Continue
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setStep(1)}>
            Back
          </Button>
        </div>
      )}
    </motion.div>
  );
}
