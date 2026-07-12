import { ArrowLeft, Code2, Crosshair, X } from "lucide-react";
import { TokenContextBarList } from "@/components/code/TokenContextBarList";
import { useTokenContextBar } from "@/components/code/useTokenContextBar";
import { LoadTargetPicker } from "@/components/graph/LoadTargetPicker";
import { Button } from "@/components/ui/button";
import { SemanticConnectionDot } from "@/components/ui/InteractiveListRow";
import { PinTab } from "@/components/ui/PinTab";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { openFileInEditor } from "@/api";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  class: "Class",
  function: "Function",
  type: "Type",
  variable: "Variable",
};

export function TokenContextBar() {
  const bar = useTokenContextBar();
  if (!bar.tokenInfo) return null;

  const { token, kind, definedIn, role } = bar.tokenInfo;

  return (
    <div
      data-token-context-bar
      className={cn(
        "pointer-events-auto absolute inset-x-3 bottom-3 z-50 overflow-hidden rounded-xl border bg-card/95 shadow-lg backdrop-blur-sm",
        bar.isPinned ? "border-border" : "border-brand-border/60 opacity-95",
      )}
    >
      {bar.isPinned && bar.pinnedTraces.length > 1 ? (
        <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
          {bar.pinnedTraces.map((trace) => {
            const label = trace.info?.token ?? trace.tokenKey.split("::").pop() ?? "?";
            const active = trace.tokenKey === bar.activePinKey;
            return (
              <PinTab
                key={trace.tokenKey}
                label={label}
                active={active}
                onClick={() => bar.setActivePinKey(trace.tokenKey)}
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
          {bar.isPinned && bar.canGoBackPin ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Back to previous selection"
              title="Back to previous selection (Alt+←)"
              onClick={bar.goBackPin}
            >
              <ArrowLeft className="size-3.5" aria-hidden />
            </Button>
          ) : null}

          {bar.isPinned && bar.canJumpDef && bar.def?.flowNodeId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-caption"
              onClick={() => {
                bar.clearTokenInfo();
                bar.focusFlowNode(bar.def!.flowNodeId!);
              }}
            >
              <Crosshair className="size-3.5" aria-hidden />
              Jump to definition
            </Button>
          ) : null}

          {bar.isPinned && bar.connectionLabel ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-caption"
              onClick={() => bar.setExpanded((v) => !v)}
            >
              {bar.connectionLabel}
              <ExpandChevron expanded={bar.expanded} className="text-muted-foreground" />
            </Button>
          ) : null}

          {bar.isPinned && bar.def ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-caption"
              onClick={() => {
                void openFileInEditor(bar.def!.filePath, bar.def!.line);
              }}
            >
              <Code2 className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">Open in editor</span>
            </Button>
          ) : null}

          {bar.isPinned && bar.externalLoadTargets.length > 0 ? (
            <Button
              ref={bar.loadButtonRef}
              type="button"
              variant="outline"
              size="sm"
              className="text-caption"
              onClick={() => {
                if (bar.externalLoadTargets.length === 1) {
                  bar.loadTarget(bar.externalLoadTargets[0]!.filePath);
                  return;
                }
                bar.setLoadPickerOpen(true);
              }}
            >
              + Load
              {bar.externalLoadTargets.length > 1
                ? ` · ${bar.externalLoadTargets.length} files`
                : bar.isDefinition
                  ? " caller"
                  : " into graph"}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={bar.isPinned ? "Unpin" : "Dismiss"}
            title={bar.isPinned ? "Unpin" : "Dismiss"}
            onClick={bar.clearTokenInfo}
          >
            <X className="size-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {bar.expanded && bar.listCount > 0 ? (
        <div className="max-h-40 overflow-x-hidden overflow-y-auto border-t border-border px-1.5 py-1.5">
          <TokenContextBarList
            isDefinition={bar.isDefinition}
            kind={kind}
            callSites={bar.callSites}
            graphRefs={bar.graphRefs}
            externalRefs={bar.externalRefs}
            onLoadTarget={bar.loadTarget}
            onFocusFlowNode={bar.focusFlowNode}
            onClearTokenInfo={bar.clearTokenInfo}
          />
        </div>
      ) : null}

      {bar.loadPickerOpen && bar.externalLoadTargets.length > 1 && bar.loadButtonRef.current ? (
        <LoadTargetPicker
          token={token}
          targets={bar.externalLoadTargets}
          anchor={(() => {
            const rect = bar.loadButtonRef.current!.getBoundingClientRect();
            return { x: rect.left + rect.width / 2, y: rect.top };
          })()}
          contextFilePath={bar.tokenInfo.filePath}
          onSelect={bar.loadTarget}
          onClose={() => bar.setLoadPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
