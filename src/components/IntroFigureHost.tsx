import { useEffect, useState } from "react";
import { LessonFigure, type FigureId } from "@/content/figures";

export function IntroFigureHost({
  figure,
  steps,
  caption,
}: {
  figure: FigureId;
  steps?: { note: string }[];
  caption: string;
}) {
  const [step, setStep] = useState(0);
  const hasSteps = (steps?.length ?? 0) > 0;

  useEffect(() => {
    if (!hasSteps) return;
    const id = window.setInterval(() => {
      setStep((s) => (s + 1) % (steps!.length + 1));
    }, 2200);
    return () => window.clearInterval(id);
  }, [hasSteps, steps]);

  const note =
    hasSteps && step < steps!.length ? steps![step]!.note : caption;

  return (
    <div className="space-y-3">
      <LessonFigure figure={figure} stepIndex={Math.min(step, (steps?.length ?? 1) - 1)} />
      <p className="text-[13px] text-[var(--ink-2)] leading-relaxed">{note}</p>
      {hasSteps && (
        <div className="flex gap-1">
          {steps!.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i === Math.min(step, steps!.length - 1)
                  ? "bg-[var(--accent)]"
                  : "bg-[var(--line)]"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
