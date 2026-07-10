import { useEffect, useMemo, useState } from "react";
import { Code2, Crosshair, X } from "lucide-react";
import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { Button } from "@/components/ui/button";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { openFileInEditor } from "@/api";
import { INTERACTIVE_ROW_LEFT } from "@/lib/controlTokens";
import type { TokenReference } from "@/lib/semanticLookup";
import { TOKEN_EDGE_STROKE } from "@/lib/tokenColors";
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
 * Docked trace action bar — visible when a connection is pinned (click a token).
 * Sits at the bottom of the graph pane so it never covers code.
 */
export function TokenContextBar() {
  const {
    tokenInfo,
    clearTokenInfo,
    findReferences,
    focusFlowNode,
    onLoadFile,
    pinnedTraces,
    activePinKey,
    setActivePinKey,
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

  if (!tokenInfo) return null;

  const isPinned = tokenInfo.pinned;
  const { token, kind, connectionCount, definedIn, role } = tokenInfo;
  const swatch = TOKEN_EDGE_STROKE[kind];
  const def = definitionRef(references);
  const canJumpDef = Boolean(def?.flowNodeId);

  return (
    <div
      data-token-context-bar
      className={cn(
        "pointer-events-auto absolute inset-x-3 bottom-3 z-50 overflow-hidden rounded-xl border bg-card/95 shadow-lg backdrop-blur-sm",
        isPinned ? "border-border" : "border-brand-border/60 opacity-95",
      )}
    >
      {isPinned && pinnedTraces.length > 1 ? (
        <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
          {pinnedTraces.map((trace) => {
            const label = trace.info?.token ?? trace.tokenKey.split("::").pop() ?? "?";
            const active = trace.tokenKey === activePinKey;
            return (
              <button
                key={trace.tokenKey}
                type="button"
                className={cn(
                  "rounded-md px-2 py-0.5 font-mono text-[10px] font-medium transition-colors",
                  active
                    ? "border border-brand-border bg-brand-surface text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                onClick={() => setActivePinKey(trace.tokenKey)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: swatch }}
            aria-hidden
          />
          <span className="min-w-0 shrink truncate font-mono text-sm font-semibold text-foreground">
            {token}
          </span>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {KIND_LABEL[kind] ?? kind}
          </span>
          <span className="hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">
            · {role === "definition" ? "definition" : "usage"}
            <span className="hidden md:inline">
              {definedIn ? ` · ${definedIn}` : ""}
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isPinned && canJumpDef ? (
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

          {isPinned && connectionCount > 0 ? (
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

          {isPinned && def ? (
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

          {isPinned && externalRefs.length > 0 ? (
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
            aria-label={isPinned ? "Unpin" : "Dismiss"}
            title={isPinned ? "Unpin" : "Dismiss"}
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
                  className={cn(INTERACTIVE_ROW_LEFT, "w-full gap-2 py-1.5 text-xs text-foreground")}
                  onClick={() => {
                    clearTokenInfo();
                    focusFlowNode(ref.flowNodeId!);
                  }}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: TOKEN_EDGE_STROKE[ref.kind] }}
                    aria-hidden
                  />
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
                  className={cn(INTERACTIVE_ROW_LEFT, "w-full gap-2 py-1.5 text-xs text-foreground")}
                  onClick={() => {
                    void onLoadFile(ref.filePath);
                  }}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: TOKEN_EDGE_STROKE[ref.kind] }}
                    aria-hidden
                  />
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
