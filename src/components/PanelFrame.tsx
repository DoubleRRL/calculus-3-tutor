import {
  useEffect,
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, springs, springOrInstant, useReducedMotion } from "@/lib/motion";
import { useDraggablePanel } from "@/lib/useDraggablePanel";
import { panelStore } from "@/lib/panelStore";
import type { PanelId } from "@/lib/panels";

/**
 * Shared chrome for every floating panel: positioned window, draggable
 * header, corner resize grips.
 *
 * Geometry, z-order and persistence all live in the panel store — this
 * component only wires pointer events to them.
 */
export function PanelFrame({
  id,
  title,
  onClose,
  closeLabel = "Close panel",
  headerRight,
  children,
  bodyClassName = "",
  className = "",
  style,
  /** Disable edge snapping when the panel is a deliberate freeform surface. */
  snap = true,
}: {
  id: PanelId;
  title: string;
  onClose: () => void;
  closeLabel?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
  className?: string;
  style?: CSSProperties;
  snap?: boolean;
}) {
  const reduced = useReducedMotion();
  const panel = useDraggablePanel(id, { snap });

  return (
    <motion.div
      className={`pointer-events-auto absolute flex flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] shadow-[0_8px_24px_rgba(0,0,0,0.1)] ${className}`}
      style={{ ...panel.style, zIndex: panel.z, ...style }}
      initial={reduced ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduced ? undefined : { opacity: 0, scale: 0.98 }}
      transition={springOrInstant(reduced, springs.ui)}
    >
      <div
        onPointerDown={panel.startMove}
        className="flex shrink-0 cursor-grab touch-none select-none items-center gap-1.5 border-b border-[var(--line)] px-2 py-1.5 active:cursor-grabbing"
      >
        <button
          type="button"
          aria-label={`Resize ${title} panel`}
          onPointerDown={(e: ReactPointerEvent) => panel.startResize(e, "nw")}
          className="h-4 w-2 shrink-0 cursor-nwse-resize touch-none rounded-[2px] opacity-40 hover:opacity-80"
          title="Drag to resize"
        >
          <svg viewBox="0 0 8 16" className="h-full w-full" aria-hidden>
            <path
              d="M7 2 L2 7 M7 6 L4 9 M7 10 L5 12"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
        </button>
        <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--ink-1)]">
          {title}
        </p>
        {headerRight}
        <button
          type="button"
          aria-label={closeLabel}
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--r-nav)] text-[var(--ink-3)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
        >
          <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M3 3 L11 11 M11 3 L3 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className={`min-h-0 flex-1 overflow-hidden ${bodyClassName}`}>
        {children}
      </div>

      <button
        type="button"
        aria-label={`Resize ${title} panel`}
        onPointerDown={(e: ReactPointerEvent) => panel.startResize(e, "se")}
        className="absolute bottom-0 right-0 h-3.5 w-3.5 cursor-nwse-resize touch-none opacity-0 hover:opacity-40"
        title="Drag to resize"
      />
    </motion.div>
  );
}

/** Mount once near the app root so every panel re-clamps on viewport change. */
export function PanelViewportSync() {
  useEffect(() => {
    const sync = () =>
      panelStore.setViewport({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);
  return null;
}