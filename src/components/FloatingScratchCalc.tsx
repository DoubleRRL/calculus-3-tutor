import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from "react";
import { Calculator, ChevronRight } from "lucide-react";
import { ScratchCalc } from "./ScratchCalc";
import { Icon } from "@/ui";
import {
  AnimatePresence,
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";

const PANEL_SIZE_KEY = "calctutor.calcPanelSize";

const MIN_W = 280;
const MIN_H = 320;
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
  return Math.min(window.innerWidth * 0.9, 26 * 16);
}

function defaultPanelSize(): { w: number; h: number } {
  return {
    w: 300,
    h: clamp(Math.round(window.innerHeight * 0.5), MIN_H, maxPanelHeight()),
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

export function FloatingScratchCalc({
  open,
  onOpenChange,
  onUseResult,
  /** Extra offset above the Check footer (e.g. stack above Coach tab). */
  tabBottomOffsetPx = 0,
  /** Shift panel left when Coach panel is also open. */
  panelRightOffsetPx = 12,
  /** Hide the side dock tab (e.g. while Coach float is open). */
  hideDockTab = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseResult: (value: string) => void;
  tabBottomOffsetPx?: number;
  panelRightOffsetPx?: number;
  hideDockTab?: boolean;
}) {
  const reduced = useReducedMotion();
  const [panelSize, setPanelSize] = useState(loadPanelSize);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify(panelSize));
  }, [panelSize]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dw = d.startX - e.clientX;
    const dh = d.startY - e.clientY;
    setPanelSize({
      w: clamp(d.startW + dw, MIN_W, maxPanelWidth()),
      h: clamp(d.startH + dh, MIN_H, maxPanelHeight()),
    });
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
      startX: e.clientX,
      startY: e.clientY,
      startW: panelSize.w,
      startH: panelSize.h,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", endDrag);
  }

  useEffect(() => () => endDrag(), [endDrag]);

  const bottomBase = "calc(100px + env(safe-area-inset-bottom))";
  const tabStyle: CSSProperties = {
    bottom: `calc(100px + env(safe-area-inset-bottom) + ${tabBottomOffsetPx}px)`,
  };
  const panelStyle: CSSProperties = {
    bottom: bottomBase,
    right: panelRightOffsetPx,
    width: panelSize.w,
    height: panelSize.h,
    maxHeight: maxPanelHeight(),
    maxWidth: "calc(100% - 1.5rem)",
  };

  return (
    <div
      className={`pointer-events-none fixed inset-0 ${open ? "z-[54]" : "z-[44]"}`}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            className="pointer-events-auto absolute rounded-[var(--r-card)] shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
            style={panelStyle}
            initial={reduced ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: 20 }}
            transition={springOrInstant(reduced, springs.ui)}
          >
            <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--r-card)] border border-[var(--line)] bg-[var(--card)] p-3">
              <button
                type="button"
                aria-label="Resize calculator panel"
                onPointerDown={beginPanelResize}
                className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-sm border border-[var(--line-2)] bg-[var(--bg-sub)] cursor-nwse-resize touch-none z-10"
                title="Drag to resize"
              />
              <div className="flex items-center justify-between gap-2 mb-2 shrink-0 pl-5">
                <p className="text-[13px] font-medium text-[var(--ink-1)]">
                  Scratch calc
                </p>
                <button
                  type="button"
                  aria-label="Minimize calculator"
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--r-nav)] text-[var(--ink-3)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
                >
                  <Icon icon={ChevronRight} size={14} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <ScratchCalc onUseResult={onUseResult} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && !hideDockTab && (
        <motion.button
          type="button"
          aria-label="Open scratch calculator"
          onClick={() => onOpenChange(true)}
          className="pointer-events-auto absolute right-0 flex items-center gap-1.5 rounded-l-[var(--r-nav)] border border-r-0 border-[var(--line)] bg-[var(--card)] pl-2.5 pr-2 py-2.5 text-[12px] font-medium text-[var(--ink-1)] shadow-sm"
          style={tabStyle}
          initial={false}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          transition={springOrInstant(reduced, springs.snappy)}
        >
          <Icon icon={Calculator} size={14} />
          Calc
        </motion.button>
      )}
    </div>
  );
}
