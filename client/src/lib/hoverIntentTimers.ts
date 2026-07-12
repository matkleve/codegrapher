import {
  clearTraceAnchorHost,
  setTraceAnchorHost,
} from "@/lib/memberDefAnchor";
import {
  fireDelayMs,
  INFO_DELAY_MS,
  leaveGraceMs,
  shouldCommitHoverClear,
  type HoverIntentTimers,
} from "@/lib/hoverIntent";
import { clearPendingTraceHost, setPendingTraceHost } from "@/lib/pendingTraceChip";

export type PendingFire = { tokenKey: string; onFire: () => void } | null;
export type HoverClearTarget = { tokenKey: string; onClear: () => void } | null;

export type HoverFireContext = {
  timers: HoverIntentTimers;
  pendingFireRef: { current: PendingFire };
  hoverClearRef: { current: HoverClearTarget };
  hoveredTokenKeyRef: { current: string | null };
  isWarm: boolean;
  hoveredTokenKey: string | null;
  isCtrlActive: boolean;
  isTokenPinned: (tokenKey: string) => boolean;
  setHoveredTokenKey: (tokenKey: string | null) => void;
  setIsWarm: (warm: boolean) => void;
};

export function clearPendingHoverTimers(timers: HoverIntentTimers): void {
  clearTimeout(timers.clear ?? undefined);
  clearTimeout(timers.fire ?? undefined);
  clearTimeout(timers.info ?? undefined);
  timers.clear = null;
  timers.fire = null;
  timers.info = null;
}

export function scheduleHoverFireIntent(
  ctx: HoverFireContext,
  tokenKey: string,
  onFire: () => void,
  onClear: () => void,
  onInfo: (() => void) | undefined,
  options?: { instant?: boolean; traceHost?: HTMLElement | null },
): void {
  const { timers } = ctx;
  clearPendingHoverTimers(timers);

  ctx.pendingFireRef.current = { tokenKey, onFire };
  ctx.hoverClearRef.current = { tokenKey, onClear };

  const runFire = () => {
    clearPendingTraceHost();
    ctx.hoveredTokenKeyRef.current = tokenKey;
    setTraceAnchorHost(options?.traceHost ?? null);
    ctx.setHoveredTokenKey(tokenKey);
    ctx.setIsWarm(true);
    onFire();
    ctx.pendingFireRef.current = null;
    timers.fire = null;
  };

  const delay = fireDelayMs(
    ctx.isWarm || ctx.hoveredTokenKey != null,
    ctx.isCtrlActive,
    options?.instant,
  );
  if (delay === 0) {
    runFire();
  } else {
    setPendingTraceHost(options?.traceHost ?? null);
    timers.fire = setTimeout(runFire, delay);
  }

  if (onInfo) {
    timers.info = setTimeout(() => {
      if (
        ctx.hoveredTokenKeyRef.current === tokenKey &&
        !ctx.isTokenPinned(tokenKey)
      ) {
        onInfo();
      }
      timers.info = null;
    }, INFO_DELAY_MS);
  }
}

export type HoverClearContext = {
  timers: HoverIntentTimers;
  pendingFireRef: { current: PendingFire };
  hoverClearRef: { current: HoverClearTarget };
  hoveredTokenKeyRef: { current: string | null };
  onVisualLeave: () => void;
};

export function scheduleHoverClearIntent(
  ctx: HoverClearContext,
  tokenKey: string,
  onClear: () => void,
): void {
  const { timers } = ctx;
  clearTimeout(timers.fire ?? undefined);
  clearTimeout(timers.info ?? undefined);
  timers.fire = null;
  timers.info = null;
  clearPendingTraceHost();

  const traceHadFired = ctx.hoveredTokenKeyRef.current != null;
  if (traceHadFired) {
    ctx.hoveredTokenKeyRef.current = null;
    ctx.onVisualLeave();
  } else {
    ctx.pendingFireRef.current = null;
  }

  const grace = leaveGraceMs(traceHadFired);

  const commitClear = () => {
    if (!shouldCommitHoverClear(tokenKey, ctx.hoverClearRef.current)) {
      return;
    }
    clearTimeout(timers.fire ?? undefined);
    timers.fire = null;
    timers.info = null;
    ctx.hoveredTokenKeyRef.current = null;
    ctx.pendingFireRef.current = null;
    ctx.hoverClearRef.current = null;
    clearPendingTraceHost();
    onClear();
  };

  if (grace === 0) {
    commitClear();
    timers.clear = null;
    return;
  }

  timers.clear = setTimeout(() => {
    commitClear();
    timers.clear = null;
  }, grace);
}

export function firePendingCtrlHover(
  timers: HoverIntentTimers,
  pendingFireRef: { current: PendingFire },
  hoveredTokenKeyRef: { current: string | null },
): void {
  if (!timers.fire) return;
  const pending = pendingFireRef.current;
  if (!pending) return;

  clearTimeout(timers.fire);
  timers.fire = null;
  clearPendingTraceHost();
  hoveredTokenKeyRef.current = pending.tokenKey;
  pending.onFire();
  pendingFireRef.current = null;
}

export function resetHoverIntentState(
  timers: HoverIntentTimers,
  pendingFireRef: { current: PendingFire },
  hoveredTokenKeyRef: { current: string | null },
  hoverClearRef: { current: HoverClearTarget },
): void {
  clearPendingHoverTimers(timers);
  pendingFireRef.current = null;
  hoveredTokenKeyRef.current = null;
  hoverClearRef.current = null;
  clearPendingTraceHost();
  clearTraceAnchorHost();
}
