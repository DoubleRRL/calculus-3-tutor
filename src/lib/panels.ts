/**
 * Floating-panel geometry: pure, framework-free, persistence-aware.
 *
 * Panels are freely positionable but must never be escapable: at least
 * PANEL_GRAB_KEEP px of the header stays on screen so a panel can always
 * be grabbed again.
 */

export type PanelId = "coach" | "calc" | "glossary" | "board";

export interface PanelGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Viewport {
  w: number;
  h: number;
}

export const PANEL_IDS: readonly PanelId[] = [
  "coach",
  "calc",
  "glossary",
  "board",
] as const;

export const PANEL_MIN_W = 280;
export const PANEL_MIN_H = 280;
/** Header strip that must remain on screen, so a panel is always grabbable. */
export const PANEL_GRAB_KEEP = 64;
/** Minimum visible margin on the near edges when a panel is fully in view. */
export const PANEL_EDGE_MARGIN = 12;

/** Default widths per panel, matching the pre-v3 docked widths. */
const DEFAULT_W: Record<PanelId, number> = {
  coach: 320,
  calc: 300,
  glossary: 320,
  board: 380,
};

/** Default height as a fraction of viewport height, per panel. */
const DEFAULT_H_FRACTION: Record<PanelId, number> = {
  coach: 0.55,
  calc: 0.5,
  glossary: 0.55,
  board: 0.6,
};

export function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

export function maxPanelWidth(vp: Viewport): number {
  return Math.max(PANEL_MIN_W, vp.w - PANEL_EDGE_MARGIN * 2);
}

export function maxPanelHeight(vp: Viewport): number {
  return Math.max(PANEL_MIN_H, vp.h - PANEL_EDGE_MARGIN * 2);
}

/** Anchor to the bottom-right dock, matching where panels sat before v3. */
export function dockedGeometry(
  id: PanelId,
  vp: Viewport,
  bottomInset = 100,
): PanelGeometry {
  const w = Math.min(DEFAULT_W[id], maxPanelWidth(vp));
  const h = clamp(
    Math.round(vp.h * DEFAULT_H_FRACTION[id]),
    PANEL_MIN_H,
    maxPanelHeight(vp),
  );
  return clampPanel(
    { x: vp.w - PANEL_EDGE_MARGIN - w, y: vp.h - bottomInset - h, w, h },
    vp,
  );
}

/**
 * Force geometry into a legal box: size within limits, position within the
 * range that keeps PANEL_GRAB_KEEP px of header on screen.
 */
export function clampPanel(g: PanelGeometry, vp: Viewport): PanelGeometry {
  const w = clamp(g.w, PANEL_MIN_W, maxPanelWidth(vp));
  const h = clamp(g.h, PANEL_MIN_H, maxPanelHeight(vp));
  // Keep a strip of the header reachable: x may go negative only so that
  // PANEL_GRAB_KEEP of the panel still overlaps the viewport.
  const maxX = vp.w - PANEL_GRAB_KEEP;
  const minX = Math.min(PANEL_EDGE_MARGIN, maxX) - (w - PANEL_GRAB_KEEP);
  const maxY = Math.max(PANEL_EDGE_MARGIN, vp.h - PANEL_GRAB_KEEP);
  const minY = Math.min(PANEL_EDGE_MARGIN, maxY);
  return {
    x: Math.round(clamp(g.x, minX, maxX)),
    y: Math.round(clamp(g.y, minY, maxY)),
    w: Math.round(w),
    h: Math.round(h),
  };
}

/** Keep the top-left corner fixed while the bottom-right edge follows. */
export function resizeFromCorner(
  start: PanelGeometry,
  dx: number,
  dy: number,
  vp: Viewport,
): PanelGeometry {
  return clampPanel(
    { x: start.x, y: start.y, w: start.w + dx, h: start.h + dy },
    vp,
  );
}

/** Drag the top-left corner: the bottom-right corner stays pinned. */
export function resizeFromTopLeft(
  start: PanelGeometry,
  dx: number,
  dy: number,
  vp: Viewport,
): PanelGeometry {
  return clampPanel(
    { x: start.x + dx, y: start.y + dy, w: start.w - dx, h: start.h - dy },
    vp,
  );
}

/** Move by a delta, preserving size. */
export function moveBy(
  start: PanelGeometry,
  dx: number,
  dy: number,
  vp: Viewport,
): PanelGeometry {
  return clampPanel({ ...start, x: start.x + dx, y: start.y + dy }, vp);
}

/**
 * Snap a candidate geometry onto an edge/margin grid. Purely additive —
 * a no-op when the panel is already close to a slot.
 */
export const SNAP_PX = 16;

export function snapGeometry(g: PanelGeometry, vp: Viewport): PanelGeometry {
  const near = (n: number, targets: number[]) =>
    targets.some((t) => Math.abs(n - t) <= SNAP_PX);
  const vSlots = [PANEL_EDGE_MARGIN, Math.round((vp.w - g.w) / 2), vp.w - g.w - PANEL_EDGE_MARGIN];
  const hSlots = [PANEL_EDGE_MARGIN, Math.round((vp.h - g.h) / 2), vp.h - g.h - PANEL_EDGE_MARGIN];
  const next = { ...g };
  if (near(g.x, vSlots)) next.x = vSlots.reduce((p, c) => (Math.abs(g.x - c) < Math.abs(g.x - p) ? c : p));
  if (near(g.y, hSlots)) next.y = hSlots.reduce((p, c) => (Math.abs(g.y - c) < Math.abs(g.y - p) ? c : p));
  return clampPanel(next, vp);
}

export function viewportsEqual(a: Viewport, b: Viewport): boolean {
  return a.w === b.w && a.h === b.h;
}

export type PanelGeometryMap = Record<PanelId, PanelGeometry>;

export function defaultPanels(vp: Viewport): PanelGeometryMap {
  return {
    coach: dockedGeometry("coach", vp),
    calc: dockedGeometry("calc", vp),
    glossary: dockedGeometry("glossary", vp),
    board: dockedGeometry("board", vp),
  };
}