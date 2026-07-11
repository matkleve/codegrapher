import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { INTERACTIVE_ROW_LEFT } from "@/lib/controlTokens";
import type { ConnectionMenuRow as ConnectionMenuRowData } from "@/lib/connectionMenu";
import { connectionMenuDotSide } from "@/lib/connectionMenu";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

const ACTION_LABEL: Record<ConnectionMenuRowData["action"], string> = {
  jump: "Jump",
  load: "Load",
  openEditor: "Open",
};

type ConnectionMenuRowProps = {
  row: ConnectionMenuRowData;
  role: "usage" | "definition";
  onSelect: () => void;
};

function ConnectionDot({ kind }: { kind: ConnectionMenuRowData["kind"] }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ background: TOKEN_EDGE_STROKE[kind] }}
      aria-hidden
    />
  );
}

export function ConnectionMenuRow({ row, role, onSelect }: ConnectionMenuRowProps) {
  const dotSide = connectionMenuDotSide(role);

  return (
    <button
      type="button"
      className={cn(
        INTERACTIVE_ROW_LEFT,
        "w-full gap-2 rounded-md py-2 text-xs",
        dotSide === "right" && "flex-row-reverse text-right",
      )}
      onClick={onSelect}
    >
      <ConnectionDot kind={row.kind} />
      <VscodeFileIcon icon="file-type-typescript-official" size={14} />
      <span className={cn("min-w-0 flex-1", dotSide === "right" ? "text-right" : "text-left")}>
        <span className="block truncate font-medium text-foreground">{row.primaryLabel}</span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {row.secondaryLabel}
        </span>
      </span>
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
        {ACTION_LABEL[row.action]}
      </span>
    </button>
  );
}
