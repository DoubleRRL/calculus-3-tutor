import { type CSSProperties } from "react";
import { BookOpen } from "lucide-react";
import { GlossaryPanel } from "./GlossaryPanel";
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
import { usePanelGeometry } from "@/lib/panelStore";

export function FloatingGlossary({
  open,
  onOpenChange,
  skillId,
  /** Extra offset above the Check footer (e.g. stack above Coach/Calc tabs). */
  tabBottomOffsetPx = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillId?: string;
  tabBottomOffsetPx?: number;
}) {
  const reduced = useReducedMotion();
  const geom = usePanelGeometry("glossary");

  const compact = geom.w < 320;
  const narrow = geom.w < 280;

  const tabStyle: CSSProperties = {
    bottom: `calc(100px + env(safe-area-inset-bottom) + ${tabBottomOffsetPx}px)`,
  };

  return (
    <div className={`pointer-events-none fixed inset-0 ${open ? "z-[55]" : "z-[45]"}`}>
      {open && (
        <FloatDismissBackdrop
          onDismiss={() => onOpenChange(false)}
          label="Close reference"
        />
      )}

      <AnimatePresence>
        {open && (
          <PanelFrame
            key="glossary"
            id="glossary"
            title="Reference"
            onClose={() => onOpenChange(false)}
            closeLabel="Minimize glossary"
            bodyClassName="flex flex-col p-2 pt-1"
          >
            <GlossaryPanel skillId={skillId} compact={compact} narrow={narrow} showCheatSheets />
          </PanelFrame>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          type="button"
          aria-label="Open reference glossary"
          onClick={() => onOpenChange(true)}
          className="pointer-events-auto absolute right-0 flex items-center gap-1.5 rounded-l-[var(--r-nav)] border border-r-0 border-[var(--line)] bg-[var(--card)] pl-2.5 pr-2 py-2.5 text-[12px] font-medium text-[var(--ink-1)] shadow-sm"
          style={tabStyle}
          initial={false}
          whileTap={reduced ? undefined : { scale: 0.97 }}
          transition={springOrInstant(reduced, springs.snappy)}
        >
          <Icon icon={BookOpen} size={14} />
          Ref
        </motion.button>
      )}
    </div>
  );
}