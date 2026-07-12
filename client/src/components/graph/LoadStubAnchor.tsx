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
          "pointer-events-auto absolute z-[46] flex h-[var(--control-height-compact)] min-w-0 max-w-56 items-stretch p-0",
        ),
        faded && "opacity-70",
      )}
      style={{ visibility: "hidden" }}
      onMouseEnter={cancelHoverLeaveGrace}
    >
      <div className="relative flex h-full min-w-0 flex-1 items-stretch">
        <button
          type="button"
          className="hoverable flex min-w-0 flex-1 items-center gap-1 px-2 text-left"
          onClick={onLoad}
        >
          <SemanticConnectionDot kind={edge.kind} />
          <VscodeFileIcon icon="file-type-typescript-official" size={10} />
          <span className="min-w-0 truncate text-xs font-medium text-foreground">
            {load.token}
          </span>
        </button>
        <button
          type="button"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "!h-full min-h-0 shrink-0 self-stretch rounded-none rounded-r-[calc(var(--radius-xl)-1px)] border-l border-border px-1.5 py-0 text-2xs font-medium shadow-none",
            "bg-transparent hover:bg-muted active:translate-y-0",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onLoad();
          }}
        >
          Load
        </button>
        <FlowAnchor
          side="right"
          colorClass={TOKEN_ANCHOR[edge.kind]}
          visible
          highlighted
          size="chip"
        />
      </div>
    </div>
  );
}
