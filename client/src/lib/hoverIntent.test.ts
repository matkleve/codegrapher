import { describe, expect, it } from "vitest";
import { fireDelayMs, shouldCommitHoverClear } from "@/lib/hoverIntent";

describe("fireDelayMs", () => {
  it("fires instantly when Ctrl is held", () => {
    expect(fireDelayMs(false, true)).toBe(0);
  });

  it("fires instantly on keyboard focus", () => {
    expect(fireDelayMs(false, false, true)).toBe(0);
  });

  it("uses cold/warm delays for plain pointer hover", () => {
    expect(fireDelayMs(false, false)).toBe(150);
    expect(fireDelayMs(true, false)).toBe(80);
  });
});

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
