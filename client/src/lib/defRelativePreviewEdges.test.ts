import { describe, expect, it } from "vitest";
import { buildMemberSymbolIndex, paramDefForName } from "@/lib/localSymbolLinks";
import { buildDefRelativePreviewEdges } from "@/lib/defRelativePreviewEdges";
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

describe("buildDefRelativePreviewEdges", () => {
  it("walks param → binding → member-access relatives via symbol index", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, 10);
    const paramDef = paramDefForName(index, MEMBER, "result");
    expect(paramDef).toBeTruthy();

    const originEl = document.createElement("span");
    originEl.dataset.localDefId = paramDef!.defId;

    const edges = buildDefRelativePreviewEdges({
      originDefId: paramDef!.defId,
      originEl,
      symbolIndex: index,
      methodCode: CODE,
      methodStartLine: 10,
      flowNodeId: FLOW,
      memberId: MEMBER,
      classData: CLASS_DATA,
      kind: "variable",
      edgeIdPrefix: "test",
    });

    const addrDefId = [...index.defSites.values()].find((id) => id.includes("::local::addr::"));
    expect(addrDefId).toBeDefined();

    const bindingEdge = edges.find((e) => e.id.includes("chain-b-"));
    expect(bindingEdge).toBeDefined();
    expect(bindingEdge?.hop).toBe(2);

    const cityEdge = edges.find((e) => e.liveTo?.token === "city");
    expect(cityEdge).toBeDefined();
    expect(cityEdge?.hop).toBe(3);
    expect(cityEdge?.liveTo?.token).toBe("city");
  });
});
