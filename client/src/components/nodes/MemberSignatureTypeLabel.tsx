import { useRef, useState, type ReactNode } from "react";
import { TokenChip, type TokenChipHandle } from "@/components/code/TokenChip";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import { useMemberSignatureTypeTrace } from "@/hooks/useMemberSignatureTypeTrace";
import {
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
}: MemberSignatureTypeLabelProps) {
  const chipRef = useRef<TokenChipHandle>(null);
  const hostRef = useRef<HTMLButtonElement>(null);
  useTraceHostRegistration(hostRef);
  const [expanded, setExpanded] = useState(false);

  const {
    semantic,
    tokenKey,
    connectable,
    onEnter,
    onLeave,
    onPinClick,
  } = useMemberSignatureTypeTrace({
    type,
    memberId,
    flowNodeId,
    graphNodeId,
    filePath,
    chipRef,
    hostRef,
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

  const renderType = (text: string, key?: string): ReactNode =>
    connectable ? renderConnectableChip(text, key) : renderPlainType(text, key);

  if (!expandable) {
    return renderType(type);
  }

  return (
    <button
      ref={hostRef}
      type="button"
      className={cn(
        "member-sig-type member-sig-type-expand-host",
        connectable ? "member-sig-type--indexed" : primitiveTypeClassName(variant),
        INTERACTIVE_SURFACE,
        "member-sig-type--expandable",
        expanded && "member-sig-type--expanded",
      )}
      title={expanded ? "Click to collapse" : type}
      aria-expanded={expanded}
      data-trace-key={connectable ? tokenKey : undefined}
      data-token-kind={connectable ? semantic : undefined}
      data-symbol-role={connectable ? "usage" : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setExpanded((open) => !open);
      }}
      onMouseEnter={connectable ? onEnter : undefined}
      onMouseLeave={connectable ? onLeave : undefined}
    >
      {expanded ? (
        <span className="member-sig-type-lines">
          {lines.map((line, index) => renderType(line, `${index}`))}
        </span>
      ) : (
        renderType(short)
      )}
    </button>
  );
}
