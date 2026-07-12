import type { UsageSiteRecord } from "@/lib/usageSiteIndex";

/** Max usage sites returned per definition hover (nearest-first). */
export const USAGE_FAN_OUT_CAP = 24;

export type UsageSiteAnchor = {
  flowNodeId: string;
  memberId?: string;
  lineNumber?: number;
};

const OTHER_FLOW_BASE = 10_000;
const OTHER_MEMBER_BASE = 1_000;

/** Lower score = closer / higher priority. */
export function usageSiteRankScore(
  rec: UsageSiteRecord,
  anchor: UsageSiteAnchor,
): number {
  if (rec.flowNodeId !== anchor.flowNodeId) {
    return OTHER_FLOW_BASE + rec.lineNumber;
  }
  if (anchor.memberId != null && rec.memberId !== anchor.memberId) {
    return OTHER_MEMBER_BASE + rec.lineNumber;
  }
  if (anchor.lineNumber != null) {
    return Math.abs(rec.lineNumber - anchor.lineNumber);
  }
  return rec.lineNumber;
}

export function rankUsageSites(
  records: readonly UsageSiteRecord[],
  anchor: UsageSiteAnchor,
): UsageSiteRecord[] {
  return [...records].sort(
    (a, b) => usageSiteRankScore(a, anchor) - usageSiteRankScore(b, anchor),
  );
}

export function capUsageSites(
  records: readonly UsageSiteRecord[],
  cap = USAGE_FAN_OUT_CAP,
): UsageSiteRecord[] {
  if (records.length <= cap) return [...records];
  return records.slice(0, cap);
}

export function rankAndCapUsageSites(
  records: readonly UsageSiteRecord[],
  anchor: UsageSiteAnchor,
  cap = USAGE_FAN_OUT_CAP,
): UsageSiteRecord[] {
  return capUsageSites(rankUsageSites(records, anchor), cap);
}
