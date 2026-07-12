import { describe, expect, it } from "vitest";
import { buildBindingInitializerCascadeEdges } from "@/lib/bindingInitializerCascade";
import { registerTraceHost } from "@/lib/elementRegistry";
import { buildMemberSymbolIndex, bindingInitFor } from "@/lib/localSymbolLinks";
import { typeTokenIndexOnParamSignature } from "@/lib/paramTypeAnchors";
import { makeSigParamDefKey, makeUsageTokenKey } from "@/lib/traceKeys";
import { tokenizeLine } from "@/lib/tokenizeLine";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { Node } from "@xyflow/react";
import type { SymbolEntry } from "@/types";

const FLOW = "flow:file:svc.ts";
const MEMBER = "fn:svc:filter";

describe("buildBindingInitializerCascadeEdges", () => {
  it("does not cascade member-access bindings (addr = result.address)", () => {
    const index = buildMemberSymbolIndex(
      MEMBER,
      `filter(results: SearchResult[]): void {
  const addr = result.address;
}`,
    );
    const addrDef = document.createElement("span");
    addrDef.dataset.localDefId = [...index.defSites.values()].find((id) =>
      id.includes("::local::addr::"),
    );

    const edges = buildBindingInitializerCascadeEdges({
      bindingDefEl: addrDef!,
      symbolIndex: index,
      flowNodeId: FLOW,
      memberId: MEMBER,
      methodCode: "",
      methodStartLine: 1,
      edgeIdPrefix: "test",
      symbols: new Map(),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: () => false,
    });
    expect(edges).toEqual([]);
  });

  it("cascades for-of bindings through the param and sig-type chain", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);

    const METHOD = `filterAndMap(results: GeocoderSearchResult[]): void {
  for (const result of results) {
    void result;
  }
}`;
    const START = 135;
    const index = buildMemberSymbolIndex(MEMBER, METHOD, START);

    const loopLine = "  for (const result of results) {";
    const loopLineNumber = START + 1;
    const tokens = tokenizeLine(loopLine).tokens;
    const resultsIdx = tokens.findIndex(
      (t) => t.kind === "identifier" && t.text === "results",
    );

    const resultDefId = [...index.defSites.values()].find((id) =>
      id.includes("::local::result::"),
    )!;
    expect(bindingInitFor(index, resultDefId)).toEqual({
      lineNumber: loopLineNumber,
      tokenIndex: resultsIdx,
      token: "results",
    });

    const resultDef = document.createElement("span");
    resultDef.dataset.localDefId = resultDefId;
    pane.appendChild(resultDef);

    const resultsParamDef = document.createElement("span");
    resultsParamDef.dataset.traceKey = makeSigParamDefKey(FLOW, MEMBER, "results");
    resultsParamDef.dataset.localDefId = `local-def::${MEMBER}::param::results::${START}`;
    pane.appendChild(resultsParamDef);
    registerTraceHost(resultsParamDef);

    const resultsUsage = document.createElement("span");
    resultsUsage.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      MEMBER,
      loopLineNumber,
      resultsIdx,
      "results",
    );
    pane.appendChild(resultsUsage);
    registerTraceHost(resultsUsage);

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "member-body-wrap";
    pane.appendChild(bodyWrap);

    const sigLine = METHOD.split("\n")[0]!;
    const typeIdx = typeTokenIndexOnParamSignature(
      sigLine,
      "results",
      "GeocoderSearchResult",
    )!;
    const sigType = document.createElement("span");
    sigType.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      MEMBER,
      START,
      typeIdx,
      "GeocoderSearchResult",
    );
    bodyWrap.appendChild(sigType);
    registerTraceHost(sigType);

    const classNode = (): Node => ({
      id: FLOW,
      type: "class",
      position: { x: 0, y: 0 },
      data: {
        label: "Svc",
        fileName: "svc.ts",
        filePath: "/proj/svc.ts",
        graphNodeId: "class:svc",
        nodeKind: "class",
        properties: [],
        methods: [
          {
            id: MEMBER,
            label: "filter And Map",
            symbolName: "filterAndMap",
            code: METHOD,
            startLine: START,
          },
        ],
        expandedPropertyIds: [],
        expandedMethodIds: [MEMBER],
        propertiesSectionCollapsed: false,
        methodsSectionCollapsed: false,
        collapsed: false,
        pinnedMemberIds: [],
      } satisfies ClassNodeData,
    });

    const symbols = new Map<string, SymbolEntry[]>([
      [
        "GeocoderSearchResult",
        [{ filePath: "/proj/types.ts", kind: "type", line: 1 }],
      ],
    ]);

    const edges = buildBindingInitializerCascadeEdges({
      bindingDefEl: resultDef,
      symbolIndex: index,
      flowNodeId: FLOW,
      memberId: MEMBER,
      methodCode: METHOD,
      methodStartLine: START,
      edgeIdPrefix: "test",
      symbols,
      graphData: null,
      getNode: classNode,
      hasSymbol: (name) => name === "GeocoderSearchResult",
    });

    expect(edges.length).toBeGreaterThanOrEqual(2);
    expect(edges[0]?.hop).toBe(3);
    expect((edges[0]?.from as { el: HTMLElement }).el).toBe(resultsParamDef);
    expect((edges[0]?.to as { el: HTMLElement }).el).toBe(resultsUsage);
    expect(
      edges.some((e) => e.connectionKind === "typesetting" && e.hop === 3),
    ).toBe(true);
    expect(edges.some((e) => e.load != null)).toBe(true);

    document.body.innerHTML = "";
  });
});
