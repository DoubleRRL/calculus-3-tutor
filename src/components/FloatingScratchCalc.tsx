import { type CSSProperties } from "react";
import { Calculator } from "lucide-react";
import { ScratchCalc } from "./ScratchCalc";
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

export function FloatingScratchCalc({
  open,
  onOpenChange,
  onUseResult,
  /** Extra offset above the Check footer (e.g. stack above Coach tab). */
  tabBottomOffsetPx = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseResult: (value: string) => void;
  tabBottomOffsetPx?: number;
}) {
  const reduced = useReducedMotion();

  const tabStyle: CSSProperties = {
    bottom: `calc(100px + env(safe-area-inset-bottom) + ${tabBottomOffsetPx}px)`,
  };

  return (
    <div className={`pointer-events-none fixed inset-0 ${open ? "z-[54]" : "z-[44]"}`}>
      {open && (
        <FloatDismissBackdrop
          onDismiss={() => onOpenChange(false)}
          label="Close calculator"
        />
      )}

      <AnimatePresence>
        {open && (
          <PanelFrame
            key="calc"
            id="calc"
            title="Scratch calc"
            onClose={() => onOpenChange(false)}
            closeLabel="Minimize calculator"
            bodyClassName="flex flex-col p-2 pt-1"
          >
            <ScratchCalc onUseResult={onUseResult} />
          </PanelFrame>
        )}
      </AnimatePresence>

      {!open && (
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