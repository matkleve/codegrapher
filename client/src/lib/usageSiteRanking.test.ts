import { describe, expect, it } from "vitest";
import {
  USAGE_FAN_OUT_CAP,
  rankAndCapUsageSites,
  rankUsageSites,
  usageSiteRankScore,
} from "@/lib/usageSiteRanking";
import type { UsageSiteRecord } from "@/lib/usageSiteIndex";

function rec(
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
): UsageSiteRecord {
  return {
    flowNodeId,
    memberId,
    lineNumber,
    tokenIndex: 0,
    line: `use ${lineNumber}`,
  };
}

describe("usageSiteRankScore", () => {
  it("prefers same member and nearest line", () => {
    const anchor = { flowNodeId: "flow:a", memberId: "m1", lineNumber: 50 };
    expect(usageSiteRankScore(rec("flow:a", "m1", 52), anchor)).toBe(2);
    expect(usageSiteRankScore(rec("flow:a", "m1", 80), anchor)).toBe(30);
    expect(usageSiteRankScore(rec("flow:a", "m2", 51), anchor)).toBeGreaterThan(
      1000,
    );
    expect(usageSiteRankScore(rec("flow:b", "m1", 51), anchor)).toBeGreaterThan(
      10_000,
    );
  });
});

describe("rankAndCapUsageSites", () => {
  it("sorts nearest-first and caps fan-out", () => {
    const anchor = { flowNodeId: "flow:a", memberId: "m1", lineNumber: 10 };
    const records = Array.from({ length: USAGE_FAN_OUT_CAP + 5 }, (_, i) =>
      rec("flow:a", "m1", 10 + i),
    );
    const ranked = rankUsageSites(records, anchor);
    expect(ranked[0]?.lineNumber).toBe(10);
    expect(ranked[1]?.lineNumber).toBe(11);

    const capped = rankAndCapUsageSites(records, anchor);
    expect(capped).toHaveLength(USAGE_FAN_OUT_CAP);
    expect(capped.at(-1)?.lineNumber).toBe(10 + USAGE_FAN_OUT_CAP - 1);
  });
});
