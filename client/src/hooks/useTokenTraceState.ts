import { useMemo } from "react";
import { useClearPinnedOnClickAway } from "@/hooks/useClearPinnedOnClickAway";
import { useTraceSession } from "@/hooks/useTraceSession";
import { mergePinnedEdges } from "@/lib/pinnedTraces";
import { traceAnchorState } from "@/lib/memberDefAnchor";

/**
 * Composes trace session state for GraphInteractionContext.
 * Hover, pin, and pane mood share one reducer (useTraceSession).
 */
export function useTokenTraceState(isCtrlActive: boolean) {
  const trace = useTraceSession(isCtrlActive);

  useClearPinnedOnClickAway(trace.pinnedTraces.length > 0, trace.clearTokenInfo);

  const pinnedPreviewEdges = useMemo(
    () => mergePinnedEdges(trace.pinnedTraces),
    [trace.pinnedTraces],
  );

  return useMemo(
    () => ({
      ...trace,
      pinnedPreviewEdges,
      pinnedTokenKeySet: trace.pinnedTokenKeySet,
      traceAnchorState,
    }),
    [pinnedPreviewEdges, trace],
  );
}
