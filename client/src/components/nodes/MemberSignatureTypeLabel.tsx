import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useReactFlow } from "@xyflow/react";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useIndex } from "@/context/IndexContext";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useTokenHover, useTokenPin } from "@/hooks/useTokenTrace";
import {
  buildSignatureTypeUsageEdges,
  connectionCountsForHost,
} from "@/lib/linksForElement";
import {
  buildHoverLoadMenu,
  loadTargetsFromExternalCards,
} from "@/lib/connectionMenu";
import {
  primaryIndexedSymbolInType,
  signatureTypeIsExpandable,
  signatureTypeLines,
  truncateSignatureType,
} from "@/lib/formatSignatureType";
import { resolveVisibleTarget } from "@/lib/resolveVisibleTarget";
import { INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { makeTokenInfo } from "@/lib/tokenContextInfo";
import { symbolKindToSemantic } from "@/lib/tokenColors";
import { makeSignatureTypeKey } from "@/lib/traceKeys";
import { cn } from "@/lib/utils";

type MemberSignatureTypeLabelProps = {
  type: string;
  variant: "in" | "out";
  memberId: string;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  shimmerDelay?: string;
};

function SignatureTypeText({
  text,
  connectable,
  shimmerDelay,
}: {
  text: string;
  connectable: boolean;
  shimmerDelay?: string;
}) {
  if (!connectable) return text;
  return (
    <span
      className="token-shimmer-target relative inline"
      data-text={text}
      style={
        shimmerDelay
          ? ({ "--shimmer-delay": shimmerDelay } as CSSProperties)
          : undefined
      }
    >
      {text}
    </span>
  );
}

export function MemberSignatureTypeLabel({
  type,
  variant,
  memberId,
  flowNodeId,
  graphNodeId,
  filePath,
  shimmerDelay,
}: MemberSignatureTypeLabelProps) {
  const chipRef = useRef<TokenChipHandle>(null);
  const hostRef = useRef<HTMLButtonElement>(null);
  useTraceHostRegistration(hostRef);
  const { lookup, hasSymbol, symbols } = useIndex();
  const { getNode } = useReactFlow();
  const {
    beginTrace,
    graphData,
    showConnectionMenu,
    clearConnectionMenu,
  } = useGraphInteraction();
  const [expanded, setExpanded] = useState(false);

  const symbolName = primaryIndexedSymbolInType(type, hasSymbol);
  const entry = symbolName ? lookup(symbolName) : undefined;
  const semantic = entry ? symbolKindToSemantic(entry.kind) : "type";
  const expandable = signatureTypeIsExpandable(type);
  const { short } = truncateSignatureType(type);
  const lines = signatureTypeLines(type);
  const tokenKey = symbolName
    ? makeSignatureTypeKey(flowNodeId, memberId, symbolName)
    : "";

  const connectable = useMemo(() => {
    if (!symbolName) return false;
    return (
      resolveVisibleTarget(symbolName, symbols, graphData, getNode, flowNodeId) !=
      null
    );
  }, [flowNodeId, getNode, graphData, symbolName, symbols]);

  const getHostEl = useCallback(
    () => chipRef.current?.getChipElement() ?? hostRef.current,
    [],
  );

  const showUsageLoadMenu = useCallback(
    (chipEl: HTMLElement) => {
      if (!symbolName) return;
      const resolved = resolveVisibleTarget(
        symbolName,
        symbols,
        graphData,
        getNode,
        flowNodeId,
      );
      if (!resolved || resolved.mode !== "external") {
        clearConnectionMenu();
        return;
      }
      const menuState = buildHoverLoadMenu(
        symbolName,
        semantic,
        "usage",
        chipEl,
        loadTargetsFromExternalCards(resolved.cards),
        filePath,
      );
      if (menuState) showConnectionMenu(menuState);
      else clearConnectionMenu();
    },
    [
      clearConnectionMenu,
      filePath,
      flowNodeId,
      getNode,
      graphData,
      semantic,
      showConnectionMenu,
      symbolName,
      symbols,
    ],
  );

  const firePreview = useCallback(() => {
    if (!symbolName || !connectable) return;
    const chipEl = getHostEl();
    if (!chipEl) return;
    const edges = buildSignatureTypeUsageEdges(
      symbolName,
      semantic,
      chipEl,
      symbols,
      graphData,
      getNode,
      flowNodeId,
      memberId,
    );
    beginTrace(tokenKey, edges);
    if (edges.some((e) => e.load)) showUsageLoadMenu(chipEl);
    else clearConnectionMenu();
  }, [
    beginTrace,
    clearConnectionMenu,
    connectable,
    flowNodeId,
    getHostEl,
    getNode,
    graphData,
    memberId,
    semantic,
    showUsageLoadMenu,
    symbolName,
    symbols,
    tokenKey,
  ]);

  const buildPinInfo = useCallback(() => {
    const chipEl = getHostEl();
    const counts = chipEl
      ? connectionCountsForHost(chipEl, symbolName ?? undefined)
      : { onCanvas: 0, inProject: 0 };
    return makeTokenInfo({
      token: symbolName ?? type,
      kind: semantic,
      connectionCount: counts.onCanvas,
      projectConnectionCount: counts.inProject,
      definedIn: symbolName ?? type,
      filePath,
      line: 1,
      sourceFlowId: flowNodeId,
      sourceGraphNodeId: graphNodeId,
      role: "usage",
      pinned: true,
    });
  }, [
    filePath,
    flowNodeId,
    getHostEl,
    graphNodeId,
    semantic,
    symbolName,
    type,
  ]);

  const { onEnter, onLeave } = useTokenHover({
    tokenKey,
    enabled: connectable,
    onFire: firePreview,
    onClear: () => {},
    buildTransientInfo: () => {
      const { pinned: _p, ...rest } = buildPinInfo();
      return rest;
    },
  });

  const { onPinClick } = useTokenPin({
    tokenKey,
    enabled: connectable,
    onFire: firePreview,
    buildPinInfo: () => {
      const { pinned: _p, ...rest } = buildPinInfo();
      return rest;
    },
  });

  const indexed = Boolean(symbolName);
  const primitive = !indexed || !connectable;

  const className = cn(
    "member-sig-type",
    variant === "in" ? "member-sig-type--in" : "member-sig-type--out",
    primitive ? "member-sig-type--primitive" : "member-sig-type--indexed",
    connectable && "member-sig-type--connectable cursor-pointer",
    expandable && INTERACTIVE_SURFACE,
    expandable && "member-sig-type--expandable",
    expanded && "member-sig-type--expanded",
  );

  const renderText = (text: string): ReactNode => (
    <SignatureTypeText
      text={text}
      connectable={connectable}
      shimmerDelay={shimmerDelay}
    />
  );

  const traceHandlers = connectable
    ? {
        onMouseEnter: onEnter,
        onMouseLeave: onLeave,
      }
    : {};

  if (connectable && !expandable) {
    return (
      <span
        className="member-sig-type-chip nodrag shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <TokenChip
          ref={chipRef}
          text={type}
          semantic={semantic}
          traceKey={tokenKey}
          interactive
          symbolRole="usage"
          shimmerDelay={shimmerDelay}
          role="button"
          tabIndex={0}
          className="member-sig-type-chip"
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onClick={(e) => {
            e.stopPropagation();
            onPinClick(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onPinClick(e as unknown as React.MouseEvent);
            }
          }}
        />
      </span>
    );
  }

  if (!expandable) {
    return (
      <span className={className} {...traceHandlers}>
        {renderText(type)}
      </span>
    );
  }

  return (
    <button
      ref={hostRef}
      type="button"
      className={className}
      title={expanded ? "Click to collapse" : type}
      aria-expanded={expanded}
      data-trace-key={connectable ? tokenKey : undefined}
      data-token-kind={connectable ? semantic : undefined}
      data-symbol-name={connectable ? symbolName : undefined}
      data-symbol-role={connectable ? "usage" : undefined}
      style={
        connectable && shimmerDelay
          ? ({ "--shimmer-delay": shimmerDelay } as CSSProperties)
          : undefined
      }
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setExpanded((open) => !open);
      }}
      {...traceHandlers}
    >
      {expanded ? (
        <span className="member-sig-type-lines">
          {lines.map((line, index) => (
            <span key={index} className="member-sig-type-line">
              {renderText(line)}
            </span>
          ))}
        </span>
      ) : (
        renderText(short)
      )}
    </button>
  );
}
