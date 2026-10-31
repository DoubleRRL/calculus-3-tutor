/** ⌘K command palette — hand-rolled on app tokens. Opens instantly
 *  (keyboard-initiated actions are never animated). */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import { SKILLS, UNITS } from "@/content";
import { resumeSkill } from "@/lib/store";
import { Icon } from "@/ui";
import { BookOpen, Settings, Sparkles, SunMoon, Trophy, Zap } from "lucide-react";

type Cmd = {
  id: string;
  label: string;
  group: string;
  icon: ReactNode;
  keywords?: string;
  run: () => void;
};

/** Subsequence match with contiguity bonus. Returns score or -1. */
function fuzzy(query: string, text: string): number {
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase();
  if (!q) return 0;
  const idx = t.indexOf(q);
  if (idx >= 0) return 100 - idx; // contiguous match, earlier is better
  let ti = 0;
  let hits = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return -1;
    hits += found === ti ? 1 : 0;
    ti = found + 1;
  }
  return hits; // scattered subsequence
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const nav = useNavigate();
  const { state, updateSettings } = useApp();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const resume = resumeSkill(state);
    const theme =
      state.settings.theme === "dark" ? "light" : "dark";
    const cmds: Cmd[] = [
      {
        id: "resume",
        label: resume ? `Continue: ${resume.title}` : "Start learning",
        group: "Actions",
        icon: <Icon icon={Zap} size={14} />,
        keywords: "resume today session learn",
        run: () => resume && nav(`/s/skill/${resume.id}`),
      },
      {
        id: "checkpoint",
        label: "Start checkpoint (10 mixed items)",
        group: "Actions",
        icon: <Icon icon={Sparkles} size={14} />,
        keywords: "checkpoint recall review mixed",
        run: () => nav("/s/checkpoint"),
      },
      {
        id: "exam",
        label: "Start full exam sim",
        group: "Actions",
        icon: <Icon icon={Trophy} size={14} />,
        keywords: "exam simulation test",
        run: () => nav("/s/exam"),
      },
      {
        id: "theme",
        label: `Switch to ${theme} theme`,
        group: "Actions",
        icon: <Icon icon={SunMoon} size={14} />,
        keywords: "theme dark light appearance",
        run: () => updateSettings({ theme }),
      },
      {
        id: "settings",
        label: "Open settings",
        group: "Actions",
        icon: <Icon icon={Settings} size={14} />,
        keywords: "settings preferences model",
        run: () => nav("/settings"),
      },
    ];
    const units = new Map(UNITS.map((u) => [u.id, u.title]));
    for (const s of SKILLS) {
      if (s.unitId === "diagnostic") continue;
      const unlocked = state.skills[s.id]?.unlocked;
      cmds.push({
        id: `skill-${s.id}`,
        label: unlocked ? s.title : `${s.title} (locked)`,
        group: units.get(s.unitId) ?? "Topics",
        icon: <Icon icon={BookOpen} size={14} />,
        keywords: `${s.objective} ${s.unitId}`,
        run: () => {
          if (unlocked) nav(`/s/skill/${s.id}`);
          else nav("/"); // locked topics just go back to the path
        },
      });
    }
    return cmds;
  }, [state, nav, updateSettings]);

  const results = useMemo(() => {
    const scored = commands
      .map((c) => ({ cmd: c, score: fuzzy(query, `${c.label} ${c.keywords ?? ""}`) }))
      .filter((r) => r.score >= 0);
    scored.sort((a, b) => b.score - a.score);
    return scored.map((r) => r.cmd);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const run = (cmd: Cmd | undefined) => {
    if (!cmd) return;
    onClose();
    cmd.run();
  };

  let lastGroup = "";
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4 bg-black/25"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Command palette"
        className="w-full max-w-md rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] shadow-[0_16px_48px_rgba(0,0,0,0.18)] overflow-hidden"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(results[active]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Jump to a topic or run a command…"
          aria-label="Search commands"
          className="w-full bg-transparent border-b border-[var(--line)] px-4 py-3.5 text-[14px] outline-none placeholder:text-[var(--ink-3)]"
        />
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto py-1.5">
          {results.length === 0 && (
            <p className="px-4 py-6 text-center text-[13px] text-[var(--ink-3)]">
              No matches
            </p>
          )}
          {results.map((c, i) => {
            const groupHeader = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            return (
              <div key={c.id}>
                {groupHeader && (
                  <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                    {groupHeader}
                  </p>
                )}
                <button
                  type="button"
                  data-idx={i}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(c)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[13px] ${
                    i === active
                      ? "bg-[var(--accent-weak)] text-[var(--ink-1)]"
                      : "text-[var(--ink-2)]"
                  }`}
                >
                  <span className="shrink-0 opacity-70">{c.icon}</span>
                  <span className="truncate">{c.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
