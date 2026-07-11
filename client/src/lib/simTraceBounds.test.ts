import { describe, expect, it } from "vitest";
import {
  effectiveEndFileLine,
  isFileLineInTraceRange,
  methodLastFileLine,
} from "@/lib/simTraceBounds";

const ANCHOR = {
  memberId: "m1",
  methodStartLine: 20,
  code: "line1\nline2\nline3\n",
  startLine: 22,
};

describe("simTraceBounds", () => {
  it("methodLastFileLine is file-absolute", () => {
    expect(methodLastFileLine(20, ANCHOR.code)).toBe(23);
  });

  it("implicit end when no end marker", () => {
    expect(effectiveEndFileLine(ANCHOR, null)).toBe(23);
  });

  it("explicit end on same member", () => {
    expect(effectiveEndFileLine(ANCHOR, { memberId: "m1", line: 21 })).toBe(21);
  });

  it("ignores end marker on other member", () => {
    expect(effectiveEndFileLine(ANCHOR, { memberId: "m2", line: 99 })).toBe(23);
  });

  it("range shade uses file-absolute coordinates", () => {
    expect(isFileLineInTraceRange(ANCHOR, null, "m1", 22)).toBe(true);
    expect(isFileLineInTraceRange(ANCHOR, null, "m1", 23)).toBe(true);
    expect(isFileLineInTraceRange(ANCHOR, null, "m1", 24)).toBe(false);
    expect(isFileLineInTraceRange(ANCHOR, null, "m2", 22)).toBe(false);
  });
});
