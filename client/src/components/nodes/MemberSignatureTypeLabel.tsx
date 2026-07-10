import { useState } from "react";
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
};

export function MemberSignatureTypeLabel({ type, variant }: MemberSignatureTypeLabelProps) {
  const [expanded, setExpanded] = useState(false);
  const expandable = signatureTypeIsExpandable(type);
  const { short } = truncateSignatureType(type);
  const lines = signatureTypeLines(type);

  const className = cn(
    "member-sig-type",
    variant === "in" ? "member-sig-type--in" : "member-sig-type--out",
    expandable && INTERACTIVE_SURFACE,
    expandable && "member-sig-type--expandable",
    expanded && "member-sig-type--expanded",
  );

  if (!expandable) {
    return <span className={className}>{type}</span>;
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
              {line}
            </span>
          ))}
        </span>
      ) : (
        short
      )}
    </button>
  );
}
