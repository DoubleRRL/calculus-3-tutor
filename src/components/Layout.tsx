import { NavLink, Outlet } from "react-router-dom";
import { useApp } from "@/state/AppContext";
import type { ThemeMode } from "@/types/content";

const links = [
  { to: "/", label: "Today", end: true },
  { to: "/map", label: "Map" },
  { to: "/exam", label: "Exam" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  const { state, updateSettings } = useApp();
  const theme = state.settings.theme;

  function setTheme(next: ThemeMode) {
    updateSettings({ theme: next });
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="px-6 pt-8 pb-3 flex items-end justify-between gap-4 max-w-3xl w-full mx-auto">
        <div>
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-[var(--color-mist)]">
            Local mastery
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-[var(--color-ink)] leading-none mt-1">
            CalcTutor
          </h1>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-0.5 font-mono text-[11px]">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`px-2 py-0.5 rounded-sm capitalize transition-colors ${
                  theme === t
                    ? "bg-[var(--color-ink)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-mist)] hover:text-[var(--color-ink)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <nav className="flex gap-1 font-mono text-sm">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-sm transition-colors ${
                    isActive
                      ? "bg-[var(--color-ink)] text-[var(--color-on-accent)]"
                      : "text-[var(--color-mist)] hover:text-[var(--color-ink)]"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 px-6 pb-12 pt-4 max-w-3xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
