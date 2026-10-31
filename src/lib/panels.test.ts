import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PANEL_GRAB_KEEP,
  PANEL_MIN_H,
  PANEL_MIN_W,
  clampPanel,
  defaultPanels,
  dockedGeometry,
  moveBy,
  resizeFromCorner,
  resizeFromTopLeft,
  snapGeometry,
  type PanelGeometry,
} from "./panels";
import { loadPanels } from "./panelStore";

const VP = { w: 1440, h: 900 };

function memStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    _map: map,
  };
}

describe("clampPanel", () => {
  it("enforces minimum size", () => {
    const g = clampPanel({ x: 0, y: 0, w: 10, h: 10 }, VP);
    expect(g.w).toBe(PANEL_MIN_W);
    expect(g.h).toBe(PANEL_MIN_H);
  });

  it("enforces maximum size from the viewport", () => {
    const g = clampPanel({ x: 0, y: 0, w: 99_999, h: 99_999 }, VP);
    expect(g.w).toBeLessThanOrEqual(VP.w);
    expect(g.h).toBeLessThanOrEqual(VP.h);
  });

  it("keeps at least PANEL_GRAB_KEEP of width on screen when dragged far left", () => {
    const g = clampPanel({ x: -9999, y: 100, w: 320, h: 400 }, VP);
    expect(g.x + g.w).toBeGreaterThanOrEqual(PANEL_GRAB_KEEP);
  });

  it("keeps at least PANEL_GRAB_KEEP of height on screen when dragged off the top", () => {
    const g = clampPanel({ x: 100, y: -9999, w: 320, h: 400 }, VP);
    expect(g.y).toBeGreaterThanOrEqual(0);
  });

  it("keeps the panel grabbable when dragged far right and down", () => {
    const g = clampPanel({ x: 99_999, y: 99_999, w: 320, h: 400 }, VP);
    expect(g.x + PANEL_GRAB_KEEP).toBeLessThanOrEqual(VP.w);
    expect(g.y + PANEL_GRAB_KEEP).toBeLessThanOrEqual(VP.h);
  });

  it("repairs NaN from a corrupt store rather than propagating it", () => {
    const g = clampPanel({ x: NaN, y: NaN, w: NaN, h: NaN }, VP);
    for (const v of Object.values(g)) expect(Number.isFinite(v)).toBe(true);
  });

  it("never lets a panel be fully invisible on a small viewport", () => {
    const small = { w: 320, h: 480 };
    const g = clampPanel({ x: -5000, y: -5000, w: 900, h: 900 }, small);
    expect(g.x).toBeLessThanOrEqual(small.w);
    expect(g.y).toBeLessThanOrEqual(small.h);
    expect(g.x + g.w).toBeGreaterThan(PANEL_GRAB_KEEP);
    expect(g.y + g.h).toBeGreaterThan(PANEL_GRAB_KEEP);
  });
});

describe("moveBy", () => {
  it("translates without changing size", () => {
    const start: PanelGeometry = { x: 100, y: 100, w: 320, h: 400 };
    const g = moveBy(start, 50, -30, VP);
    expect(g.w).toBe(start.w);
    expect(g.h).toBe(start.h);
    expect(g.x).toBe(150);
    expect(g.y).toBe(70);
  });

  it("clamps a runaway drag", () => {
    const start: PanelGeometry = { x: 100, y: 100, w: 320, h: 400 };
    const g = moveBy(start, 9999, 9999, VP);
    expect(g.x + PANEL_GRAB_KEEP).toBeLessThanOrEqual(VP.w);
    expect(g.y + PANEL_GRAB_KEEP).toBeLessThanOrEqual(VP.h);
  });
});

describe("resizeFromCorner", () => {
  it("keeps the top-left corner pinned while the SE edge follows", () => {
    const start: PanelGeometry = { x: 100, y: 100, w: 320, h: 400 };
    const g = resizeFromCorner(start, 40, 60, VP);
    expect(g.x).toBe(100);
    expect(g.y).toBe(100);
    expect(g.w).toBe(360);
    expect(g.h).toBe(460);
  });
});

describe("resizeFromTopLeft", () => {
  it("keeps the bottom-right corner pinned", () => {
    const start: PanelGeometry = { x: 100, y: 100, w: 320, h: 400 };
    const g = resizeFromTopLeft(start, -40, -60, VP);
    expect(g.x + g.w).toBe(420);
    expect(g.y + g.h).toBe(500);
    expect(g.w).toBe(360);
    expect(g.h).toBe(460);
  });

  it("never inverts width or height past the minimum", () => {
    const start: PanelGeometry = { x: 100, y: 100, w: 320, h: 400 };
    const g = resizeFromTopLeft(start, 5000, 5000, VP);
    expect(g.w).toBe(PANEL_MIN_W);
    expect(g.h).toBe(PANEL_MIN_H);
  });
});

describe("snapGeometry", () => {
  it("snaps to the left margin when released just past it", () => {
    const g = snapGeometry({ x: 14, y: 400, w: 320, h: 400 }, VP);
    expect(g.x).toBe(12);
    expect(g.y).toBe(400);
  });

  it("snaps to centre when released near it", () => {
    const w = 320;
    const centre = Math.round((VP.w - w) / 2);
    const g = snapGeometry({ x: centre + 5, y: 400, w, h: 400 }, VP);
    expect(g.x).toBe(centre);
  });

  it("leaves an off-grid position alone", () => {
    const g = snapGeometry({ x: 437, y: 419, w: 320, h: 400 }, VP);
    expect(g.x).toBe(437);
    expect(g.y).toBe(419);
  });
});

describe("dockedGeometry / defaultPanels", () => {
  it("docks bottom-right inside the viewport", () => {
    const g = dockedGeometry("coach", VP);
    expect(g.x + g.w).toBeLessThanOrEqual(VP.w);
    expect(g.y).toBeGreaterThanOrEqual(0);
    expect(g.w).toBeGreaterThanOrEqual(PANEL_MIN_W);
  });

  it("produces a full set of legal panels", () => {
    const all = defaultPanels(VP);
    for (const g of Object.values(all)) {
      expect(g.w).toBeGreaterThanOrEqual(PANEL_MIN_W);
      expect(g.h).toBeGreaterThanOrEqual(PANEL_MIN_H);
      expect(g.x + PANEL_GRAB_KEEP).toBeLessThanOrEqual(VP.w);
      expect(g.y + PANEL_GRAB_KEEP).toBeLessThanOrEqual(VP.h);
    }
  });
});

describe("loadPanels persistence", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads a stored geometry for every panel", () => {
    const store = memStorage({
      "calctutor.panels.v3": JSON.stringify({
        coach: { x: 1, y: 2, w: 333, h: 444 },
        calc: { x: 5, y: 6, w: 350, h: 450 },
        glossary: { x: 7, y: 8, w: 360, h: 460 },
        board: { x: 9, y: 10, w: 370, h: 470 },
      }),
    });
    vi.stubGlobal("localStorage", store);
    const p = loadPanels(VP);
    expect(p.coach.w).toBe(333);
    expect(p.calc.x).toBe(5);
    expect(p.board.h).toBe(470);
    });

  it("migrates a legacy per-panel size onto the docked default", () => {
    const store = memStorage({
      "calctutor.coachPanelSize": JSON.stringify({ w: 512, h: 601 }),
    });
    vi.stubGlobal("localStorage", store);
    const p = loadPanels(VP);
    expect(p.coach.w).toBe(512);
    expect(p.coach.h).toBe(601);
    // Still docked bottom-right, not at the origin.
    expect(p.coach.x).toBeGreaterThan(0);
    });

  it("falls back to defaults when the store is corrupt", () => {
    vi.stubGlobal("localStorage", memStorage({ "calctutor.panels.v3": "{oops" }));
    const p = loadPanels(VP);
    expect(p.coach.w).toBeGreaterThanOrEqual(PANEL_MIN_W);
    });

  it("fills in panels missing from a partial store", () => {
    const store = memStorage({
      "calctutor.panels.v3": JSON.stringify({
        coach: { x: 0, y: 0, w: 300, h: 300 },
      }),
    });
    vi.stubGlobal("localStorage", store);
    const p = loadPanels(VP);
    expect(p.coach.w).toBe(300);
    expect(p.calc.w).toBeGreaterThanOrEqual(PANEL_MIN_W);
    expect(p.board.h).toBeGreaterThanOrEqual(PANEL_MIN_H);
    });
});
