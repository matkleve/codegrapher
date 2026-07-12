import { describe, expect, it } from "vitest";
import { paramNameForSignatureType } from "@/lib/paramTypeAnchors";
import { buildLexicalGraph } from "@/lib/lexicalGraph";
import { traceSigTypeEdges } from "@/lib/traceEdgesForOrigin";
import { buildMemberSymbolIndex, paramDefForName } from "@/lib/localSymbolLinks";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

const FLOW = "flow:file:geo.ts";
const MEMBER = "method:file:Geo.extractFieldValue";

const CODE = `export function extractFieldValue(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  return addr.city;
}`;

describe("paramNameForSignatureType", () => {
  it("resolves param name for inline signature type tokens", () => {
    expect(
      paramNameForSignatureType("  result: GeocoderSearchResult,", "GeocoderSearchResult"),
    ).toBe("result");
  });

  it("ignores return types after closing paren", () => {
    expect(paramNameForSignatureType("): string | null {", "string")).toBeNull();
  });
});

describe("traceSigTypeEdges", () => {
  it("fans out from sig-type through param to lexical relatives", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, 10);
    const graph = buildLexicalGraph(index, CODE, 10);
    const sigEl = document.createElement("span");
    sigEl.dataset.traceKey = "sig-type";

    const classData: ClassNodeData = {
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

    const edges = traceSigTypeEdges({
      symbolName: "GeocoderSearchResult",
      typeKind: "type",
      sigTypeEl: sigEl,
      paramName: "result",
      symbolIndex: index,
      lexicalGraph: graph,
      methodCode: CODE,
      methodStartLine: 10,
      flowNodeId: FLOW,
      memberId: MEMBER,
      symbols: new Map(),
      graphData: null,
      getNode: () => ({
        id: FLOW,
        type: "class",
        position: { x: 0, y: 0 },
        data: classData,
      }),
      hasSymbol: () => false,
      edgeIdPrefix: "test",
    });

    expect(edges.some((e) => e.connectionKind === "typesetting")).toBe(true);
    expect(edges.some((e) => e.liveTo?.token === "city")).toBe(true);
    expect(paramDefForName(index, MEMBER, "result")).toBeTruthy();
  });
});
