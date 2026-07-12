import { describe, expect, it } from "vitest";
import {
  gutterMenuActions,
  gutterPreviewAction,
  gutterPrimaryAction,
} from "@/lib/simGutterActions";

const member = "m1";

describe("gutterPrimaryAction", () => {
  it("starts when no anchor", () => {
    expect(gutterPrimaryAction(member, 10, { start: null, end: null })).toBe("start");
  });

  it("sets end after start on same member", () => {
    expect(
      gutterPrimaryAction(member, 20, {
        start: { memberId: member, startLine: 10 },
        end: null,
      }),
    ).toBe("end");
  });

  it("toggles start on start line", () => {
    expect(
      gutterPrimaryAction(member, 10, {
        start: { memberId: member, startLine: 10 },
        end: null,
      }),
    ).toBe("start");
  });

  it("sets pause when start and end exist", () => {
    expect(
      gutterPrimaryAction(member, 15, {
        start: { memberId: member, startLine: 10 },
        end: { memberId: member, line: 20 },
      }),
    ).toBe("pause");
  });
});

describe("gutterPreviewAction", () => {
  it("hints pause strictly between explicit start and end", () => {
    const state = {
      start: { memberId: member, startLine: 10 },
      end: { memberId: member, line: 20 },
    };
    expect(gutterPreviewAction(member, 15, state)).toBe("pause");
    expect(gutterPreviewAction(member, 10, state)).toBe("start");
    expect(gutterPreviewAction(member, 20, state)).toBe("end");
    expect(gutterPreviewAction(member, 25, state)).toBe("pause");
  });
});

describe("gutterMenuActions", () => {
  it("puts primary action first", () => {
    expect(gutterMenuActions("end")).toEqual(["end", "start", "pause"]);
  });
});
