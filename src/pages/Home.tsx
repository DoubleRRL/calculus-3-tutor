import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { ScoreStrip } from "@/components/ScoreStrip";
import { DiagnosticSession, TodaySession } from "@/components/SessionRunner";
import { nextMilestone } from "@/lib/store";
import { SESSION_SIZES } from "@/lib/pedagogy";
import { SKILLS } from "@/content";

export function HomePage() {
  const { state, readiness, updateSettings } = useApp();
  const [placing, setPlacing] = useState(false);

  if (!state.settings.onboardingDone) {
    if (!placing) {
      return (
        <OnboardingGate
          onStart={() => setPlacing(true)}
        />
      );
    }
    return (
      <div className="animate-rise">
        <h2 className="font-display text-2xl text-[var(--color-ink)] mb-1">
          Placement
        </h2>
        <p className="text-sm text-[var(--color-mist)] mb-6 max-w-prose">
          A short diagnostic. Clean answers mark skills mastered and unlock the
          next unit through the normal prerequisite graph.
        </p>
        <DiagnosticSession
          onFinished={() => updateSettings({ onboardingDone: true })}
        />
      </div>
    );
  }

  const milestone = nextMilestone(state);
  const nextCourse = (() => {
    const unlocked = SKILLS.filter(
      (s) => state.skills[s.id]?.unlocked && !state.skills[s.id]?.mastered,
    ).sort((a, b) => a.order - b.order);
    return unlocked[0];
  })();

  return (
    <div className="animate-rise">
      <ScoreStrip
        snap={readiness}
        milestone={milestone}
        streak={state.streak}
        goalMet={state.goalMetToday}
      />
      {nextCourse && (
        <div className="mb-6 rounded-sm border border-[var(--color-panel-2)] bg-[var(--color-panel)] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)]">
              Continue the course
            </p>
            <p className="text-sm text-[var(--color-ink)] mt-0.5">
              {nextCourse.title}
            </p>
          </div>
          <Link
            to={`/learn/${nextCourse.id}`}
            className="px-3 py-2 bg-[var(--color-ink)] text-[var(--color-on-accent)] font-mono text-xs rounded-sm active:scale-[0.98] transition-transform"
          >
            Open lesson
          </Link>
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-[var(--color-ink)]">
            Today&apos;s session
          </h2>
          <p className="text-[var(--color-mist)] mt-1 text-sm max-w-prose">
            Spaced reviews and mixed practice. For learning a new topic from
            scratch, open it in{" "}
            <Link to="/map" className="underline underline-offset-2">
              Course
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-mist)]">
            Session length
          </p>
          <div className="flex gap-1 font-mono text-xs">
            {SESSION_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => updateSettings({ sessionSize: n })}
                className={`px-2.5 py-1 rounded-sm border transition-colors ${
                  state.settings.sessionSize === n
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-on-accent)]"
                    : "border-[var(--color-panel-2)] text-[var(--color-mist)] hover:text-[var(--color-ink)]"
                }`}
              >
                {n === 5 ? "5 · short" : n === 12 ? "12 · standard" : "20 · long"}
              </button>
            ))}
          </div>
          <p className="font-mono text-[10px] text-[var(--color-mist)]">
            Problems in today&apos;s practice queue.
          </p>
        </div>
      </div>
      <TodaySession />
    </div>
  );
}

function OnboardingGate({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center animate-rise">
      <p className="font-mono text-[11px] tracking-[0.25em] uppercase text-[var(--color-mist)] mb-3">
        Calculus 3 · local · offline
      </p>
      <h2 className="font-display text-5xl md:text-6xl text-[var(--color-ink)] leading-[0.95] max-w-xl">
        CalcTutor
      </h2>
      <p className="mt-5 text-lg text-[var(--color-paper-dim)] max-w-md font-body">
        A mastery path from rusty Calc 1–2 through vector calculus. After a short
        diagnostic, open{" "}
        <span className="text-[var(--color-ink)]">Course</span> and learn each
        topic in order — ELI5 intro, then practice.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onStart}
          className="px-5 py-3 bg-[var(--color-ink)] text-[var(--color-on-accent)] font-mono text-sm rounded-sm hover:opacity-90 transition active:scale-[0.98]"
        >
          Start diagnostic
        </button>
        <Link
          to="/map"
          className="px-5 py-3 border border-[var(--color-panel-2)] text-[var(--color-mist)] font-mono text-sm rounded-sm hover:text-[var(--color-ink)]"
        >
          Browse course
        </Link>
        <Link
          to="/settings"
          className="px-5 py-3 border border-[var(--color-panel-2)] text-[var(--color-mist)] font-mono text-sm rounded-sm hover:text-[var(--color-ink)]"
        >
          Model settings
        </Link>
      </div>
    </div>
  );
}
