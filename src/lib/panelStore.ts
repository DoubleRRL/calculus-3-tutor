/**
 * Floating-panel store: geometry persistence plus a shared z-order stack.
 *
 * Geometry is persisted to localStorage. Z-order is deliberately session-only
 * so panels reopen in a predictable order rather than whatever was last
 * clicked before quit.
 *
 * Legacy per-panel size keys (`calctutor.<id>PanelSize`) are migrated on first
 * read so existing sizes survive the move to free positioning.
 */

import { useSyncExternalStore } from "react";
import {
  PANEL_IDS,
  clampPanel,
  defaultPanels,
  type PanelGeometry,
  type PanelGeometryMap,
  type PanelId,
  type Viewport,
} from "./panels";

const STORAGE_KEY = "calctutor.panels.v3";

/** Pre-v3 keys held only `{w,h}` with the panel docked bottom-right. */
const LEGACY_SIZE_KEYS: Record<PanelId, string> = {
  coach: "calctutor.coachPanelSize",
  calc: "calctutor.calcPanelSize",
  glossary: "calctutor.glossaryPanelSize",
  board: "",
};

const BASE_Z = 40;
/** SessionShell root sits at z-40; panels float above it. */
const Z_STEP = 1;

export interface PanelState {
  geom: PanelGeometryMap;
  z: Record<PanelId, number>;
  viewport: Viewport;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function currentViewport(): Viewport {
  if (typeof window === "undefined") return { w: 1440, h: 900 };
  return { w: window.innerWidth, h: window.innerHeight };
}

function readStored(): PanelGeometryMap | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return null;
    return parsed as PanelGeometryMap;
  } catch {
    return null;
  }
}

function readLegacySize(id: PanelId): { w?: number; h?: number } | null {
  const key = LEGACY_SIZE_KEYS[id];
  if (!key || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Stored geometry, falling back to docked defaults with legacy sizes applied. */
export function loadPanels(vp: Viewport = currentViewport()): PanelGeometryMap {
  const stored = readStored();
  if (stored) {
    const base = defaultPanels(vp);
    const out = {} as PanelGeometryMap;
    for (const id of PANEL_IDS) {
      const g = stored[id];
      out[id] = isObject(g)
        ? clampPanel(
            {
              x: Number(g.x),
              y: Number(g.y),
              w: Number(g.w),
              h: Number(g.h),
            },
            vp,
          )
        : base[id];
    }
    return out;
  }

  const base = defaultPanels(vp);
  for (const id of PANEL_IDS) {
    const legacy = readLegacySize(id);
    if (!legacy) continue;
    const w = Number(legacy.w);
    const h = Number(legacy.h);
    const seed = base[id];
    if (!Number.isFinite(w) && !Number.isFinite(h)) continue;
    base[id] = clampPanel(
      {
        x: seed.x,
        y: seed.y,
        w: Number.isFinite(w) ? w : seed.w,
        h: Number.isFinite(h) ? h : seed.h,
      },
      vp,
    );
  }
  return base;
}

export function savePanels(geom: PanelGeometryMap): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(geom));
  } catch {
    // Quota or private mode — geometry is a convenience, not critical.
  }
}

function initialState(): PanelState {
  const viewport = currentViewport();
  return {
    geom: loadPanels(viewport),
    z: { coach: BASE_Z, calc: BASE_Z, glossary: BASE_Z, board: BASE_Z },
    viewport,
  };
}

let state: PanelState = initialState();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): PanelState {
  return state;
}

/** Highest z currently assigned; panels stack above this as they focus. */
function maxZ(): number {
  return Math.max(...PANEL_IDS.map((id) => state.z[id]));
}

export const panelStore = {
  subscribe,
  getSnapshot,

  setGeometry(id: PanelId, g: PanelGeometry): void {
    const next = clampPanel(g, state.viewport);
    if (
      state.geom[id].x === next.x &&
      state.geom[id].y === next.y &&
      state.geom[id].w === next.w &&
      state.geom[id].h === next.h
    ) {
      return;
    }
    state = { ...state, geom: { ...state.geom, [id]: next } };
    savePanels(state.geom);
    emit();
  },

  reset(id: PanelId): void {
    state = {
      ...state,
      geom: { ...state.geom, [id]: defaultPanels(state.viewport)[id] },
    };
    savePanels(state.geom);
    emit();
  },

  /** Raise a panel above its peers. */
  focus(id: PanelId): void {
    if (state.z[id] >= maxZ()) return;
    state = {
      ...state,
      z: { ...state.z, [id]: maxZ() + Z_STEP },
    };
    emit();
  },

  /** Re-clamp every panel, e.g. after a viewport resize. */
  setViewport(vp: Viewport): void {
    if (vp.w === state.viewport.w && vp.h === state.viewport.h) return;
    const geom = {} as PanelGeometryMap;
    for (const id of PANEL_IDS) geom[id] = clampPanel(state.geom[id], vp);
    state = { ...state, geom, viewport: vp };
    savePanels(geom);
    emit();
  },
};

/** Test seam: force a known state without touching localStorage. */
export function __setPanelState(next: PanelState): void {
  state = next;
  emit();
}

export function usePanelState(): PanelState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function usePanelGeometry(id: PanelId): PanelGeometry {
  return usePanelState().geom[id];
}

export function usePanelZ(id: PanelId): number {
  return usePanelState().z[id];
}