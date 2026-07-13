import { useRef, useState, type ReactNode } from "react";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useMemberSignatureTypeTrace } from "@/hooks/useMemberSignatureTypeTrace";
import { useIndex } from "@/context/IndexContext";
import type { LexicalGraph } from "@/lib/lexicalGraph";
import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import {
  primaryIndexedSymbolInType,
  signatureTypeIsExpandable,
  signatureTypeLines,
  truncateSignatureType,
} from "@/lib/formatSignatureType";
import { INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { cn } from "@/lib/utils";

type MemberSignatureTypeLabelProps = {
  type: string;
  variant: "in" | "out";
  memberId: string;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  shimmerDelay?: string;
  paramName?: string;
  symbolIndex?: MemberSymbolIndex;
  lexicalGraph?: LexicalGraph;
  methodCode?: string;
  methodStartLine?: number;
  classLabel?: string;
};

function primitiveTypeClassName(variant: "in" | "out"): string {
  return cn(
    "member-sig-type",
    variant === "in" ? "member-sig-type--in" : "member-sig-type--out",
    "member-sig-type--primitive",
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
  paramName,
  symbolIndex,
  lexicalGraph,
  methodCode,
  methodStartLine,
}: MemberSignatureTypeLabelProps) {
  const { hasSymbol } = useIndex();
  const chipRef = useRef<TokenChipHandle>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  useTraceHostRegistration(hostRef);
  const [expanded, setExpanded] = useState(false);

  const {
    semantic,
    tokenKey,
    indexed,
    onEnter,
    onLeave,
    onFocus,
    onBlur,
    onPinClick,
  } = useMemberSignatureTypeTrace({
    type,
    memberId,
    flowNodeId,
    graphNodeId,
    filePath,
    chipRef,
    hostRef,
    paramName,
    symbolIndex,
    lexicalGraph,
    methodCode,
    methodStartLine,
  });

  const expandable = signatureTypeIsExpandable(type);
  const { short } = truncateSignatureType(type);
  const lines = signatureTypeLines(type);

  const renderPlainType = (text: string, key?: string): ReactNode => (
    <span key={key} className={primitiveTypeClassName(variant)}>
      {text}
    </span>
  );

  const renderConnectableChip = (text: string, key?: string): ReactNode => (
    <span
      key={key}
      className="member-sig-type-chip nodrag shrink-0"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <TokenChip
        ref={key ? undefined : chipRef}
        text={text}
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
        onFocus={onFocus}
        onBlur={onBlur}
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

  const renderType = (text: string, key?: string): ReactNode => {
    if (primaryIndexedSymbolInType(text, hasSymbol)) {
      return renderConnectableChip(text, key);
    }
    return renderPlainType(text, key);
  };

  if (!expandable) {
    return renderType(type);
  }

  return (
    <span
      ref={hostRef}
      role="button"
      tabIndex={0}
      className={cn(
        "member-sig-type member-sig-type-expand-host",
        indexed ? "member-sig-type--indexed" : primitiveTypeClassName(variant),
        INTERACTIVE_SURFACE,
        "member-sig-type--expandable",
        expanded && "member-sig-type--expanded",
      )}
      title={expanded ? "Click to collapse" : type}
      aria-expanded={expanded}
      data-trace-key={indexed ? tokenKey : undefined}
      data-token-kind={indexed ? semantic : undefined}
      data-symbol-role={indexed ? "usage" : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setExpanded((open) => !open);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          setExpanded((open) => !open);
        }
      }}
      onMouseEnter={indexed ? onEnter : undefined}
      onMouseLeave={indexed ? onLeave : undefined}
      onFocus={indexed ? onFocus : undefined}
      onBlur={indexed ? onBlur : undefined}
    >
      {expanded ? (
        <span className="member-sig-type-lines">
          {lines.map((line, index) => renderType(line, `${index}`))}
        </span>
      ) : (
        renderType(short)
      )}
    </span>
  );
}
