import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, Toast } from "@/ui";
import { useApp } from "@/state/AppContext";
import {
  masteryProgress,
  nextMilestone,
  nextSequentialSkill,
  peekNextSkill,
} from "@/lib/store";
import { skillById } from "@/content";
import {
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

export function SessionComplete({
  xp,
  correct,
  total,
  bestCombo,
  examPct,
  skillId,
  onAgain,
}: {
  xp: number;
  correct: number;
  total: number;
  bestCombo: number;
  examPct: number | null;
  skillId?: string;
  onAgain: () => void;
}) {
  const nav = useNavigate();
  const { state, setResume } = useApp();
  const reduced = useReducedMotion();
  const [shownXp, setShownXp] = useState(reduced ? xp : 0);
  const [toastOpen, setToastOpen] = useState(false);

  const current = skillId ? skillById(skillId) : undefined;
  const progress = skillId ? masteryProgress(state, skillId) : null;
  const mastered = progress?.mastered ?? false;
  const sequential = nextSequentialSkill(state, skillId);
  const peekNext = peekNextSkill(skillId);
  const gateBlocked = Boolean(skillId && !mastered && examPct == null);

  useEffect(() => {
    if (reduced) {
      setShownXp(xp);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - t) * (1 - t);
      setShownXp(Math.round(xp * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [xp, reduced]);

  useEffect(() => {
    if (gateBlocked) setToastOpen(true);
  }, [gateBlocked]);

  const gateMessage = progress
    ? `Unlock the next topic with ${progress.need} clean corrects in a row (no hint reveal). You’re at ${Math.min(progress.streak, progress.need)}/${progress.need}.`
    : "";

  function goNextTopic() {
    if (!sequential) {
      nav("/");
      return;
    }
    setResume(sequential.id);
    nav(`/s/skill/${sequential.id}`);
  }

  function keepPracticing() {
    if (skillId) {
      setResume(skillId);
      nav(`/s/skill/${skillId}`);
      return;
    }
    onAgain();
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md space-y-4">
        <motion.div
          className="text-center"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springOrInstant(reduced, springs.soft)}
        >
          <h2 className="text-[24px] font-medium text-[var(--ink-1)]">
            {examPct != null ? "Exam complete" : "Session complete"}
          </h2>
          <p className="mt-3 text-[24px] font-medium tabular-nums text-[var(--ink-1)]">
            +{shownXp} XP
          </p>
          <p className="text-[13px] text-[var(--ink-3)] mt-1">
            {state.streak}-day streak
          </p>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...springOrInstant(reduced, springs.soft),
            delay: reduced ? 0 : 0.08,
          }}
        >
          <Card>
            <div className="space-y-2 text-[13px]">
              <Row label="Correct" value={`${correct}/${total}`} />
              {bestCombo > 0 && (
                <Row label="Best combo" value={String(bestCombo)} />
              )}
              {examPct != null && (
                <Row label="Exam score" value={`${examPct}%`} />
              )}
              <Row label="Next" value={nextMilestone(state)} />
            </div>
          </Card>
        </motion.div>

        {gateBlocked && progress && (
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              ...springOrInstant(reduced, springs.soft),
              delay: reduced ? 0 : 0.1,
            }}
            className="rounded-[var(--r-card)] border border-[var(--accent)]/30 bg-[var(--accent-weak)] px-4 py-3 text-[13px] text-[var(--ink-1)] leading-snug"
          >
            {gateMessage}
          </motion.div>
        )}

        <motion.div
          className="flex flex-col gap-2"
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            ...springOrInstant(reduced, springs.soft),
            delay: reduced ? 0 : 0.16,
          }}
        >
          {examPct != null ? (
            <Button className="w-full" onClick={() => nav("/")}>
              Back to path
            </Button>
          ) : mastered && sequential ? (
            <Button className="w-full" onClick={goNextTopic}>
              Continue {sequential.title}
            </Button>
          ) : mastered ? (
            <Button className="w-full" onClick={() => nav("/")}>
              Back to path
            </Button>
          ) : current ? (
            <Button className="w-full" onClick={keepPracticing}>
              Keep practicing {current.title}
            </Button>
          ) : (
            <Button className="w-full" onClick={() => nav("/")}>
              Back to path
            </Button>
          )}

          {gateBlocked && peekNext && (
            <Button
              variant="ghost"
              className="w-full opacity-50"
              disabled
              title={gateMessage}
            >
              Next: {peekNext.title} (locked)
            </Button>
          )}

          <Button variant="ghost" className="w-full" onClick={onAgain}>
            Practice this again
          </Button>

          <button
            type="button"
            onClick={() => nav("/")}
            className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink-1)]"
          >
            Done
          </button>
        </motion.div>
      </div>

      <Toast
        message={gateMessage}
        open={toastOpen && gateBlocked}
        onDone={() => setToastOpen(false)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[var(--ink-3)]">{label}</span>
      <span className="text-[var(--ink-1)] text-right tabular-nums">{value}</span>
    </div>
  );
}
