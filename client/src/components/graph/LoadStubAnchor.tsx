import { useCallback, useLayoutEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { SemanticConnectionDot } from "@/components/ui/InteractiveListRow";
import { buttonVariants } from "@/components/ui/button";
import { floatingPanelClass } from "@/components/ui/floatingPanel";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useLoadTargetAction } from "@/hooks/useLoadTargetAction";
import { loadStubPanePosition } from "@/lib/loadStubPosition";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import { TOKEN_ANCHOR } from "@/lib/tokenColors";
import { subscribeWireTicks } from "@/lib/wireEngine";
import { cn } from "@/lib/utils";

type LoadStubAnchorProps = {
  edge: PreviewEdgeSpec;
};

export function LoadStubAnchor({ edge }: LoadStubAnchorProps) {
  const load = edge.load!;
  const hostRef = useRef<HTMLDivElement>(null);
  useTraceHostRegistration(hostRef);
  const { getNode } = useReactFlow();
  const loadTarget = useLoadTargetAction();
  const { cancelHoverLeaveGrace } = useGraphInteraction();
  const faded = edge.hop != null && edge.hop >= 2;

  const reposition = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const { to } = refinePreviewEdge(edge, getNode);
    if (to.type !== "element" || !to.el.isConnected) {
      host.style.visibility = "hidden";
      return;
    }
    const rect = host.getBoundingClientRect();
    const pos = loadStubPanePosition(to.el, rect.width, rect.height);
    if (!pos) {
      host.style.visibility = "hidden";
      return;
    }
    host.style.visibility = "visible";
    host.style.left = `${pos.left}px`;
    host.style.top = `${pos.top}px`;
  }, [edge, getNode]);

  useLayoutEffect(() => {
    reposition();
    return subscribeWireTicks(reposition);
  }, [reposition]);

  const onLoad = () => loadTarget(load.filePath);

  return (
    <div
      ref={hostRef}
      data-load-edge-id={edge.id}
      data-load-socket="right"
      data-trace-key={`load-stub::${edge.id}`}
      data-symbol-name={load.token}
      data-token-kind={edge.kind}
      className={cn(
        floatingPanelClass(
          "pointer-events-auto absolute z-[46] h-[var(--control-height-compact)] min-w-0 max-w-56 p-0",
        ),
        faded && "opacity-70",
      )}
      style={{ visibility: "hidden" }}
      onMouseEnter={cancelHoverLeaveGrace}
    >
      <button
        type="button"
        className="hoverable relative flex h-full w-full min-w-0 cursor-pointer items-center gap-1 px-2 pr-3 text-left"
        onClick={onLoad}
      >
        <SemanticConnectionDot kind={edge.kind} />
        <VscodeFileIcon icon="file-type-typescript-official" size={10} />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {load.token}
        </span>
        <span
          className={cn(
            buttonVariants({ variant: "outline", size: "xs" }),
            "pointer-events-none shrink-0 !h-auto min-h-0 border-border/80 py-px px-1 text-2xs leading-none shadow-none",
            "hover:!border-border hover:!bg-background hover:!text-foreground",
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
      </button>
    </div>
  );
}
