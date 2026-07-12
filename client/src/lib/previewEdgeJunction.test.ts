import { describe, expect, it } from "vitest";
import { fanJunctionBearing, junctionChevronPath } from "@/lib/previewEdgeJunction";

describe("fanJunctionBearing", () => {
  it("points toward the average spur direction", () => {
    const bearing = fanJunctionBearing(
      240,
      80,
      120,
      130,
      [
        { x2: 420, y2: 130, toEl: null },
        { x2: 520, y2: 130, toEl: null },
      ],
      130,
    );
    expect(bearing).toBeGreaterThan(-0.2);
    expect(bearing).toBeLessThan(0.2);
  });

  it("biases downward when the spine continues below the fork", () => {
    const bearing = fanJunctionBearing(
      240,
      80,
      120,
      130,
      [{ x2: 420, y2: 130, toEl: null }],
      190,
    );
    expect(bearing).toBeGreaterThan(0.2);
    expect(bearing).toBeLessThan(Math.PI / 2);
  });
});

describe("junctionChevronPath", () => {
  it("builds a closed triangle path", () => {
    const path = junctionChevronPath(10, 20, 0);
    expect(path).toMatch(/^M .+ L .+ L .+ Z$/);
  });
});
