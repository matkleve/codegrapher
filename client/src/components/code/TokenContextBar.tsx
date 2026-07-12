import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Code2, Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectionTargetLeading } from "@/components/ui/ConnectionTargetLeading";
import {
  InteractiveListRow,
  SemanticConnectionDot,
} from "@/components/ui/InteractiveListRow";
import { PinTab } from "@/components/ui/PinTab";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { LoadTargetPicker } from "@/components/graph/LoadTargetPicker";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useLoadTargetAction } from "@/hooks/useLoadTargetAction";
import { openFileInEditor } from "@/api";
import { fileBaseName, fromExternalCards, fromTokenReferences } from "@/lib/loadTargets";
import { connectionCountLabel } from "@/lib/projectReferences";
import type { TokenReference } from "@/lib/semanticLookup";
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
    findCallSites,
    focusFlowNode,
    pinnedTraces,
    activePinKey,
    setActivePinKey,
    goBackPin,
    canGoBackPin,
  } = useGraphInteraction();
  const loadTarget = useLoadTargetAction();
  const loadButtonRef = useRef<HTMLButtonElement>(null);
  const [loadPickerOpen, setLoadPickerOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isDefinition = tokenInfo?.role === "definition";

  useEffect(() => {
    setExpanded(false);
    setLoadPickerOpen(false);
  }, [tokenInfo?.token]);

  useEffect(() => {
    if (!tokenInfo?.pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearTokenInfo();
      if (e.altKey && e.key === "ArrowLeft" && canGoBackPin) {
        e.preventDefault();
        goBackPin();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canGoBackPin, clearTokenInfo, goBackPin, tokenInfo?.pinned]);

  const references = useMemo(
    () => (tokenInfo && !isDefinition ? findReferences(tokenInfo.token) : []),
    [findReferences, isDefinition, tokenInfo],
  );

  const callSites = useMemo(
    () => (tokenInfo && isDefinition ? findCallSites(tokenInfo.token) : []),
    [findCallSites, isDefinition, tokenInfo],
  );

  const graphRefs = useMemo(
    () => references.filter((r) => r.inGraph && r.flowNodeId),
    [references],
  );

  const externalRefs = useMemo(
    () => references.filter((r) => !r.inGraph),
    [references],
  );

  const externalCallSiteFiles = useMemo(() => {
    const seen = new Set<string>();
    return callSites.filter((site) => {
      if (site.inGraph) return false;
      if (seen.has(site.filePath)) return false;
      seen.add(site.filePath);
      return true;
    });
  }, [callSites]);

  const externalLoadTargets = useMemo(
    () =>
      isDefinition
        ? fromExternalCards(
            externalCallSiteFiles.map((site) => ({
              symbolName: tokenInfo?.token ?? "",
              filePath: site.filePath,
              line: site.line,
              occurrenceCount: 1,
            })),
          )
        : fromTokenReferences(externalRefs),
    [externalCallSiteFiles, externalRefs, isDefinition, tokenInfo?.token],
  );

  if (!tokenInfo) return null;

  const isPinned = tokenInfo.pinned;
  const { token, kind, connectionCount, projectConnectionCount, definedIn, role } =
    tokenInfo;
  const def = definitionRef(references);
  const canJumpDef = !isDefinition && Boolean(def?.flowNodeId);
  const connectionLabel = connectionCountLabel({
    onCanvas: connectionCount,
    inProject: projectConnectionCount,
  });
  const listCount = isDefinition ? callSites.length : references.length;

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
              <PinTab
                key={trace.tokenKey}
                label={label}
                active={active}
                onClick={() => setActivePinKey(trace.tokenKey)}
              />
            );
          })}
        </div>
      ) : null}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <SemanticConnectionDot kind={kind} className="size-2.5" />
          <span className="min-w-0 shrink truncate font-mono text-sm font-semibold text-foreground">
            {token}
          </span>
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
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
          {isPinned && canGoBackPin ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Back to previous selection"
              title="Back to previous selection (Alt+←)"
              onClick={goBackPin}
            >
              <ArrowLeft className="size-3.5" aria-hidden />
            </Button>
          ) : null}

          {isPinned && canJumpDef ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-caption"
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

          {isPinned && connectionLabel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-caption"
              onClick={() => setExpanded((v) => !v)}
            >
              {connectionLabel}
              <ExpandChevron expanded={expanded} className="text-muted-foreground" />
            </Button>
          ) : null}

          {isPinned && def ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-caption"
              onClick={() => {
                void openFileInEditor(def.filePath, def.line);
              }}
            >
              <Code2 className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Open in editor</span>
            </Button>
          ) : null}

          {isPinned && externalLoadTargets.length > 0 ? (
            <Button
              ref={loadButtonRef}
              type="button"
              variant="outline"
              size="sm"
              className="text-caption"
              onClick={() => {
                if (externalLoadTargets.length === 1) {
                  loadTarget(externalLoadTargets[0]!.filePath);
                  return;
                }
                setLoadPickerOpen(true);
              }}
            >
              + Load
              {externalLoadTargets.length > 1
                ? ` · ${externalLoadTargets.length} files`
                : isDefinition
                  ? " caller"
                  : " into graph"}
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

      {expanded && listCount > 0 ? (
        <div className="max-h-40 overflow-x-hidden overflow-y-auto border-t border-border px-1.5 py-1.5">
          <ul className="flex flex-col gap-0.5">
            {isDefinition
              ? callSites.map((site, idx) => (
                  <li key={`c-${site.filePath}-${site.line}-${idx}`}>
                    <InteractiveListRow
                      title={fileBaseName(site.filePath)}
                      subtitle={`line ${site.line}${site.inGraph ? " · on canvas" : ""}`}
                      leading={<ConnectionTargetLeading kind={kind} />}
                      onClick={() => loadTarget(site.filePath)}
                    />
                  </li>
                ))
              : null}
            {!isDefinition
              ? graphRefs.map((ref, idx) => (
                  <li key={`g-${ref.filePath}-${ref.line}-${idx}`}>
                    <InteractiveListRow
                      title={
                        ref.memberLabel
                          ? `${ref.classLabel} → ${ref.memberLabel}`
                          : ref.classLabel
                      }
                      subtitle={`line ${ref.line}`}
                      leading={<ConnectionTargetLeading kind={ref.kind} />}
                      onClick={() => {
                        clearTokenInfo();
                        focusFlowNode(ref.flowNodeId!);
                      }}
                    />
                  </li>
                ))
              : null}
            {!isDefinition
              ? externalRefs.map((ref, idx) => (
                  <li key={`x-${ref.filePath}-${ref.line}-${idx}`}>
                    <InteractiveListRow
                      title={ref.classLabel}
                      subtitle={`line ${ref.line}`}
                      leading={<ConnectionTargetLeading kind={ref.kind} />}
                      onClick={() => loadTarget(ref.filePath)}
                    />
                  </li>
                ))
              : null}
          </ul>
        </div>
      ) : null}

      {loadPickerOpen && externalLoadTargets.length > 1 && loadButtonRef.current ? (
        <LoadTargetPicker
          token={token}
          targets={externalLoadTargets}
          anchor={(() => {
            const rect = loadButtonRef.current!.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top };
          })()}
          contextFilePath={tokenInfo.filePath}
          onSelect={loadTarget}
          onClose={() => setLoadPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
