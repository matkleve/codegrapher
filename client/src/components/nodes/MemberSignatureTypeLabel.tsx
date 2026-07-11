import { useState, type CSSProperties, type ReactNode } from "react";
import {
  isIndexedSignatureType,
  signatureTypeIsExpandable,
  signatureTypeLines,
  truncateSignatureType,
} from "@/lib/formatSignatureType";
import { useIndex } from "@/context/IndexContext";
import { INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { cn } from "@/lib/utils";

type MemberSignatureTypeLabelProps = {
  type: string;
  variant: "in" | "out";
  shimmerDelay?: string;
};

function SignatureTypeText({
  text,
  indexed,
  shimmerDelay,
}: {
  text: string;
  indexed: boolean;
  shimmerDelay?: string;
}) {
  if (!indexed) return text;
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
  shimmerDelay,
}: MemberSignatureTypeLabelProps) {
  const { hasSymbol } = useIndex();
  const [expanded, setExpanded] = useState(false);
  const indexed = isIndexedSignatureType(type, hasSymbol);
  const expandable = signatureTypeIsExpandable(type);
  const { short } = truncateSignatureType(type);
  const lines = signatureTypeLines(type);

  const className = cn(
    "member-sig-type",
    variant === "in" ? "member-sig-type--in" : "member-sig-type--out",
    indexed ? "member-sig-type--indexed" : "member-sig-type--primitive",
    indexed && "cursor-pointer",
    expandable && INTERACTIVE_SURFACE,
    expandable && "member-sig-type--expandable",
    expanded && "member-sig-type--expanded",
  );

  const renderText = (text: string): ReactNode => (
    <SignatureTypeText text={text} indexed={indexed} shimmerDelay={shimmerDelay} />
  );

  if (!expandable) {
    return <span className={className}>{renderText(type)}</span>;
  }

  return (
    <button
      type="button"
      className={className}
      title={expanded ? "Click to collapse" : type}
      aria-expanded={expanded}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        setExpanded((open) => !open);
      }}
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
