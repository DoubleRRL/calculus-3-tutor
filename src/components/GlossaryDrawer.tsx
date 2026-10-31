import { useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { GlossaryPanel } from "@/components/GlossaryPanel";
import { useReducedMotion } from "@/lib/motion";
import { useApp } from "@/state/AppContext";

export const GLOSSARY_MIN_W = 240;
export const GLOSSARY_MAX_W = 480;
export const GLOSSARY_DEFAULT_W = 320;

export function GlossaryDrawer({
  open,
  onClose,
  width,
  onWidthChange,
  skillId: skillIdProp,
}: {
  open: boolean;
  onClose: () => void;
  width: number;
  onWidthChange: (w: number) => void;
  skillId?: string;
}) {
  const { focusSkillId } = useApp();
  const params = useParams();
  const loc = useLocation();
  const reduced = useReducedMotion();
  const fromPath =
    skillIdProp ??
    focusSkillId ??
    (loc.pathname.startsWith("/learn/") ? params.skillId : undefined) ??
    undefined;

  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const narrow = width < 280;
  const compact = width < 320;

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const next = Math.min(
        GLOSSARY_MAX_W,
        Math.max(GLOSSARY_MIN_W, d.startW + (d.startX - e.clientX)),
      );
      onWidthChange(next);
    }
    function onUp() {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onWidthChange]);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close glossary"
        className={`fixed inset-0 z-40 bg-[var(--color-ink)]/20 transition-opacity md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed z-50 flex flex-col bg-[var(--color-panel)] border-[var(--color-panel-2)] shadow-lg max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[70vh] max-md:!w-full max-md:rounded-t-sm max-md:border-t md:top-0 md:right-0 md:h-full md:border-l ${
          open
            ? "max-md:translate-y-0 md:translate-x-0"
            : "max-md:translate-y-full md:translate-x-full pointer-events-none"
        }`}
        style={{
          width,
          transition: reduced
            ? undefined
            : "transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize glossary"
          onPointerDown={startResize}
          className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 -translate-x-1/2 cursor-col-resize hover:bg-[var(--color-brass)]/40 active:bg-[var(--color-brass)]/60 z-10"
        />

        <div
          className={`flex items-center justify-between gap-2 border-b border-[var(--color-panel-2)] ${
            compact ? "px-3 py-2.5" : "px-4 py-3"
          }`}
        >
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-brass)]">
              Glossary
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 font-mono text-xs text-[var(--color-mist)] hover:text-[var(--color-ink)] active:scale-[0.98]"
          >
            Close
          </button>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col ${
            compact ? "px-3" : "px-4"
          }`}
        >
          <GlossaryPanel
            skillId={fromPath}
            compact={compact}
            narrow={narrow}
            showCheatSheets
          />
        </div>
      </aside>
    </>
  );
}
