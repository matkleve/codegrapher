import { describe, expect, it } from "vitest";
import {
  GRAPH_GRID_CELL_PX,
  GRAPH_GRID_FINE_FADE_END_ZOOM,
  GRAPH_GRID_FINE_FADE_START_ZOOM,
  GRAPH_GRID_MIN_DOT_SCREEN_PX,
  getFineGridOpacity,
  getGridLodFactor,
} from "./graphGrid";

describe("getGridLodFactor", () => {
  it("keeps full density at normal zoom", () => {
    expect(getGridLodFactor(1)).toBe(1);
    expect(getGridLodFactor(0.6)).toBe(1);
  });

  it("doubles spacing when zoomed out moderately", () => {
    expect(getGridLodFactor(0.4)).toBe(2);
  });

  it("quadruples spacing at minimum zoom", () => {
    expect(getGridLodFactor(0.2)).toBe(4);
  });

  it("keeps on-screen dot spacing above the minimum", () => {
    for (const zoom of [0.2, 0.35, 0.5, 0.75, 1, 2, 4]) {
      const lod = getGridLodFactor(zoom);
      const screenPx = GRAPH_GRID_CELL_PX * lod * zoom;
      expect(screenPx).toBeGreaterThanOrEqual(GRAPH_GRID_MIN_DOT_SCREEN_PX);
    }
  });
});

describe("getFineGridOpacity", () => {
  it("is hidden at full grid density", () => {
    expect(getFineGridOpacity(1, 1)).toBe(0);
  });

  it("ramps in between fade thresholds when subsampled", () => {
    const mid =
      (GRAPH_GRID_FINE_FADE_START_ZOOM + GRAPH_GRID_FINE_FADE_END_ZOOM) / 2;
    const opacity = getFineGridOpacity(mid, 2);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(1);
  });

  it("is fully visible when zoomed in with subsampled primary grid", () => {
    expect(getFineGridOpacity(GRAPH_GRID_FINE_FADE_END_ZOOM, 2)).toBe(1);
  });
});
