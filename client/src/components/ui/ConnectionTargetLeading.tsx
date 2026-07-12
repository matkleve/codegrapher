import { VscodeFileIcon } from "@/components/VscodeFileIcon";
import { SemanticConnectionDot } from "@/components/ui/InteractiveListRow";
import type { SemanticTokenKind } from "@/lib/tokenColors";

type ConnectionTargetLeadingProps = {
  kind: SemanticTokenKind;
  size?: number;
};

/** Kind dot + TS file icon — shared leading slot for connection/load menu rows. */
export function ConnectionTargetLeading({
  kind,
  size = 14,
}: ConnectionTargetLeadingProps) {
  return (
    <>
      <SemanticConnectionDot kind={kind} />
      <VscodeFileIcon icon="file-type-typescript-official" size={size} />
    </>
  );
}
