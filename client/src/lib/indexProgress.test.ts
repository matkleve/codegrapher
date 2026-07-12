import { describe, expect, it } from "vitest";
import {
  indexProgressFill,
  indexProgressLabel,
  indexProgressSubtitle,
} from "./indexProgress";

describe("indexProgress", () => {
  it("uses file counts for the label, not percentages", () => {
    expect(indexProgressLabel({ phase: "files", done: 47, total: 312 })).toBe(
      "47 / 312 files",
    );
  });

  it("maps file progress to an honest fill ratio", () => {
    expect(indexProgressFill({ phase: "files", done: 1, total: 4 })).toBe(0.25);
    expect(indexProgressFill({ phase: "files", done: 4, total: 4 })).toBe(1);
  });

  it("keeps the bar full while references build", () => {
    expect(indexProgressFill({ phase: "references", filesTotal: 4 })).toBe(1);
    expect(indexProgressLabel({ phase: "references", filesTotal: 4 })).toBe(
      "4 / 4 files",
    );
  });

  it("shows no fill before file work and during compiler prep", () => {
    expect(indexProgressFill({ phase: "loading" })).toBeNull();
    expect(indexProgressFill({ phase: "preparing", total: 12 })).toBe(0);
    expect(indexProgressFill({ phase: "idle" })).toBeNull();
  });

  it("starts at zero when file indexing begins", () => {
    expect(indexProgressFill({ phase: "files", done: 0, total: 12 })).toBe(0);
  });

  it("describes compiler prep in the subtitle", () => {
    expect(indexProgressSubtitle({ phase: "preparing", total: 12 })).toBe(
      "Preparing TypeScript compiler…",
    );
    expect(indexProgressLabel({ phase: "preparing", total: 12 })).toBe("0 / 12 files");
  });

  it("shows the file currently being indexed in the subtitle", () => {
    expect(
      indexProgressSubtitle({
        phase: "files",
        done: 2,
        total: 10,
        currentFile: "OrderService.ts",
      }),
    ).toBe("Indexing OrderService.ts");
  });

  it("describes reference building in the subtitle", () => {
    expect(indexProgressSubtitle({ phase: "references", filesTotal: 10 })).toBe(
      "Cross-file symbol references…",
    );
  });
});
