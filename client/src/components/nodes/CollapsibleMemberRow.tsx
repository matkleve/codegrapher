import { Handle, Position } from "@xyflow/react";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { CodeLine } from "@/components/code/CodeLine";
import { previewMemberHandle } from "@/lib/ctrlPreviewHandles";
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

  return (
    <div className="group/member nodrag relative rounded-md border border-transparent bg-muted p-2 transition-[background-color,border-color] duration-150 hover:border-border hover:bg-secondary">
      <Handle
        type="target"
        position={Position.Left}
        id={previewMemberHandle(memberId)}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
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
        <ExpandChevron
          expanded={expanded}
          className="text-muted-foreground transition-colors group-hover/member:text-secondary-foreground"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover/member:text-secondary-foreground">
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
