import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { cn } from "@/lib/utils";

const CODE_PREVIEW_LINES = 3;

function previewCode(code: string, maxLines: number): string {
  return code.split("\n").slice(0, maxLines).join("\n");
}

type CollapsibleMemberRowProps = {
  memberId: string;
  label: string;
  code: string;
  expanded: boolean;
  onToggle: (memberId: string) => void;
};

export function CollapsibleMemberRow({
  memberId,
  label,
  code,
  expanded,
  onToggle,
}: CollapsibleMemberRowProps) {
  const preview = previewCode(code, expanded ? 200 : CODE_PREVIEW_LINES);

  return (
    <div className="hoverable nodrag rounded-md border border-transparent bg-muted px-3 py-1.5">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-2 text-left"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(memberId);
        }}
      >
        <ExpandChevron expanded={expanded} className="text-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {label}
        </span>
      </button>
      {code.trim() ? (
        <pre
          className={cn(
            "mt-1.5 overflow-hidden whitespace-pre-wrap pl-5 text-left font-mono text-xs text-muted-foreground",
            !expanded && "line-clamp-3",
          )}
        >
          {preview}
        </pre>
      ) : null}
    </div>
  );
}
