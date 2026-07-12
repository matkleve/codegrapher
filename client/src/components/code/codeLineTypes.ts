import type { ControlFlowIndex } from "@/lib/controlFlowLinks";
import type { MemberSymbolIndex } from "@/lib/localSymbolLinks";

export type CodeLineProps = {
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
  methodStartLine?: number;
};
