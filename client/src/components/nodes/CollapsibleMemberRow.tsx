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
    <div className="hoverable nodrag m-1 rounded-md border border-transparent bg-muted p-2">
      <button
        type="button"
        className="w-full cursor-pointer text-left text-sm font-medium text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(memberId);
        }}
      >
        {label}
      </button>
      {code.trim() ? (
        <pre
          className={cn(
            "mt-1.5 overflow-hidden whitespace-pre-wrap font-mono text-xs text-muted-foreground",
            !expanded && "line-clamp-3",
          )}
        >
          {preview}
        </pre>
      ) : null}
    </div>
  );
}
