import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { assembleCodeLinePreviewEdges } from "@/lib/codeLineTraceEdges";
import { buildMemberSymbolIndex } from "@/lib/localSymbolLinks";
import { buildControlFlowIndex } from "@/lib/controlFlowLinks";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import { templateInterpolationSites } from "@/lib/templateInterpolations";
import { tokenizeLine } from "@/lib/tokenizeLine";

const MEMBER = "fn:file:buildViewbox";
const FLOW = "flow:file:geo.ts";
const START = 41;

const CODE = `export function buildViewbox(lat: number, lng: number): string {
  const delta = 0.1;
  return \`\${lng - delta},\${lat + delta},\${lng + delta},\${lat - delta}\`;
}`;

describe("assembleCodeLinePreviewEdges", () => {
  beforeEach(() => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns local usage wires for param hover in expanded body", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE, START);
    const lngDefId = `local-def::${MEMBER}::param::lng::${START}`;

    const sigLine = CODE.split("\n")[0]!;
    const lngParamIndex = tokenizeLine(sigLine).tokens.findIndex((t) => t.text === "lng");
    const returnSites = templateInterpolationSites(CODE.split("\n")[2]!);
    const lngUseIndex = returnSites[0]!.tokenIndex;

    const def = document.createElement("span");
    def.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, START, lngParamIndex, "lng");
    def.dataset.localDefId = lngDefId;
    registerTraceHost(def);
    document.querySelector(".graph-pane")!.appendChild(def);

    const use = document.createElement("span");
    use.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, START + 2, lngUseIndex, "lng");
    use.dataset.localTargetId = lngDefId;
    registerTraceHost(use);
    document.querySelector(".graph-pane")!.appendChild(use);

    const edges = assembleCodeLinePreviewEdges({
      name: "lng",
      chipEl: def,
      kind: "variable",
      tokenIndex: 0,
      edgeKey: "test-lng",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(MEMBER, CODE, START),
      sourceFlowId: FLOW,
      memberId: MEMBER,
      lineNumber: START,
      symbols: new Map(),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    expect(edges.length).toBeGreaterThanOrEqual(1);
    expect(edges[0]?.from.type).toBe("element");
    expect(edges[0]?.to.type).toBe("element");
  });

  it("skips control-flow wires when a local lexical trace is primary on a condition token", () => {
    const IF_MEMBER = "fn:file:check";
    const IF_FLOW = "flow:file:check.ts";
    const IF_START = 1;
    const IF_CODE = `export function check(addr: string | null) {
  if (!addr) {
    return null;
  }
}`;
    const index = buildMemberSymbolIndex(IF_MEMBER, IF_CODE, IF_START);
    const cfIndex = buildControlFlowIndex(IF_MEMBER, IF_CODE, IF_START);
    const addrDefId = `local-def::${IF_MEMBER}::param::addr::${IF_START}`;

    const ifLine = IF_CODE.split("\n")[1]!;
    const addrCondIdx = tokenizeLine(ifLine).tokens.findIndex((t) => t.text === "addr");

    const pane = document.querySelector(".graph-pane")!;

    const def = document.createElement("span");
    def.dataset.localDefId = addrDefId;
    def.dataset.traceKey = makeUsageTokenKey(IF_FLOW, IF_MEMBER, IF_START, 0, "addr");
    registerTraceHost(def);
    pane.appendChild(def);

    const use = document.createElement("span");
    use.dataset.localTargetId = addrDefId;
    use.dataset.traceKey = makeUsageTokenKey(
      IF_FLOW,
      IF_MEMBER,
      IF_START + 1,
      addrCondIdx,
      "addr",
    );
    registerTraceHost(use);
    pane.appendChild(use);

    const condEdges = assembleCodeLinePreviewEdges({
      name: "addr",
      chipEl: use,
      kind: "variable",
      tokenIndex: addrCondIdx,
      edgeKey: "test-addr-cond",
      symbolIndex: index,
      controlFlowIndex: cfIndex,
      sourceFlowId: IF_FLOW,
      memberId: IF_MEMBER,
      lineNumber: IF_START + 1,
      symbols: new Map(),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    expect(condEdges.some((e) => e.connectionKind === "branch")).toBe(false);
    expect(condEdges.length).toBeGreaterThanOrEqual(1);
  });
});
