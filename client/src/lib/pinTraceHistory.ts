import type { PinnedTrace } from "@/lib/pinnedTraces";
import type { TokenInfoState } from "@/lib/tokenContextInfo";

/** Caps memory use; deep back-tracking beyond this isn't a realistic use case. */
export const PIN_HISTORY_LIMIT = 20;

export type PinSnapshot = {
  traces: PinnedTrace[];
  activePinKey: string | null;
  tokenInfo: TokenInfoState;
};

export function pushPinSnapshot(
  history: PinSnapshot[],
  snapshot: PinSnapshot,
): PinSnapshot[] {
  const next = [...history, snapshot];
  if (next.length > PIN_HISTORY_LIMIT) next.shift();
  return next;
}

export function popPinSnapshot(history: PinSnapshot[]): {
  history: PinSnapshot[];
  snapshot: PinSnapshot | undefined;
} {
  const next = [...history];
  const snapshot = next.pop();
  return { history: next, snapshot };
}
