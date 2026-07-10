import { Handle, Position } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { CodeLine } from "@/components/code/CodeLine";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { previewMemberHandle } from "@/lib/ctrlPreviewHandles";
import { TOKEN_ANCHOR } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

type CollapsibleMemberRowProps = {
  memberId: string;
  label: string;
  code: string;
  expanded: boolean;
  onToggle: (memberId: string) => void;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
};

export function CollapsibleMemberRow({
  memberId,
  label,
  code,
  expanded,
  onToggle,
  flowNodeId,
  graphNodeId,
  filePath,
}: CollapsibleMemberRowProps) {
  const lines = code.split("\n");
  const memberHandleId = previewMemberHandle(memberId);
  const { activeTargetHandle, previewEdge } = useGraphInteraction();
  const targetActive = activeTargetHandle === memberHandleId;
  const anchorColor =
    targetActive && previewEdge
      ? TOKEN_ANCHOR[previewEdge.kind]
      : "bg-border";

  return (
    <div className="group/member hoverable nodrag relative overflow-visible rounded-md border border-transparent bg-muted p-2">
      <Handle
        type="target"
        position={Position.Left}
        id={memberHandleId}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
      <FlowAnchor
        side="left"
        targetId={memberHandleId}
        size="node"
        visible
        highlighted={targetActive}
        colorClass={anchorColor}
      />
      <FlowAnchor
        side="right"
        targetId={memberHandleId}
        size="node"
        visible
        highlighted={targetActive}
        colorClass={anchorColor}
      />
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 text-left"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(memberId);
        }}
      >
        <ExpandChevron expanded={expanded} className="text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-sm)] font-medium text-foreground">
          {label}
        </span>
      </button>
      {expanded && code.trim() ? (
        <div
          className={cn(
            "nodrag mt-1.5 ml-5 overflow-visible text-muted-foreground",
          )}
        >
          <div className="flex flex-col gap-0.5">
            {lines.map((line, i) => (
              <CodeLine
                key={`${memberId}-${i}`}
                line={line}
                lineNumber={i + 1}
                memberId={memberId}
                sourceFlowId={flowNodeId}
                sourceGraphNodeId={graphNodeId}
                filePath={filePath}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
