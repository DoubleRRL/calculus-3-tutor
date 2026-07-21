import { Link } from "react-router-dom";
import { SKILLS, UNITS, skillById } from "@/content";
import { useApp } from "@/state/AppContext";
import { ScoreStrip } from "@/components/ScoreStrip";
import { nextMilestone } from "@/lib/store";

export function MapPage() {
  const { state, readiness } = useApp();
  const milestone = nextMilestone(state);

  return (
    <div className="animate-rise">
      <ScoreStrip
        snap={readiness}
        milestone={milestone}
        streak={state.streak}
        goalMet={state.goalMetToday}
      />
      <h2 className="font-display text-2xl mb-1 text-[var(--color-ink)]">Course</h2>
      <p className="text-sm text-[var(--color-mist)] mb-6">
        Topics in order. Unlock the next by mastering prerequisites. Click an
        unlocked topic to learn it — ELI5 intro first, then practice.
      </p>
      <div className="space-y-8">
        {UNITS.map((u) => {
          const skills = SKILLS.filter((s) => s.unitId === u.id).sort(
            (a, b) => a.order - b.order,
          );
          return (
            <section key={u.id}>
              <h3 className="font-display text-xl text-[var(--color-ink)]">{u.title}</h3>
              <p className="font-mono text-xs text-[var(--color-mist)] mb-3">{u.blurb}</p>
              <ul className="space-y-2">
                {skills.map((s) => {
                  const p = state.skills[s.id];
                  const unlocked = Boolean(p?.unlocked);
                  const grokked = state.grokked.includes(s.id);
                  const tone = !unlocked
                    ? "opacity-40 border-[var(--color-panel-2)]"
                    : p?.mastered
                      ? "border-[var(--color-ink)]"
                      : "border-[var(--color-brass)]";
                  const missing = s.prerequisites.filter(
                    (pr) => !state.skills[pr]?.mastered,
                  );
                  const lockHint =
                    missing.length > 0
                      ? `Needs: ${missing
                          .map((id) => skillById(id)?.title ?? id)
                          .join(", ")}`
                      : null;

                  const body = (
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm text-[var(--color-ink)]">{s.title}</p>
                        <p className="font-mono text-[10px] text-[var(--color-mist)] mt-0.5">
                          {s.objective}
                        </p>
                        {!unlocked && lockHint && (
                          <p className="font-mono text-[10px] text-[var(--color-mist)] mt-1">
                            {lockHint}
                          </p>
                        )}
                        {unlocked && grokked && (
                          <p className="font-mono text-[10px] text-[var(--color-brass)] mt-1">
                            Intro done · practice ready
                          </p>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-right text-[var(--color-brass)] shrink-0">
                        <div>
                          {p?.mastered
                            ? "mastered"
                            : unlocked
                              ? p?.stage
                              : "locked"}
                        </div>
                        <div className="text-[var(--color-mist)]">
                          R{Math.round(p?.rating ?? 1000)}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <li key={s.id} className={`rounded-sm border bg-[var(--color-panel)] ${tone}`}>
                      {unlocked ? (
                        <Link
                          to={`/learn/${s.id}`}
                          className="block px-3 py-2 transition-transform active:scale-[0.99] hover:bg-[var(--color-paper)] rounded-sm"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="px-3 py-2 cursor-not-allowed">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
