import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MessageCircle } from "lucide-react";
import type { CoachMessage } from "@/types/content";
import { CoachPanel } from "./CoachPanel";
import { FloatDismissBackdrop } from "./FloatDismissBackdrop";
import { PanelFrame } from "./PanelFrame";
import { Icon } from "@/ui";
import {
  AnimatePresence,
  motion,
  springs,
  springOrInstant,
  useReducedMotion,
} from "@/lib/motion";
import { clamp } from "@/lib/panels";

const SHEET_HEIGHT_KEY = "calctutor.coachSheetHeight";

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
  /** `sheet` = bottom sheet (Discuss from feedback); `float` = free panel. */
  variant?: "float" | "sheet";
}) {
  const reduced = useReducedMotion();
  const [sheetH, setSheetH] = useState(loadSheetHeight);
  const sheetDrag = useRef<{ startY: number; startH: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(SHEET_HEIGHT_KEY, String(sheetH));
  }, [sheetH]);

  const onSheetDrag = useCallback((e: PointerEvent) => {
    const d = sheetDrag.current;
    if (!d) return;
    const dh = d.startY - e.clientY;
    setSheetH(
      clamp(
        d.startH + dh,
        window.innerHeight * 0.4,
        window.innerHeight * 0.85,
      ),
    );
  }, []);

  const endSheetDrag = useCallback(() => {
    sheetDrag.current = null;
    window.removeEventListener("pointermove", onSheetDrag);
    window.removeEventListener("pointerup", endSheetDrag);
  }, [onSheetDrag]);

  function beginSheetResize(e: ReactPointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    sheetDrag.current = { startY: e.clientY, startH: sheetH };
    window.addEventListener("pointermove", onSheetDrag);
    window.addEventListener("pointerup", endSheetDrag);
  }

  useEffect(() => endSheetDrag, [endSheetDrag]);

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
                <div className="mb-2 flex w-full max-w-xl shrink-0 items-center justify-between gap-2 mx-auto">
                  <p className="text-[13px] font-medium text-[var(--ink-1)]">
                    Discuss with coach
                  </p>
                  <button
                    type="button"
                    aria-label="Close coach"
                    onClick={() => onOpenChange(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-[var(--r-nav)] text-[var(--ink-3)] hover:bg-[var(--accent-weak)] hover:text-[var(--ink-1)]"
                  >
                    <Icon icon={MessageCircle} size={14} />
                  </button>
                </div>
                <div className="flex min-h-0 w-full max-w-xl flex-1 flex-col mx-auto">
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
    <div className={`pointer-events-none fixed inset-0 ${open ? "z-[55]" : "z-[45]"}`}>
      {open && (
        <FloatDismissBackdrop
          onDismiss={() => onOpenChange(false)}
          label="Close coach"
        />
      )}

      <AnimatePresence>
        {open && (
          <PanelFrame
            key="coach"
            id="coach"
            title="Coach"
            onClose={() => onOpenChange(false)}
            closeLabel="Minimize coach"
            bodyClassName="flex flex-col p-2 pt-1"
          >
            <CoachPanel
              enabled
              busy={busy}
              messages={messages}
              onAsk={onAsk}
              chips={chips}
              caption={caption}
              className="h-full min-h-0"
            />
          </PanelFrame>
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