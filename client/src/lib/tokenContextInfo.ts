import type { SemanticTokenKind } from "@/lib/tokenColors";

/** Context for the docked trace action bar (shown only when pinned). */
export type TokenInfoState = {
  token: string;
  kind: SemanticTokenKind;
  pinned: boolean;
  connectionCount: number;
  definedIn: string;
  filePath: string;
  line: number;
  sourceFlowId: string;
  sourceGraphNodeId: string;
  role: "definition" | "usage";
} | null;

export function makeTokenInfo(
  fields: Omit<NonNullable<TokenInfoState>, "pinned"> & { pinned: boolean },
): NonNullable<TokenInfoState> {
  return fields;
}
