import { useCallback, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { ConnectionTargetLeading } from "@/components/ui/ConnectionTargetLeading";
import { buttonVariants } from "@/components/ui/button";
import { INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useLoadTargetAction } from "@/hooks/useLoadTargetAction";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { loadStubPanePosition } from "@/lib/loadStubPosition";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import { TOKEN_ANCHOR } from "@/lib/tokenColors";
import { tracePathOpacity } from "@/lib/traceDepth";
import { isTraceEmphasisActive, isTraceSessionActive } from "@/lib/wireHoverBoost";
import { subscribeWireTicks } from "@/lib/wireEngine";
import { cn } from "@/lib/utils";

type LoadStubAnchorProps = {
  edge: PreviewEdgeSpec;
};

export function LoadStubAnchor({ edge }: LoadStubAnchorProps) {
  const load = edge.load!;
  const hostRef = useRef<HTMLSpanElement>(null);
  useTraceHostRegistration(hostRef);
  const { getNode } = useReactFlow();
  const loadTarget = useLoadTargetAction();
  const { cancelHoverLeaveGrace } = useGraphInteraction();
  const fadedOpacity =
    edge.hop != null && edge.hop >= 2 && isTraceSessionActive()
      ? tracePathOpacity(
          edge.hop,
          undefined,
          isTraceEmphasisActive() ? "emphasis" : "baseline",
        )
      : undefined;

  const reposition = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const { to } = refinePreviewEdge(edge, getNode);
    if (to.type !== "element" || !to.el.isConnected) {
      host.style.visibility = "hidden";
      return;
    }
    const pos = loadStubPanePosition(to.el, host.offsetWidth, host.offsetHeight);
    if (!pos) {
      host.style.visibility = "hidden";
      return;
    }
    host.style.position = "fixed";
    host.style.left = `${pos.left}px`;
    host.style.top = `${pos.top}px`;
    host.style.visibility = "visible";
  }, [edge, getNode]);

  useLayoutEffect(() => {
    reposition();
    return subscribeWireTicks(reposition);
  }, [reposition]);

  const onLoad = () => loadTarget(load.filePath);

  const onKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onLoad();
    }
  };

  return (
    <span
      ref={hostRef}
      role="button"
      tabIndex={0}
      data-load-edge-id={edge.id}
      data-load-socket="right"
      data-trace-key={`load-stub::${edge.id}`}
      data-symbol-name={load.token}
      data-token-kind={edge.kind}
      className={cn(
        "load-stub-chip token-chip connector-chip connector-chip--load connector-chip--load-stub",
        INTERACTIVE_SURFACE,
        "pointer-events-auto fixed z-[46] inline-flex min-w-0 max-w-64 cursor-pointer items-center",
      )}
      style={{
        visibility: "hidden",
        ...(fadedOpacity != null ? { opacity: fadedOpacity } : {}),
      }}
      onMouseEnter={cancelHoverLeaveGrace}
      onClick={onLoad}
      onKeyDown={onKeyDown}
    >
      <ConnectionTargetLeading kind={edge.kind} size={14} />
      <span className="load-stub-chip-label control-row-text-primary min-w-0 flex-1 truncate">
        {load.token}
      </span>
      <span
        className={cn(
          buttonVariants({ variant: "outline", size: "xs" }),
          "load-stub-chip-action pointer-events-none shrink-0 font-medium",
        )}
      >
        Load
      </span>
      <FlowAnchor
        side="right"
        colorClass={TOKEN_ANCHOR[edge.kind]}
        visible
        highlighted
        size="chip"
      />
    </span>
  );
}
