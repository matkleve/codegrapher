import { describe, expect, it } from "vitest";
import { buildBackwardLexicalRelatives } from "@/lib/defRelativePreviewEdges";
import { buildMemberSymbolIndex, paramDefForName } from "@/lib/localSymbolLinks";
import { tokenizeLine } from "@/lib/tokenizeLine";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

const FLOW = "flow:file:geo.ts";
const MEMBER = "method:file:Geo.extractFieldValue";

const CODE = `export function extractFieldValue(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  if (!addr) return null;
  return addr.city;
}`;

const CLASS_DATA: ClassNodeData = {
  label: "Geo",
  filePath: "/geo.ts",
  expandedMethodIds: [MEMBER],
  methods: [
    {
      id: MEMBER,
      label: "extractFieldValue",
      symbolName: "extractFieldValue",
      code: CODE,
      startLine: 10,
    },
  ],
  properties: [],
};

describe("buildBackwardLexicalRelatives", () => {
  it("walks upstream from addr.city through binding to result param", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, 10);
    const paramDef = paramDefForName(index, MEMBER, "result");
    expect(paramDef).toBeTruthy();

    const returnLine = "  return addr.city;";
    const returnLineNumber = 16;
    const tokens = tokenizeLine(returnLine).tokens;
    const cityIdx = tokens.findIndex(
      (t, i) => t.kind === "identifier" && t.text === "city" && tokens[i - 1]?.text === ".",
    );
    expect(cityIdx).toBeGreaterThan(-1);

    const originEl = document.createElement("span");
    originEl.dataset.symbolName = "city";

    const edges = buildBackwardLexicalRelatives({
      originEl,
      symbolIndex: index,
      methodCode: CODE,
      methodStartLine: 10,
      flowNodeId: FLOW,
      memberId: MEMBER,
      classData: CLASS_DATA,
      kind: "variable",
      edgeIdPrefix: "test-back",
      startLine: returnLineNumber,
      startTokenIndex: cityIdx,
    });

    const tokensHit = edges.map((e) => e.liveTo?.token);
    expect(tokensHit).toContain("addr");
    expect(tokensHit).toContain("result");
    expect(edges.some((e) => e.liveTo?.role === "definition" && e.liveTo?.token === "result")).toBe(
      true,
    );
  });
});
