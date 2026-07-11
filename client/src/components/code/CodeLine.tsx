import { useCallback, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow } from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { commitTokenPin } from "@/hooks/useTokenTrace";
import { useIndex } from "@/context/IndexContext";
import { buildUsagePreviewEdge, buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import {
  buildHoverLoadMenu,
  loadTargetsFromExternalCards,
  loadTargetsFromCallSiteRefs,
} from "@/lib/connectionMenu";
import { useTokenContextMenu } from "@/hooks/useTokenContextMenu";
import { useSimulationOptional } from "@/context/SimulationContext";
import { ctrlPreviewEdgeId, previewLineHandle } from "@/lib/ctrlPreviewHandles";
import { buildDefinitionPreviewEdges } from "@/lib/buildDefinitionPreviewEdges";
import {
  isDefinitionSignatureLine,
  type DefinitionEdgeContext,
} from "@/lib/resolveDefinitionUsageSites";
import { buildBindingPreviewEdges } from "@/lib/bindingPreviewEdges";
import { buildControlFlowPreviewEdges } from "@/lib/controlFlowPreviewEdges";
import { buildLocalPreviewEdges, resolveLocalTargetId } from "@/lib/localDefLinks";
import { connectionCountsForHost } from "@/lib/connectionCounts";
import {
  defSiteFor,
  bindingDefForInit,
  type MemberSymbolIndex,
  usageTargetFor,
} from "@/lib/localSymbolLinks";
import {
  controlFlowAnchorFor,
  type ControlFlowIndex,
} from "@/lib/controlFlowLinks";
import { memberAccessReceiverIndices } from "@/lib/memberAccessChain";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import {
  isTypeAnnotationContext,
  semanticForCodeIdentifier,
  semanticFromChipElement,
  TOKEN_ANCHOR,
} from "@/lib/tokenColors";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import {
  makeControlFlowKey,
  makeMemberDefKey,
  makeUsageTokenKey,
  makeImportSpecKey,
} from "@/lib/traceKeys";
import { isImportModuleSpecifier } from "@/lib/importModuleTokens";
import { resolveClientImportPath, normalizeLoadFilePath } from "@/lib/resolveImportPath";
import { blockCommentOpenAtLineStart, tokenizeLine } from "@/lib/tokenizeLine";
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
  controlFlowIndex: ControlFlowIndex;
  /** Raw member identifier — signature-line chips with this name are definitions. */
  memberSymbolName?: string;
  methodCode?: string;
  methodName?: string;
  signatureLine?: string;
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
  controlFlowIndex,
  memberSymbolName,
  methodCode,
  methodName,
  signatureLine,
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
    lookupIndexedUsageSites,
    lookupProjectReferences,
    lookupOffCanvasCallSiteFiles,
    showConnectionMenu,
    clearConnectionMenu,
  } = useGraphInteraction();

  const edgeKeyRef = useRef<string | null>(null);
  const chipRefs = useRef<Map<string, TokenChipHandle>>(new Map());

  const tokens = useMemo(() => {
    const inBlock =
      methodCode != null
        ? blockCommentOpenAtLineStart(methodCode, lineNumber)
        : false;
    return tokenizeLine(line, inBlock).tokens;
  }, [line, lineNumber, methodCode]);

  /** Does `tokens[idx]` resolve to something on its own (local/param/indexed)? */
  const isLinkableIdentifier = useCallback(
    (idx: number): boolean => {
      const tok = tokens[idx];
      if (!tok || tok.kind !== "identifier") return false;
      return (
        hasSymbol(tok.text) ||
        !!defSiteFor(symbolIndex, lineNumber, idx) ||
        !!usageTargetFor(symbolIndex, lineNumber, idx)
      );
    },
    [hasSymbol, lineNumber, symbolIndex, tokens],
  );

  const defEdgeContext = useMemo<DefinitionEdgeContext>(
    () => ({
      graphData,
      getNode,
      sourceFlowId,
      sourceMemberId: memberId,
      lookupIndexedUsageSites,
      lookupProjectReferences,
      lookupOffCanvasCallSiteFiles,
    }),
    [getNode, graphData, lookupIndexedUsageSites, lookupOffCanvasCallSiteFiles, lookupProjectReferences, memberId, sourceFlowId],
  );

  const clearHover = useCallback(() => {
    edgeKeyRef.current = null;
    endHoverPreview();
  }, [endHoverPreview]);

  const showUsageLoadMenu = useCallback(
    (
      name: string,
      kind: ReturnType<typeof semanticFromChipElement>,
      chipEl: HTMLElement,
      cards: Parameters<typeof loadTargetsFromExternalCards>[0],
    ) => {
      const menuState = buildHoverLoadMenu(
        name,
        kind,
        "usage",
        chipEl,
        loadTargetsFromExternalCards(cards),
        filePath,
      );
      if (menuState) showConnectionMenu(menuState);
      else clearConnectionMenu();
    },
    [clearConnectionMenu, filePath, showConnectionMenu],
  );

  /**
   * A property-access identifier (`country` in `context.country`) cascades:
   * hovering it also resolves its receiver chain's own edges, so both the
   * property and the path used to reach it light up together. The receiver
   * alone never cascades forward — only leftward, toward what it was reached
   * through.
   */
  const buildReceiverCascadeEdges = useCallback(
    (tokenIndex: number, edgeKeyBase: string): PreviewEdgeSpec[] => {
      if (!Number.isFinite(tokenIndex)) return [];
      const receiverIndices = memberAccessReceiverIndices(tokens, tokenIndex);
      const edges: PreviewEdgeSpec[] = [];
      for (const receiverIdx of receiverIndices) {
        const receiverTok = tokens[receiverIdx];
        if (!receiverTok || !isLinkableIdentifier(receiverIdx)) continue;
        const receiverEl = chipRefs.current
          .get(`${lineNumber}-${receiverIdx}`)
          ?.getChipElement();
        if (!receiverEl) continue;

        const receiverKind = semanticFromChipElement(receiverEl, lookup(receiverTok.text));
        const receiverEdgeKey = `${edgeKeyBase}-cascade-${receiverIdx}`;
        const localReceiverEdges = buildLocalPreviewEdges(receiverEl, receiverKind, receiverEdgeKey);
        if (localReceiverEdges.length > 0) {
          edges.push(...localReceiverEdges);
          continue;
        }
        if (!hasSymbol(receiverTok.text)) continue;
        const resolvedReceiver = resolveVisibleTarget(
          receiverTok.text,
          symbols,
          graphData,
          getNode,
          sourceFlowId,
        );
        if (resolvedReceiver?.mode === "graph") {
          edges.push(
            buildUsagePreviewEdge(receiverEdgeKey, resolvedReceiver, receiverEl, receiverTok.text),
          );
        }
      }
      return edges;
    },
    [getNode, graphData, hasSymbol, isLinkableIdentifier, lineNumber, lookup, sourceFlowId, symbols, tokens],
  );

  const firePreview = useCallback(
    (name: string, chipKey: string, chipEl: HTMLElement) => {
      const tokenKey = makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      const edgeKey = ctrlPreviewEdgeId(sourceFlowId, `${memberId}::${lineNumber}::${name}`);
      edgeKeyRef.current = edgeKey;

      const entry = lookup(name);
      const kind = semanticFromChipElement(chipEl, entry);
      const tokenIndex = Number(chipKey.split("-").pop());
      const cascadeEdges = buildReceiverCascadeEdges(tokenIndex, edgeKey);
      const bindingEdges =
        Number.isFinite(tokenIndex)
          ? buildBindingPreviewEdges(
              chipEl,
              symbolIndex,
              sourceFlowId,
              memberId,
              lineNumber,
              tokenIndex,
              edgeKey,
            )
          : [];

      if (
        bindingEdges.length > 0 &&
        Number.isFinite(tokenIndex) &&
        bindingDefForInit(symbolIndex, lineNumber, tokenIndex)
      ) {
        clearConnectionMenu();
        beginTrace(tokenKey, [...bindingEdges, ...cascadeEdges]);
        return;
      }

      const controlFlowEdges = Number.isFinite(tokenIndex)
        ? buildControlFlowPreviewEdges(
            chipEl,
            controlFlowIndex,
            sourceFlowId,
            memberId,
            lineNumber,
            tokenIndex,
            edgeKey,
          )
        : [];

      const localEdges = buildLocalPreviewEdges(chipEl, kind, edgeKey);
      if (
        localEdges.length > 0 ||
        bindingEdges.length > 0 ||
        controlFlowEdges.length > 0 ||
        cascadeEdges.length > 0
      ) {
        clearConnectionMenu();
        beginTrace(tokenKey, [...localEdges, ...bindingEdges, ...controlFlowEdges, ...cascadeEdges]);
        return;
      }

      if (!hasSymbol(name) && !entry) {
        const resolvedWithoutIndex = resolveVisibleTarget(
          name,
          symbols,
          graphData,
          getNode,
          sourceFlowId,
        );
        if (!resolvedWithoutIndex) {
          clearConnectionMenu();
          beginTrace(tokenKey, cascadeEdges);
          return;
        }
        if (resolvedWithoutIndex.mode === "external") {
          if (resolvedWithoutIndex.cards.length === 0) {
            clearConnectionMenu();
            beginTrace(tokenKey, cascadeEdges);
            return;
          }
          beginTrace(tokenKey, [
            buildLoadPreviewEdge(
              edgeKey,
              resolvedWithoutIndex.cards,
              chipEl,
              name,
              kind,
            ),
            ...cascadeEdges,
          ]);
          showUsageLoadMenu(name, kind, chipEl, resolvedWithoutIndex.cards);
          return;
        }
        clearConnectionMenu();
        beginTrace(tokenKey, [
          buildUsagePreviewEdge(edgeKey, resolvedWithoutIndex, chipEl, name),
          ...cascadeEdges,
        ]);
        return;
      }

      if (!hasSymbol(name) || !entry) {
        clearConnectionMenu();
        beginTrace(tokenKey, cascadeEdges);
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
        clearConnectionMenu();
        beginTrace(tokenKey, cascadeEdges);
        return;
      }

      if (resolved.mode === "external") {
        if (resolved.cards.length === 0) {
          clearConnectionMenu();
          beginTrace(tokenKey, cascadeEdges);
          return;
        }
        const resolvedKind = semanticFromChipElement(chipEl, entry);
        beginTrace(tokenKey, [
          buildLoadPreviewEdge(edgeKey, resolved.cards, chipEl, name, resolvedKind),
          ...cascadeEdges,
        ]);
        showUsageLoadMenu(name, resolvedKind, chipEl, resolved.cards);
        return;
      }

      clearConnectionMenu();
      beginTrace(tokenKey, [
        buildUsagePreviewEdge(edgeKey, resolved, chipEl, name),
        ...cascadeEdges,
      ]);
    },
    [
      beginTrace,
      buildReceiverCascadeEdges,
      clearConnectionMenu,
      getNode,
      graphData,
      hasSymbol,
      lookup,
      memberId,
      lineNumber,
      showUsageLoadMenu,
      sourceFlowId,
      symbolIndex,
      controlFlowIndex,
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
      const importName = specifier.replace(/^['"]|['"]$/g, "");
      const cards = [
        {
          symbolName: importName,
          filePath: resolvedPath,
          line: 1,
          occurrenceCount: 1,
        },
      ];
      beginTrace(tokenKey, [
        buildLoadPreviewEdge(edgeKey, cards, chipEl, importName, "type"),
      ]);
      showUsageLoadMenu(importName, "type", chipEl, cards);
    },
    [beginTrace, filePath, lineNumber, memberId, showUsageLoadMenu, sourceFlowId],
  );

  const controlFlowRefs = useRef<Map<string, HTMLElement>>(new Map());

  const fireControlFlowPreview = useCallback(
    (cfLine: number, cfTokenIndex: number, hostEl: HTMLElement) => {
      const edgeKey = ctrlPreviewEdgeId(
        sourceFlowId,
        `${memberId}::${cfLine}::cf-${cfTokenIndex}`,
      );
      const edges = buildControlFlowPreviewEdges(
        hostEl,
        controlFlowIndex,
        sourceFlowId,
        memberId,
        cfLine,
        cfTokenIndex,
        edgeKey,
      );
      clearConnectionMenu();
      beginTrace(
        makeControlFlowKey(sourceFlowId, memberId, cfLine, cfTokenIndex),
        edges,
      );
    },
    [beginTrace, clearConnectionMenu, controlFlowIndex, memberId, sourceFlowId],
  );

  const buildControlFlowPinInfo = useCallback(
    (token: string, role: "definition" | "usage", cfLine: number): ReturnType<typeof makeTokenInfo> =>
      makeTokenInfo({
        token,
        kind: "variable",
        connectionCount: 0,
        projectConnectionCount: 0,
        definedIn: definedInLabel,
        filePath,
        line: cfLine,
        sourceFlowId,
        sourceGraphNodeId,
        role,
        pinned: true,
      }),
    [definedInLabel, filePath, sourceFlowId, sourceGraphNodeId],
  );

  const showDefLoadMenu = useCallback(
    (name: string, kind: ReturnType<typeof semanticFromChipElement>, chipEl: HTMLElement) => {
      const sites = lookupOffCanvasCallSiteFiles(name);
      const menuState = buildHoverLoadMenu(
        name,
        kind,
        "definition",
        chipEl,
        loadTargetsFromCallSiteRefs(name, sites),
        filePath,
      );
      if (menuState) showConnectionMenu(menuState);
      else clearConnectionMenu();
    },
    [clearConnectionMenu, filePath, lookupOffCanvasCallSiteFiles, showConnectionMenu],
  );

  const fireDefPreview = useCallback(
    (name: string, chipEl: HTMLElement) => {
      const tokenKey = makeMemberDefKey(sourceFlowId, memberId);
      const kind = semanticFromChipElement(chipEl, lookup(name));
      beginTrace(
        tokenKey,
        buildDefinitionPreviewEdges(name, kind, chipEl, defEdgeContext),
      );
      showDefLoadMenu(name, kind, chipEl);
    },
    [beginTrace, defEdgeContext, lookup, memberId, showDefLoadMenu, sourceFlowId],
  );

  const buildUsagePinInfo = useCallback(
    (name: string, el: HTMLElement, isDefinition: boolean) => {
      const entry = lookup(name);
      const kind = semanticFromChipElement(el, entry);
      const counts = connectionCountsForHost(
        el,
        hasSymbol(name) ? name : undefined,
        isDefinition ? defEdgeContext : undefined,
      );
      return makeTokenInfo({
        token: name,
        kind,
        connectionCount: counts.onCanvas,
        projectConnectionCount: counts.inProject,
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
      defEdgeContext,
      definedInLabel,
      filePath,
      hasSymbol,
      lineNumber,
      lookup,
      sourceFlowId,
      sourceGraphNodeId,
    ],
  );

  const defTokenKey = useMemo(
    () => makeMemberDefKey(sourceFlowId, memberId),
    [memberId, sourceFlowId],
  );

  const openContextMenu = useTokenContextMenu({
    filePath,
    sourceFlowId,
    sourceMemberId: memberId,
    simulation:
      methodCode && methodName && signatureLine
        ? { methodName, code: methodCode, signatureLine }
        : undefined,
  });

  // `memberFanOut` is true only for the occurrence of the member/class's own
  // name on its signature line — the same symbol the member-row label traces.
  // Local param/variable defs keep the old per-occurrence key: they already
  // fan out correctly via `buildLocalPreviewEdges`, scoped to this member body.
  const onIdentifierEnter = useCallback(
    (name: string, chipKey: string, isDefinition: boolean, memberFanOut: boolean) => {
      const chip = chipRefs.current.get(chipKey);
      const chipEl = chip?.getChipElement();
      if (!chipEl) return;
      const tokenKey = memberFanOut
        ? defTokenKey
        : makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      scheduleHoverFire(
        tokenKey,
        () =>
          memberFanOut
            ? fireDefPreview(name, chipEl)
            : firePreview(name, chipKey, chipEl),
        clearHover,
        () =>
          showTokenInfo({
            ...buildUsagePinInfo(name, chipEl, isDefinition),
            pinned: false,
          }),
      );
    },
    [
      buildUsagePinInfo,
      clearHover,
      defTokenKey,
      fireDefPreview,
      firePreview,
      lineNumber,
      memberId,
      scheduleHoverFire,
      showTokenInfo,
      sourceFlowId,
    ],
  );

  const onIdentifierLeave = useCallback(
    (name: string, memberFanOut: boolean) => {
      const tokenKey = memberFanOut
        ? defTokenKey
        : makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      scheduleHoverClear(tokenKey, clearHover);
    },
    [clearHover, defTokenKey, lineNumber, memberId, scheduleHoverClear, sourceFlowId],
  );

  const onIdentifierClick = useCallback(
    (
      name: string,
      el: HTMLElement,
      isDefinition: boolean,
      memberFanOut: boolean,
      e?: React.MouseEvent,
    ) => {
      const tokenKey = memberFanOut
        ? defTokenKey
        : makeUsageTokenKey(sourceFlowId, memberId, lineNumber, name);
      commitTokenPin({
        pinTrace,
        showTokenInfo,
        tokenKey,
        onFire: () =>
          memberFanOut
            ? fireDefPreview(name, el)
            : firePreview(name, `${lineNumber}`, el),
        buildPinInfo: () => buildUsagePinInfo(name, el, isDefinition),
        animateEl: el,
        event: e,
        shiftKey: e?.shiftKey,
      });
    },
    [
      buildUsagePinInfo,
      defTokenKey,
      fireDefPreview,
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
  const sim = useSimulationOptional();
  const isSimCurrent =
    sim?.simActive &&
    sim.session?.memberId === memberId &&
    sim.session.steps[sim.session.currentIndex]?.lineNumber === lineNumber;

  return (
    <div
      className={cn(
        "code-line group/code-line",
        isSimCurrent && "code-line--sim-current",
      )}
    >
      <span className="code-line-gutter" aria-hidden>
        {lineNumber}
      </span>
      <div className="code-line-body relative overflow-visible whitespace-pre-wrap font-mono text-xs leading-relaxed">
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
                      projectConnectionCount: 0,
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
          const cfAnchor = controlFlowAnchorFor(controlFlowIndex, lineNumber, i);
          if (cfAnchor && cfAnchor.role !== "condition") {
            const cfKey = makeControlFlowKey(sourceFlowId, memberId, lineNumber, i);
            const cfRefKey = `${lineNumber}-${i}`;
            return (
              <span
                key={`${lineNumber}-${i}`}
                ref={(el) => {
                  if (el) controlFlowRefs.current.set(cfRefKey, el);
                  else controlFlowRefs.current.delete(cfRefKey);
                }}
                data-trace-key={cfKey}
                className="code-kw hoverable cursor-pointer"
                role="button"
                tabIndex={0}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  scheduleHoverFire(
                    cfKey,
                    () => fireControlFlowPreview(lineNumber, i, el),
                    clearHover,
                  );
                }}
                onMouseLeave={() => scheduleHoverClear(cfKey, clearHover)}
                onClick={(e) => {
                  e.stopPropagation();
                  commitTokenPin({
                    pinTrace,
                    showTokenInfo,
                    tokenKey: cfKey,
                    onFire: () => fireControlFlowPreview(lineNumber, i, e.currentTarget),
                    buildPinInfo: () =>
                      buildControlFlowPinInfo(
                        token.text,
                        cfAnchor.role === "head" ? "definition" : "usage",
                        lineNumber,
                      ),
                    animateEl: e.currentTarget,
                    event: e,
                    shiftKey: e.shiftKey,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const el = controlFlowRefs.current.get(cfRefKey);
                  if (!el) return;
                  commitTokenPin({
                    pinTrace,
                    showTokenInfo,
                    tokenKey: cfKey,
                    onFire: () => fireControlFlowPreview(lineNumber, i, el),
                    buildPinInfo: () =>
                      buildControlFlowPinInfo(
                        token.text,
                        cfAnchor.role === "head" ? "definition" : "usage",
                        lineNumber,
                      ),
                    animateEl: el,
                  });
                }}
              >
                {token.text}
              </span>
            );
          }

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
        // A property access (`.country`) is interactive even when `country`
        // itself resolves to nothing, as long as its receiver chain does —
        // hovering it cascades left to whatever it was reached through.
        const isCascadeCandidate =
          prevText === "." &&
          memberAccessReceiverIndices(tokens, i).some(isLinkableIdentifier);
        const interactive = indexed || !!localDefId || !!localTargetId || isCascadeCandidate;
        const inTypeContext = isTypeAnnotationContext(prevText);

        if (!interactive) {
          return (
            <span
              key={`${lineNumber}-${i}`}
              className={cn(inTypeContext && "code-type")}
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
        // Only the member/class's own name repeated on its signature line
        // shares the member-row label's fan-out key; local param/var defs
        // keep their own per-occurrence local tracing (see handlers above).
        const memberFanOut = isClassDeclName || isMemberSignatureDecl;
        const chipKey = `${lineNumber}-${i}`;
        const tokenKey = memberFanOut
          ? defTokenKey
          : makeUsageTokenKey(sourceFlowId, memberId, lineNumber, token.text);

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
            onMouseEnter={() =>
              onIdentifierEnter(token.text, chipKey, isDefinition, memberFanOut)
            }
            onMouseLeave={() => onIdentifierLeave(token.text, memberFanOut)}
            onClick={(e) => {
              e.stopPropagation();
              onIdentifierClick(token.text, e.currentTarget, isDefinition, memberFanOut, e);
            }}
            onContextMenu={(e) => {
              openContextMenu(e, {
                token: token.text,
                kind: semantic,
                role: isDefinition ? "definition" : "usage",
                chipEl: e.currentTarget,
                editorLine: lineNumber,
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onIdentifierClick(token.text, e.currentTarget, isDefinition, memberFanOut);
              }
            }}
          />
        );
      })}
      </div>
    </div>
  );
}
