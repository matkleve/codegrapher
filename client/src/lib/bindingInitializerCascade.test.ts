import { describe, expect, it } from "vitest";
import { buildBindingInitializerCascadeEdges } from "@/lib/bindingInitializerCascade";
import { buildMemberSymbolIndex } from "@/lib/localSymbolLinks";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeSigParamDefKey, makeUsageTokenKey } from "@/lib/traceKeys";
import { tokenizeLine } from "@/lib/tokenizeLine";
import type { SymbolEntry } from "@/types";

const MEMBER = "fn:file:extract";
const FLOW = "flow:file:helpers.ts";
const START = 52;

const CODE = `export function extractFieldValue(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  return addr;
}`;

describe("buildBindingInitializerCascadeEdges", () => {
  it("wires param result to its usage in result.address at hop 3", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, START);
    const declLine = "  const addr = result.address;";
    const tokens = tokenizeLine(declLine).tokens;
    const resultIdx = tokens.findIndex((t) => t.text === "result");
    const declFileLine = START + 4;

    const pane = document.createElement("div");
    pane.className = "graph-pane";

    const addrDefId = `local-def::${MEMBER}::local::addr::${declFileLine}`;
    const resultDefId = `local-def::${MEMBER}::param::result::${START + 1}`;

    const addrDef = document.createElement("span");
    addrDef.dataset.localDefId = addrDefId;
    registerTraceHost(addrDef);

    const resultParam = document.createElement("span");
    resultParam.dataset.traceKey = makeSigParamDefKey(FLOW, MEMBER, "result");
    resultParam.dataset.localDefId = resultDefId;
    registerTraceHost(resultParam);

    const resultUse = document.createElement("span");
    resultUse.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      MEMBER,
      declFileLine,
      resultIdx,
      "result",
    );
    resultUse.dataset.localTargetId = resultDefId;
    registerTraceHost(resultUse);

    pane.append(addrDef, resultParam, resultUse);
    document.body.appendChild(pane);

    const edges = buildBindingInitializerCascadeEdges({
      bindingDefEl: addrDef,
      symbolIndex: index,
      flowNodeId: FLOW,
      memberId: MEMBER,
      methodCode: CODE,
      methodStartLine: START,
      edgeIdPrefix: "test",
      symbols: new Map<string, SymbolEntry[]>([
        ["GeocoderSearchResult", [{ filePath: "/proj/types.ts", kind: "type", line: 1 }]],
      ]),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: (n) => n === "GeocoderSearchResult",
    });

    expect(edges.some((e) => e.hop === 3 && e.connectionKind !== "binding")).toBe(true);
    const resultWire = edges.find(
      (e) =>
        e.hop === 3 &&
        e.from.type === "element" &&
        (e.from as { el: HTMLElement }).el === resultParam,
    );
    expect(resultWire).toBeDefined();
    if (resultWire?.to.type === "element") {
      expect(resultWire.to.el).toBe(resultUse);
    }

    document.body.innerHTML = "";
  });
});
