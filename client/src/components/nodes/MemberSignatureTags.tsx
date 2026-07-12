import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { MemberSignatureParamChip } from "@/components/nodes/MemberSignatureParamChip";
import { MemberSignatureTypeLabel } from "@/components/nodes/MemberSignatureTypeLabel";
import type { MethodSignature } from "@/lib/parseMethodSignature";
import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";
import { cn } from "@/lib/utils";

const SIG_ICON_SIZE = 10;
const SIG_ICON_STROKE = 2;

type MemberSignatureTagsProps = {
  signature: MethodSignature;
  memberId: string;
  flowNodeId: string;
  graphNodeId: string;
  filePath: string;
  classLabel: string;
  symbolIndex: MemberSymbolIndex;
  className?: string;
};

export function MemberSignatureTags({
  signature,
  memberId,
  flowNodeId,
  graphNodeId,
  filePath,
  classLabel,
  symbolIndex,
  className,
}: MemberSignatureTagsProps) {
  const { params, returnType } = signature;
  if (params.length === 0 && !returnType) return null;

  return (
    <span
      className={cn(
        "member-signature-tags nodrag inline-flex min-w-0 flex-wrap items-center font-mono text-xs leading-none",
        className,
      )}
      aria-label="Method signature"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {params.length > 0 ? (
        <span className="member-sig-group member-sig-group--in">
          <span className="member-sig-kind-icon" aria-label="Inputs" title="Inputs">
            <ArrowDownToLine size={SIG_ICON_SIZE} strokeWidth={SIG_ICON_STROKE} aria-hidden />
          </span>
          {params.map((param, index) => (
            <span
              key={`${param.name}-${index}`}
              className="member-sig-value member-sig-value--in"
            >
              <span className="member-sig-binding">
                <MemberSignatureParamChip
                  paramName={param.name}
                  memberId={memberId}
                  flowNodeId={flowNodeId}
                  graphNodeId={graphNodeId}
                  filePath={filePath}
                  classLabel={classLabel}
                  symbolIndex={symbolIndex}
                  shimmerDelay={`-${((memberId.length + index) * 0.37).toFixed(2)}s`}
                />
                {param.type ? (
                  <span className="member-sig-colon" aria-hidden>
                    :
                  </span>
                ) : null}
              </span>
              {param.type ? (
                <MemberSignatureTypeLabel
                  type={param.type}
                  variant="in"
                  memberId={memberId}
                  flowNodeId={flowNodeId}
                  graphNodeId={graphNodeId}
                  filePath={filePath}
                  paramName={param.name}
                  symbolIndex={symbolIndex}
                  shimmerDelay={`-${((memberId.length + index + 1) * 0.37).toFixed(2)}s`}
                />
              ) : null}
            </span>
          ))}
        </span>
      ) : null}
      {returnType ? (
        <>
          {params.length > 0 ? <span className="member-sig-sep" aria-hidden /> : null}
          <span className="member-sig-group member-sig-group--out">
            <span className="member-sig-kind-icon" aria-label="Return" title="Return">
              <ArrowUpFromLine size={SIG_ICON_SIZE} strokeWidth={SIG_ICON_STROKE} aria-hidden />
            </span>
            <span className="member-sig-value member-sig-value--out">
              <MemberSignatureTypeLabel
                type={returnType}
                variant="out"
                memberId={memberId}
                flowNodeId={flowNodeId}
                graphNodeId={graphNodeId}
                filePath={filePath}
                shimmerDelay={`-${((memberId.length + params.length + 1) * 0.37).toFixed(2)}s`}
              />
            </span>
          </span>
        </>
      ) : null}
    </span>
  );
}
