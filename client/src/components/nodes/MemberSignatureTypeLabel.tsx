import { useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  const [expanded, setExpanded] = useState(false);

  const {
    symbolName,
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

  const traceHover = connectable
    ? { onMouseEnter: onEnter, onMouseLeave: onLeave }
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
      <span className={className} {...traceHover}>
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
      {...traceHover}
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
