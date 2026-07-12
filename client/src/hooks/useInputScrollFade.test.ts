import { describe, expect, it } from "vitest";
import { inputScrollFadeMaskClass } from "@/hooks/useInputScrollFade";

describe("inputScrollFadeMaskClass", () => {
  it("picks a mask for each overflow edge", () => {
    expect(inputScrollFadeMaskClass({ left: false, right: true })).toBe(
      "explorer-path-input-mask-right",
    );
    expect(inputScrollFadeMaskClass({ left: true, right: false })).toBe(
      "explorer-path-input-mask-left",
    );
    expect(inputScrollFadeMaskClass({ left: true, right: true })).toBe(
      "explorer-path-input-mask-both",
    );
    expect(inputScrollFadeMaskClass({ left: false, right: false })).toBeUndefined();
  });
});
