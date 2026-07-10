import { useCallback, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { commitTokenPin } from "@/hooks/useTokenTrace";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { useIndex } from "@/context/IndexContext";
import { buildUsagePreviewEdge, buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { ctrlPreviewEdgeId, previewLineHandle } from "@/lib/ctrlPreviewHandles";
import {
  buildLocalPreviewEdges,
  connectionCountForHost,
  isDefinitionSignatureLine,
  resolveLocalTargetId,
} from "@/lib/linksForElement";
import {
  defSiteFor,
  type MemberSymbolIndex,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import {
  isTypeAnnotationContext,
  semanticForCodeIdentifier,
  semanticFromChipElement,
  TOKEN_ANCHOR,
} from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { makeUsageTokenKey, makeImportSpecKey } from "@/lib/traceKeys";
import { isImportModuleSpecifier } from "@/lib/importModuleTokens";
import { resolveClientImportPath, normalizeLoadFilePath } from "@/lib/resolveImportPath";
import { tokenizeLine } from "@/lib/tokenizeLine";
import { cn } from "@/lib/utils";

type CodeLineProps = {
  line: string;
  lineNumber: number;
  memberId: string;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  filePath: string;
  definedInLabel: string;
  symbolIndex: MemberSymbolIndex;
  /** Raw member identifier — signature-line chips with this name are definitions. */
  memberSymbolName?: string;
};

export function CodeLine({
  line,
  lineNumber,
  memberId,
  sourceFlowId,
  sourceGraphNodeId,
  filePath,
  definedInLabel,
  symbolIndex,
  memberSymbolName,
}: CodeLineProps) {
  const { symbols, lookup, hasSymbol } = useIndex();
  const { getNode } = useReactFlow();
  const {
    graphData,
    beginTrace,
    endHoverPreview,
    isHandleActive,
    edgeKindAtHandle,
    scheduleHoverFire,
    scheduleHoverClear,
    pinTrace,
    showTokenInfo,
  } = useGraphInteraction();
  const { lineLit } = useTraceAppearance({ memberId });

  const edgeKeyRef = useRef<string | null>(null);
  const chipRefs = useRef<Map<string, TokenChipHandle>>(new Map());

  const tokens = useMemo(() => tokenizeLine(line), [line]);

  const clearHover = useCallback(() => {
    edgeKeyRef.current = null;
    endHoverPreview();
  }, [endHoverPreview]);

  const firePreview = useCallback(
    (name: string, chipKey: string, chipEl: HTMLElement) => {
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      const edgeKey = ctrlPreviewEdgeId(sourceFlowId, `${memberId}::${lineNumber}::${name}`);
      edgeKeyRef.current = edgeKey;

      const entry = lookup(name);
      const kind = semanticFromChipElement(chipEl, entry);
      const localEdges = buildLocalPreviewEdges(chipEl, kind, edgeKey);
      if (localEdges.length > 0) {
        beginTrace(tokenKey, localEdges);
        return;
      }

      if (!hasSymbol(name) || !entry) {
        beginTrace(tokenKey, []);
        return;
      }

      const resolved = resolveVisibleTarget(
        name,
        symbols,
        graphData,
        getNode,
        sourceFlowId,
      );

      if (!resolved) {
        beginTrace(tokenKey, []);
        return;
      }

      if (resolved.mode === "external") {
        const card = resolved.cards[0];
        if (!card) {
          beginTrace(tokenKey, []);
          return;
        }
        const kind = semanticFromChipElement(chipEl, entry);
        beginTrace(tokenKey, [
          buildLoadPreviewEdge(edgeKey, card, chipEl, name, kind),
        ]);
        return;
      }

      beginTrace(tokenKey, [buildUsagePreviewEdge(edgeKey, resolved, chipEl, name)]);
    },
    [
      beginTrace,
      getNode,
      graphData,
      hasSymbol,
      lookup,
      memberId,
      lineNumber,
      sourceFlowId,
      symbols,
    ],
  );

  const fireImportPreview = useCallback(
    (specifier: string, chipEl: HTMLElement) => {
      const tokenKey = makeImportSpecKey(
        sourceFlowId,
        memberId,
        lineNumber,
        specifier,
      );
      const edgeKey = ctrlPreviewEdgeId(
        sourceFlowId,
        `${memberId}::${lineNumber}::import::${specifier}`,
      );
      const resolvedPath = normalizeLoadFilePath(
        filePath,
        resolveClientImportPath(filePath, specifier),
      );
      beginTrace(tokenKey, [
        buildLoadPreviewEdge(
          edgeKey,
          {
            symbolName: specifier.replace(/^['"]|['"]$/g, ""),
            filePath: resolvedPath,
            line: 1,
            occurrenceCount: 1,
          },
          chipEl,
          specifier.replace(/^['"]|['"]$/g, ""),
          "type",
        ),
      ]);
    },
    [beginTrace, filePath, lineNumber, memberId, sourceFlowId],
  );

  const buildUsagePinInfo = useCallback(
    (name: string, el: HTMLElement, isDefinition: boolean) => {
      const entry = lookup(name);
      const kind = semanticFromChipElement(el, entry);
      return makeTokenInfo({
        token: name,
        kind,
        connectionCount: connectionCountForHost(el, hasSymbol(name) ? name : undefined),
        definedIn: definedInLabel,
        filePath,
        line: lineNumber,
        sourceFlowId,
        sourceGraphNodeId,
        role: isDefinition ? "definition" : "usage",
        pinned: true,
      });
    },
    [
      definedInLabel,
      filePath,
      hasSymbol,
      lineNumber,
      lookup,
      sourceFlowId,
      sourceGraphNodeId,
    ],
  );

  const onIdentifierEnter = useCallback(
    (name: string, chipKey: string) => {
      const chip = chipRefs.current.get(chipKey);
      const chipEl = chip?.getChipElement();
      if (!chipEl) return;
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      scheduleHoverFire(
        tokenKey,
        () => firePreview(name, chipKey, chipEl),
        clearHover,
        () =>
          showTokenInfo({
            ...buildUsagePinInfo(name, chipEl, false),
            pinned: false,
          }),
      );
    },
    [
      buildUsagePinInfo,
      clearHover,
      firePreview,
      lineNumber,
      memberId,
      scheduleHoverFire,
      showTokenInfo,
      sourceFlowId,
    ],
  );

  const onIdentifierLeave = useCallback(
    (name: string) => {
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      scheduleHoverClear(tokenKey, clearHover);
    },
    [clearHover, lineNumber, memberId, scheduleHoverClear, sourceFlowId],
  );

  const onIdentifierClick = useCallback(
    (
      name: string,
      el: HTMLElement,
      isDefinition: boolean,
      e?: React.MouseEvent,
    ) => {
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      commitTokenPin({
        pinTrace,
        showTokenInfo,
        tokenKey,
        onFire: () => firePreview(name, `${lineNumber}`, el),
        buildPinInfo: () => buildUsagePinInfo(name, el, isDefinition),
        animateEl: el,
        event: e,
        shiftKey: e?.shiftKey,
      });
    },
    [
      buildUsagePinInfo,
      firePreview,
      lineNumber,
      memberId,
      pinTrace,
      showTokenInfo,
      sourceFlowId,
    ],
  );

  const lineTargetId = previewLineHandle(memberId, lineNumber);
  const lineTargetActive = isHandleActive(lineTargetId);
  const lineKind = edgeKindAtHandle(lineTargetId);

  return (
    <div
      className={cn(
        "code-line relative overflow-visible whitespace-pre-wrap font-mono text-xs leading-relaxed",
        lineLit && "trace-lit-line",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        id={lineTargetId}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
      <FlowAnchor
        side="left"
        targetId={lineTargetId}
        size="node"
        visible={lineTargetActive}
        highlighted={lineTargetActive}
        colorClass={lineTargetActive && lineKind ? TOKEN_ANCHOR[lineKind] : "bg-border"}
      />
      {tokens.map((token, i) => {
        if (token.kind === "string" && isImportModuleSpecifier(tokens, i)) {
          const chipKey = `import-${lineNumber}-${i}`;
          const tokenKey = makeImportSpecKey(
            sourceFlowId,
            memberId,
            lineNumber,
            token.text,
          );
          return (
            <TokenChip
              key={`${lineNumber}-${i}`}
              ref={(handle) => {
                if (handle) chipRefs.current.set(chipKey, handle);
                else chipRefs.current.delete(chipKey);
              }}
              text={token.text}
              semantic="type"
              traceKey={tokenKey}
              interactive
              symbolRole="usage"
              shimmerDelay={`-${((lineNumber * 7 + i) * 0.37).toFixed(2)}s`}
              role="button"
              tabIndex={0}
              onMouseEnter={() => {
                const chip = chipRefs.current.get(chipKey);
                const chipEl = chip?.getChipElement();
                if (!chipEl) return;
                scheduleHoverFire(
                  tokenKey,
                  () => fireImportPreview(token.text, chipEl),
                  clearHover,
                );
              }}
              onMouseLeave={() => scheduleHoverClear(tokenKey, clearHover)}
              onClick={(e) => {
                e.stopPropagation();
                const chipEl = chipRefs.current.get(chipKey)?.getChipElement();
                if (!chipEl) return;
                commitTokenPin({
                  pinTrace,
                  showTokenInfo,
                  tokenKey,
                  onFire: () => fireImportPreview(token.text, chipEl),
                  buildPinInfo: () =>
                    makeTokenInfo({
                      token: token.text.replace(/^['"]|['"]$/g, ""),
                      kind: "type",
                      connectionCount: 0,
                      definedIn: definedInLabel,
                      filePath: resolveClientImportPath(filePath, token.text),
                      line: lineNumber,
                      sourceFlowId,
                      sourceGraphNodeId,
                      role: "usage",
                      pinned: true,
                    }),
                  animateEl: chipEl,
                  event: e,
                  shiftKey: e.shiftKey,
                });
              }}
            />
          );
        }

        if (token.kind !== "identifier") {
          return (
            <span
              key={`${lineNumber}-${i}`}
              className={cn(
                token.kind === "keyword" && "code-kw",
                (token.kind === "operator" || token.kind === "other") && "code-pn",
                token.kind === "comment" && "code-comment text-muted-foreground",
                token.kind === "string" && "code-string text-[color:var(--code-string)]",
                token.kind === "number" && "code-number text-[color:var(--code-number)]",
              )}
            >
              {token.text}
            </span>
          );
        }

        const prevToken = tokens
          .slice(0, i)
          .reverse()
          .find((t) => t.kind !== "whitespace");
        const prevText = prevToken?.text ?? null;

        const rawLocalTarget = usageTargetFor(symbolIndex, lineNumber, i);
        const localDefId = defSiteFor(symbolIndex, lineNumber, i);
        const localTargetId = rawLocalTarget
          ? resolveLocalTargetId(rawLocalTarget, sourceFlowId)
          : null;
        const indexed = hasSymbol(token.text);
        const interactive = indexed || !!localDefId || !!localTargetId;
        const inTypeContext = isTypeAnnotationContext(prevText);

        if (!interactive) {
          return (
            <span
              key={`${lineNumber}-${i}`}
              className={cn(inTypeContext && "text-[color:var(--token-edge-type)]")}
            >
              {token.text}
            </span>
          );
        }

        const entry = lookup(token.text);
        const semantic = semanticForCodeIdentifier(entry, prevText);
        const isClassDeclName =
          indexed &&
          semantic === "class" &&
          (prevText === "class" || prevText === "interface");
        const isMemberSignatureDecl =
          memberSymbolName != null &&
          token.text === memberSymbolName &&
          isDefinitionSignatureLine(
            line,
            token.text,
            sourceFlowId,
            memberId,
            sourceFlowId,
            memberId,
          );
        const isDefinition = Boolean(
          localDefId || isClassDeclName || isMemberSignatureDecl,
        );
        const chipKey = `${lineNumber}-${i}`;
        const tokenKey = makeUsageTokenKey(
          sourceFlowId,
          memberId,
          lineNumber,
          token.text,
        );

        return (
          <TokenChip
            key={`${lineNumber}-${i}`}
            ref={(handle) => {
              if (handle) chipRefs.current.set(chipKey, handle);
              else chipRefs.current.delete(chipKey);
            }}
            text={token.text}
            semantic={semantic}
            traceKey={tokenKey}
            interactive={interactive}
            localDefId={localDefId}
            localTargetId={localTargetId ?? undefined}
            symbolRole={isDefinition ? "definition" : "usage"}
            shimmerDelay={`-${((lineNumber * 7 + i) * 0.37).toFixed(2)}s`}
            role="button"
            tabIndex={0}
            onMouseEnter={() => onIdentifierEnter(token.text, chipKey)}
            onMouseLeave={() => onIdentifierLeave(token.text)}
            onClick={(e) => {
              e.stopPropagation();
              onIdentifierClick(token.text, e.currentTarget, isDefinition, e);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onIdentifierClick(token.text, e.currentTarget, isDefinition);
              }
            }}
          />
        );
      })}
    </div>
  );
}
