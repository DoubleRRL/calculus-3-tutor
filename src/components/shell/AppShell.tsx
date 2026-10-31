import { NavLink, Outlet } from "react-router-dom";
import { BookOpen, Flame, Settings, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/state/AppContext";
import { Icon, Pill, RollingNumber } from "@/ui";
import { levelFromXp } from "@/lib/gamify";
import { resumeSkill } from "@/lib/store";
import { GlossaryDrawer, GLOSSARY_DEFAULT_W } from "@/components/GlossaryDrawer";
import { CommandPalette } from "@/components/CommandPalette";

const tabs = [
  { to: "/", label: "Learn", icon: BookOpen, end: true },
  { to: "/exam", label: "Exam", icon: Trophy },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const { state } = useApp();
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossaryWidth, setGlossaryWidth] = useState(GLOSSARY_DEFAULT_W);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const lvl = levelFromXp(state.xp);
  const resume = resumeSkill(state);

  // Global ⌘K / Ctrl+K toggles the command palette.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="min-h-full flex bg-[var(--bg-sub)]"
      style={{ ["--glossary-w" as string]: `${glossaryWidth}px` }}
    >
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--card)] px-3 py-6">
        <div className="px-2 mb-4">
          <p className="text-[12px] text-[var(--ink-3)] tracking-wide uppercase">
            CalcTutor
          </p>
          <p className="text-[14px] font-medium text-[var(--ink-1)] mt-0.5">
            Calc 3 mastery
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex items-center justify-between gap-2 mx-1 mb-5 px-2.5 py-2 rounded-[var(--r-nav)] border border-[var(--line)] text-[12px] text-[var(--ink-3)] hover:border-[var(--line-2)] hover:text-[var(--ink-2)]"
        >
          <span>Search…</span>
          <span className="font-medium border border-[var(--line)] rounded px-1 py-0.5 text-[10px]">
            ⌘K
          </span>
        </button>
        <nav className="flex flex-col gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-3 rounded-[var(--r-nav)] text-[14px] font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--accent)] text-[var(--on-accent)]"
                    : "text-[var(--ink-2)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
                }`
              }
            >
              <Icon icon={t.icon} size={14} />
              {t.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 space-y-2">
          <Pill tone="streak">
            <Icon icon={Flame} size={14} />
            <RollingNumber value={state.streak} /> day
          </Pill>
          <p className="text-[12px] text-[var(--ink-3)] truncate">
            Lv {lvl.level}
            {resume ? ` · ${resume.title}` : ""}
          </p>
          <button
            type="button"
            onClick={() => setGlossaryOpen((o) => !o)}
            className="min-h-[44px] flex items-center text-[12px] text-[var(--ink-2)] hover:text-[var(--ink-1)]"
          >
            Glossary
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden flex items-center justify-between gap-3 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2 bg-[var(--card)] border-b border-[var(--line)]">
          <div className="min-w-0">
            <p className="text-[12px] text-[var(--ink-3)]">CalcTutor</p>
            <p className="text-[14px] font-medium truncate">
              {resume?.title ?? `Lv ${lvl.level}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Pill tone="streak">
              <Icon icon={Flame} size={14} />
              <RollingNumber value={state.streak} />
            </Pill>
            <button
              type="button"
              onClick={() => setGlossaryOpen((o) => !o)}
              className="min-h-[44px] min-w-[44px] flex items-center text-[12px] text-[var(--ink-2)] px-2 rounded-[var(--r-nav)] hover:bg-[var(--accent-weak)]"
            >
              Glossary
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-24 lg:pb-8 w-full max-w-2xl mx-auto">
          <Outlet />
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-[var(--line)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)]">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2.5 min-h-[49px] text-[12px] ${
                  isActive ? "text-[var(--ink-1)]" : "text-[var(--ink-3)]"
                }`
              }
            >
              <Icon icon={t.icon} size={20} />
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <GlossaryDrawer
        open={glossaryOpen}
        onClose={() => setGlossaryOpen(false)}
        width={glossaryWidth}
        onWidthChange={setGlossaryWidth}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
