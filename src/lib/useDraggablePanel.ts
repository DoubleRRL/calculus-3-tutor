import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  moveBy,
  resizeFromCorner,
  resizeFromTopLeft,
  snapGeometry,
  type PanelGeometry,
  type PanelId,
} from "./panels";
import { panelStore, usePanelGeometry, usePanelState } from "./panelStore";

type DragKind = "move" | "resize-se" | "resize-nw";

interface DragState {
  kind: DragKind;
  startX: number;
  startY: number;
  start: PanelGeometry;
  snap: boolean;
}

export interface DraggablePanel {
  geom: PanelGeometry;
  style: CSSProperties;
  z: number;
  startMove: (e: ReactPointerEvent) => void;
  startResize: (e: ReactPointerEvent, corner: "se" | "nw") => void;
  reset: () => void;
}

/**
 * Free-positioning window behaviour for a floating panel: move by the header,
 * resize from either corner, snap to margins on release.
 *
 * The panel is raised to the front on grab, so overlapping panels stay
 * reachable without a separate "bring to front" affordance.
 */
export function useDraggablePanel(
  id: PanelId,
  opts?: { snap?: boolean },
): DraggablePanel {
  const geom = usePanelGeometry(id);
  const state = usePanelState();
  const vp = state.viewport;
  const dragRef = useRef<DragState | null>(null);
  const snapEnabled = opts?.snap ?? true;

  const onMove = useCallback(
    (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.kind === "move") {
        panelStore.setGeometry(id, moveBy(d.start, dx, dy, vp));
      } else if (d.kind === "resize-se") {
        panelStore.setGeometry(id, resizeFromCorner(d.start, dx, dy, vp));
      } else {
        panelStore.setGeometry(id, resizeFromTopLeft(d.start, dx, dy, vp));
      }
    },
    [id, vp],
  );

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    if (d && d.snap && d.kind === "move") {
      panelStore.setGeometry(id, snapGeometry(panelStore.getSnapshot().geom[id], vp));
    }
  }, [id, onMove, vp]);

  const begin = useCallback(
    (e: ReactPointerEvent, kind: DragKind) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      e.stopPropagation();
      panelStore.focus(id);
      dragRef.current = {
        kind,
        startX: e.clientX,
        startY: e.clientY,
        start: panelStore.getSnapshot().geom[id],
        snap: snapEnabled,
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);
    },
    [endDrag, id, onMove, snapEnabled],
  );

  const startMove = useCallback(
    (e: ReactPointerEvent) => begin(e, "move"),
    [begin],
  );

  const startResize = useCallback(
    (e: ReactPointerEvent, corner: "se" | "nw") =>
      begin(e, corner === "se" ? "resize-se" : "resize-nw"),
    [begin],
  );

  // Clean up listeners if the panel unmounts mid-drag.
  useEffect(() => endDrag, [endDrag]);

  const reset = useCallback(() => panelStore.reset(id), [id]);

  return {
    geom,
    z: state.z[id],
    style: { left: geom.x, top: geom.y, width: geom.w, height: geom.h },
    startMove,
    startResize,
    reset,
  };
}