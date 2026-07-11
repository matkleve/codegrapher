import { describe, expect, it } from "vitest";
import { shouldCommitHoverClear } from "@/lib/hoverIntent";

describe("shouldCommitHoverClear", () => {
  it("commits when the scheduled token is still the latest leave target", () => {
    expect(
      shouldCommitHoverClear("flow::m::3::match", { tokenKey: "flow::m::3::match" }),
    ).toBe(true);
  });

  it("skips when a newer token superseded the leave target", () => {
    expect(
      shouldCommitHoverClear("flow::m::3::field", { tokenKey: "flow::m::5::query" }),
    ).toBe(false);
  });

  it("skips when leave was cancelled (e.g. menu re-entry)", () => {
    expect(shouldCommitHoverClear("flow::m::3::match", null)).toBe(false);
  });
});
