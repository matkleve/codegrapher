import { ConnectionTargetLeading } from "@/components/ui/ConnectionTargetLeading";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { fileBaseName } from "@/lib/loadTargets";
import type { CallSiteReference } from "@/lib/projectReferences";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import type { TokenReference } from "@/lib/semanticLookup";

type TokenContextBarListProps = {
  isDefinition: boolean;
  kind: SemanticTokenKind;
  callSites: CallSiteReference[];
  graphRefs: TokenReference[];
  externalRefs: TokenReference[];
  onLoadTarget: (filePath: string) => void;
  onFocusFlowNode: (flowNodeId: string) => void;
  onClearTokenInfo: () => void;
};

export function TokenContextBarList({
  isDefinition,
  kind,
  callSites,
  graphRefs,
  externalRefs,
  onLoadTarget,
  onFocusFlowNode,
  onClearTokenInfo,
}: TokenContextBarListProps) {
  return (
    <ul className="flex flex-col gap-0.5">
      {isDefinition
        ? callSites.map((site, idx) => (
            <li key={`c-${site.filePath}-${site.line}-${idx}`}>
              <InteractiveListRow
                title={fileBaseName(site.filePath)}
                subtitle={`line ${site.line}${site.inGraph ? " · on canvas" : ""}`}
                leading={<ConnectionTargetLeading kind={kind} />}
                onClick={() => onLoadTarget(site.filePath)}
              />
            </li>
          ))
        : null}
      {!isDefinition
        ? graphRefs.map((ref, idx) => (
            <li key={`g-${ref.filePath}-${ref.line}-${idx}`}>
              <InteractiveListRow
                title={
                  ref.memberLabel
                    ? `${ref.classLabel} → ${ref.memberLabel}`
                    : ref.classLabel
                }
                subtitle={`line ${ref.line}`}
                leading={<ConnectionTargetLeading kind={ref.kind} />}
                onClick={() => {
                  onClearTokenInfo();
                  onFocusFlowNode(ref.flowNodeId!);
                }}
              />
            </li>
          ))
        : null}
      {!isDefinition
        ? externalRefs.map((ref, idx) => (
            <li key={`x-${ref.filePath}-${ref.line}-${idx}`}>
              <InteractiveListRow
                title={ref.classLabel}
                subtitle={`line ${ref.line}`}
                leading={<ConnectionTargetLeading kind={ref.kind} />}
                onClick={() => onLoadTarget(ref.filePath)}
              />
            </li>
          ))
        : null}
    </ul>
  );
}
