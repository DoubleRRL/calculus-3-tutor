import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MessageCircle, ChevronRight, X } from "lucide-react";
import type { CoachMessage } from "@/types/content";
import { CoachPanel } from "./CoachPanel";
import { Icon } from "@/ui";
import {
  AnimatePresence,
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

const PANEL_SIZE_KEY = "calctutor.coachPanelSize";
const SHEET_HEIGHT_KEY = "calctutor.coachSheetHeight";

const MIN_W = 280;
const MIN_H = 280;
/** Keep panel top below session header so the resize grip stays usable. */
const HEADER_CLEARANCE = 56;
const BOTTOM_OFFSET_PX = 100;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function maxPanelHeight(): number {
  return Math.max(
    MIN_H,
    window.innerHeight - BOTTOM_OFFSET_PX - HEADER_CLEARANCE,
  );
}

function maxPanelWidth(): number {
  return Math.min(window.innerWidth * 0.9, 28 * 16);
}

function defaultPanelSize(): { w: number; h: number } {
  return {
    w: 320,
    h: clamp(Math.round(window.innerHeight * 0.55), MIN_H, maxPanelHeight()),
  };
}

function loadPanelSize(): { w: number; h: number } {
  const fallback = defaultPanelSize();
  try {
    const raw = localStorage.getItem(PANEL_SIZE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { w?: number; h?: number };
    return {
      w: clamp(Number(parsed.w) || fallback.w, MIN_W, maxPanelWidth()),
      h: clamp(Number(parsed.h) || fallback.h, MIN_H, maxPanelHeight()),
    };
  } catch {
    return fallback;
  }
}

function loadSheetHeight(): number {
  try {
    const raw = localStorage.getItem(SHEET_HEIGHT_KEY);
    const n = raw ? Number(raw) : window.innerHeight * 0.55;
    return clamp(
      Number.isFinite(n) ? n : window.innerHeight * 0.55,
      window.innerHeight * 0.4,
      window.innerHeight * 0.85,
    );
  } catch {
    return window.innerHeight * 0.55;
  }
}

export function FloatingCoach({
  open,
  onOpenChange,
  pulse,
  enabled,
  busy,
  messages,
  onAsk,
  chips,
  caption,
  variant = "float",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Soft pulse when minimized after a wrong answer. */
  pulse?: boolean;
  enabled: boolean;
  busy: boolean;
  messages: CoachMessage[];
  onAsk: (q: string) => void;
  chips?: string[];
  caption?: string;
  /** `sheet` = bottom sheet (Discuss from feedback); `float` = side panel. */
  variant?: "float" | "sheet";
}) {
  const reduced = useReducedMotion();
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const [sheetH, setSheetH] = useState(loadSheetHeight);
  const dragRef = useRef<{
    kind: "panel" | "sheet";
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify(panelSize));
  }, [panelSize]);

  useEffect(() => {
    localStorage.setItem(SHEET_HEIGHT_KEY, String(sheetH));
  }, [sheetH]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (d.kind === "panel") {
      // Handle is top-left: drag left/up grows the panel (anchored bottom-right).
      const dw = d.startX - e.clientX;
      const dh = d.startY - e.clientY;
      setPanelSize({
        w: clamp(d.startW + dw, MIN_W, maxPanelWidth()),
        h: clamp(d.startH + dh, MIN_H, maxPanelHeight()),
      });
    } else {
      const dh = d.startY - e.clientY;
      setSheetH(
        clamp(
          d.startH + dh,
          window.innerHeight * 0.4,
          window.innerHeight * 0.85,
        ),
      );
    }
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
  }, [onPointerMove]);

  function beginPanelResize(e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      kind: "panel",
      startX: e.clientX,
      startY: e.clientY,
      startW: panelSize.w,
      startH: panelSize.h,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }

  function beginSheetResize(e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      kind: "sheet",
      startX: e.clientX,
      startY: e.clientY,
      startW: 0,
      startH: sheetH,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }

  useEffect(() => () => endDrag(), [endDrag]);

  if (!enabled) return null;

  const bottom = "calc(100px + env(safe-area-inset-bottom))";

  if (variant === "sheet") {
    return (
      <div className="pointer-events-none fixed inset-0 z-[55]">
        <AnimatePresence>
          {open && (
            <>
              <motion.button
                type="button"
                aria-label="Close coach"
                className="pointer-events-auto absolute inset-0 bg-[var(--ink-1)]/25"
                onClick={() => onOpenChange(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={springOrInstant(reduced, { duration: 0.2 })}
              />
              <motion.div
                className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col rounded-t-[var(--r-card)] border border-b-0 border-[var(--line)] bg-[var(--card)] shadow-[0_-8px_24px_rgba(0,0,0,0.1)] px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2"
                style={{ height: sheetH }}
                initial={reduced ? false : { y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduced ? undefined : { y: 32, opacity: 0 }}
                transition={springOrInstant(reduced, springs.ui)}
              >
                <button
                  type="button"
                  aria-label="Resize coach sheet"
                  onPointerDown={beginSheetResize}
                  className="mx-auto mb-2 h-1.5 w-10 shrink-0 rounded-full bg-[var(--line-2)] cursor-ns-resize touch-none"
                />
                <div className="flex items-center justify-between gap-2 mb-2 max-w-xl mx-auto w-full shrink-0">
                  <p className="text-[13px] font-medium text-[var(--ink-1)]">
                    Discuss with coach
                  </p>
                  <button
                    type="button"
                    aria-label="Close coach"
                    onClick={() => onOpenChange(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-[var(--r-nav)] text-[var(--ink-3)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
                  >
                    <Icon icon={X} size={14} />
                  </button>
                </div>
                <div className="max-w-xl mx-auto w-full flex-1 min-h-0 flex flex-col">
                  <CoachPanel
                    enabled
                    busy={busy}
                    messages={messages}
                    onAsk={onAsk}
                    chips={chips}
                    caption={caption}
                    className="h-full"
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed inset-0 ${open ? "z-[55]" : "z-[45]"}`}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            className="pointer-events-auto absolute right-3 rounded-[var(--r-card)] shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
            style={{
              bottom,
              width: panelSize.w,
              height: panelSize.h,
              maxHeight: maxPanelHeight(),
              maxWidth: "calc(100% - 1.5rem)",
            }}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: 20 }}
            transition={springOrInstant(reduced, springs.ui)}
          >
            <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-3">
              <button
                type="button"
                aria-label="Resize coach panel"
                onPointerDown={beginPanelResize}
                className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-sm border border-[var(--line-2)] bg-[var(--bg-sub)] cursor-nwse-resize touch-none z-10"
                title="Drag to resize"
              />
              <div className="flex items-center justify-between gap-2 mb-2 shrink-0 pl-5">
                <p className="text-[13px] font-medium text-[var(--ink-1)]">
                  Coach
                </p>
                <button
                  type="button"
                  aria-label="Minimize coach"
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--r-nav)] text-[var(--ink-3)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
                >
                  <Icon icon={ChevronRight} size={14} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <CoachPanel
                  enabled
                  busy={busy}
                  messages={messages}
                  onAsk={onAsk}
                  chips={chips}
                  caption={caption}
                  className="h-full min-h-0"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          type="button"
          aria-label="Open coach"
          onClick={() => onOpenChange(true)}
          className={`pointer-events-auto absolute right-0 flex items-center gap-1.5 rounded-l-[var(--r-nav)] border border-r-0 border-[var(--line)] bg-[var(--card)] pl-2.5 pr-2 py-2.5 text-[12px] font-medium text-[var(--ink-1)] shadow-sm ${
            pulse ? "animate-pulse-soft ring-2 ring-[var(--accent)]/40" : ""
          }`}
          style={{ bottom }}
          initial={false}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          transition={springOrInstant(reduced, springs.snappy)}
        >
          <Icon icon={MessageCircle} size={14} />
          Coach
        </motion.button>
      )}
    </div>
  );
}
