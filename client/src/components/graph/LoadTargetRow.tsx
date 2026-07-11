import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { INTERACTIVE_ROW_LEFT } from "@/lib/controlTokens";
import { fileBaseName, type LoadTargetItem } from "@/lib/loadTargets";
import { TOKEN_EDGE_STROKE, type SemanticTokenKind } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

type LoadTargetRowProps = {
  item: LoadTargetItem;
  token: string;
  kind: SemanticTokenKind;
  dotSide: "left" | "right";
  onSelect: () => void;
};

function ConnectionDot({ kind }: { kind: SemanticTokenKind }) {
  return (
    <span
      className="size-2 shrink-0 rounded-full"
      style={{ background: TOKEN_EDGE_STROKE[kind] }}
      aria-hidden
    />
  );
}

export function LoadTargetRow({
  item,
  token,
  kind,
  dotSide,
  onSelect,
}: LoadTargetRowProps) {
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
      <ConnectionDot kind={kind} />
      <VscodeFileIcon icon="file-type-typescript-official" size={14} />
      <span className={cn("min-w-0 flex-1", dotSide === "right" ? "text-right" : "text-left")}>
        <span className="block truncate font-medium text-foreground">
          {item.label !== token ? item.label : fileBaseName(item.filePath)}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {item.subtitle ? `${item.subtitle} · ` : ""}
          line {item.line}
          {item.label !== token && item.label !== fileBaseName(item.filePath)
            ? ` · ${fileBaseName(item.filePath)}`
            : ""}
        </span>
      </span>
    </button>
  );
}
