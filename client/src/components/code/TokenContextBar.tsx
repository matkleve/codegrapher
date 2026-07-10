import { useEffect, useMemo, useState } from "react";
import { Code2, Crosshair, X } from "lucide-react";
import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { Button } from "@/components/ui/button";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { openFileInEditor } from "@/api";
import { INTERACTIVE_ROW_LEFT } from "@/lib/controlTokens";
import type { TokenReference } from "@/lib/semanticLookup";
import { TOKEN_EDGE_STROKE, TOKEN_PILL } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  class: "Class",
  function: "Function",
  type: "Type",
  variable: "Variable",
};

function definitionRef(refs: TokenReference[]): TokenReference | null {
  const inGraph = refs.filter((r) => r.inGraph && r.flowNodeId);
  return inGraph[0] ?? refs[0] ?? null;
}

/**
 * Docked trace action bar — only visible when a connection is pinned (Ctrl+click).
 * Sits at the bottom of the graph pane so it never covers code.
 */
export function TokenContextBar() {
  const {
    tokenInfo,
    clearTokenInfo,
    findReferences,
    focusFlowNode,
    onLoadFile,
  } = useGraphInteraction();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [tokenInfo?.token]);

  useEffect(() => {
    if (!tokenInfo?.pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearTokenInfo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearTokenInfo, tokenInfo?.pinned]);

  const references = useMemo(
    () => (tokenInfo ? findReferences(tokenInfo.token) : []),
    [findReferences, tokenInfo],
  );

  const graphRefs = useMemo(
    () => references.filter((r) => r.inGraph && r.flowNodeId),
    [references],
  );

  const externalRefs = useMemo(
    () => references.filter((r) => !r.inGraph),
    [references],
  );

  if (!tokenInfo?.pinned) return null;

  const { token, kind, connectionCount, definedIn, role } = tokenInfo;
  const swatch = TOKEN_EDGE_STROKE[kind];
  const def = definitionRef(references);
  const canJumpDef = Boolean(def?.flowNodeId);

  return (
    <div
      data-token-context-bar
      className="pointer-events-auto absolute inset-x-3 bottom-3 z-50 overflow-hidden rounded-xl border border-border bg-card/95 shadow-lg backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: swatch }}
            aria-hidden
          />
          <span className="truncate font-mono text-sm font-semibold text-foreground">
            {token}
          </span>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {KIND_LABEL[kind] ?? kind}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            · {role === "definition" ? "definition" : "usage"}
          </span>
          <span className="hidden truncate text-xs text-muted-foreground md:inline">
            · {definedIn}
          </span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {canJumpDef ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px]"
              onClick={() => {
                if (def?.flowNodeId) {
                  clearTokenInfo();
                  focusFlowNode(def.flowNodeId);
                }
              }}
            >
              <Crosshair className="size-3.5" aria-hidden />
              Jump to definition
            </Button>
          ) : null}

          {connectionCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() => setExpanded((v) => !v)}
            >
              {connectionCount} connection{connectionCount === 1 ? "" : "s"}
              <ExpandChevron expanded={expanded} className="text-muted-foreground" />
            </Button>
          ) : null}

          {def ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px]"
              onClick={() => {
                void openFileInEditor(def.filePath, def.line);
              }}
            >
              <Code2 className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Open in editor</span>
            </Button>
          ) : null}

          {externalRefs.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                void onLoadFile(externalRefs[0]!.filePath);
              }}
            >
              + Load into graph
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Unpin"
            title="Unpin"
            onClick={clearTokenInfo}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {expanded && references.length > 0 ? (
        <div className="max-h-40 overflow-y-auto border-t border-border px-2 py-1.5">
          <ul className="flex flex-col gap-0.5">
            {graphRefs.map((ref, idx) => (
              <li key={`g-${ref.filePath}-${ref.line}-${idx}`}>
                <button
                  type="button"
                  className={cn(INTERACTIVE_ROW_LEFT, "w-full py-1.5 text-xs", TOKEN_PILL[ref.kind])}
                  onClick={() => {
                    clearTokenInfo();
                    focusFlowNode(ref.flowNodeId!);
                  }}
                >
                  <VscodeFileIcon icon="file-type-typescript-official" size={14} />
                  <span className="min-w-0 truncate text-left">
                    {ref.memberLabel
                      ? `${ref.classLabel} → ${ref.memberLabel}`
                      : ref.classLabel}
                    <span className="text-muted-foreground"> · line {ref.line}</span>
                  </span>
                </button>
              </li>
            ))}
            {externalRefs.map((ref, idx) => (
              <li key={`x-${ref.filePath}-${ref.line}-${idx}`}>
                <button
                  type="button"
                  className={cn(INTERACTIVE_ROW_LEFT, "w-full py-1.5 text-xs", TOKEN_PILL[ref.kind])}
                  onClick={() => {
                    void onLoadFile(ref.filePath);
                  }}
                >
                  <VscodeFileIcon icon="file-type-typescript-official" size={14} />
                  <span className="min-w-0 truncate text-left">
                    {ref.classLabel}
                    <span className="text-muted-foreground"> · line {ref.line}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
