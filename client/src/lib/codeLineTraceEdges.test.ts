import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { assembleCodeLinePreviewEdges } from "@/lib/codeLineTraceEdges";
import { buildMemberSymbolIndex } from "@/lib/localSymbolLinks";
import { buildControlFlowIndex } from "@/lib/controlFlowLinks";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeControlFlowKey, makeUsageTokenKey } from "@/lib/traceKeys";
import { templateInterpolationSites } from "@/lib/templateInterpolations";
import { tokenizeLine } from "@/lib/tokenizeLine";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { Node } from "@xyflow/react";

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

  it("includes control-flow branch wires alongside local usage on a condition token", () => {
    const SWITCH_MEMBER = "method:file:Svc.extractFieldValue";
    const SWITCH_FLOW = "flow:file:order.ts";
    const SWITCH_START = 10;
    const SWITCH_CODE = `extractFieldValue(field: string): string | null {
  switch (field) {
    case 'city':
      return null;
    case 'district':
      return null;
  }
}`;
    const index = buildMemberSymbolIndex(SWITCH_MEMBER, SWITCH_CODE, SWITCH_START);
    const cfIndex = buildControlFlowIndex(SWITCH_MEMBER, SWITCH_CODE, SWITCH_START);
    const fieldDefId = `local-def::${SWITCH_MEMBER}::param::field::${SWITCH_START}`;

    const switchLine = SWITCH_CODE.split("\n")[1]!;
    const fieldCondIdx = tokenizeLine(switchLine).tokens.findIndex((t) => t.text === "field");
    const switchLineNo = SWITCH_START + 1;

    const pane = document.querySelector(".graph-pane")!;

    const def = document.createElement("span");
    def.dataset.localDefId = fieldDefId;
    def.dataset.traceKey = makeUsageTokenKey(
      SWITCH_FLOW,
      SWITCH_MEMBER,
      SWITCH_START,
      tokenizeLine(SWITCH_CODE.split("\n")[0]!).tokens.findIndex((t) => t.text === "field"),
      "field",
    );
    registerTraceHost(def);
    pane.appendChild(def);

    const use = document.createElement("span");
    use.dataset.localTargetId = fieldDefId;
    use.dataset.traceKey = makeUsageTokenKey(
      SWITCH_FLOW,
      SWITCH_MEMBER,
      switchLineNo,
      fieldCondIdx,
      "field",
    );
    registerTraceHost(use);
    pane.appendChild(use);

    for (const line of SWITCH_CODE.split("\n")) {
      if (!line.includes("case")) continue;
      const lineNo = SWITCH_START + SWITCH_CODE.split("\n").indexOf(line);
      const caseIdx = tokenizeLine(line).tokens.findIndex((t) => t.text === "case");
      const branch = document.createElement("span");
      branch.dataset.traceKey = makeControlFlowKey(
        SWITCH_FLOW,
        SWITCH_MEMBER,
        lineNo,
        caseIdx,
      );
      pane.appendChild(branch);
    }

    const condEdges = assembleCodeLinePreviewEdges({
      name: "field",
      chipEl: use,
      kind: "variable",
      tokenIndex: fieldCondIdx,
      edgeKey: "test-field-cond",
      symbolIndex: index,
      controlFlowIndex: cfIndex,
      sourceFlowId: SWITCH_FLOW,
      memberId: SWITCH_MEMBER,
      lineNumber: switchLineNo,
      symbols: new Map(),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    expect(condEdges.some((e) => e.connectionKind === "usage" || e.kind === "variable")).toBe(
      true,
    );
    expect(condEdges.some((e) => e.connectionKind === "branch")).toBe(true);
    expect(condEdges.length).toBeGreaterThanOrEqual(3);
  });

  it("includes type cascade when hovering inline signature param def", () => {
    const EXTRACT_MEMBER = "fn:order:extract";
    const EXTRACT_FLOW = "flow:file:order.ts";
    const PARAM = "result";
    const TYPE = "GeocoderSearchResult";
    const START = 53;
    const EXTRACT_CODE = `extractFieldValue(${PARAM}: ${TYPE}, field: string): string | null {
  return ${PARAM}.address;
}`;
    const classNode = (): Node => {
      const data: ClassNodeData = {
        label: "OrderService",
        fileName: "order.ts",
        filePath: "/proj/order.ts",
        graphNodeId: "class:order",
        nodeKind: "class",
        properties: [],
        methods: [
          {
            id: EXTRACT_MEMBER,
            label: "extract Field Value",
            symbolName: "extractFieldValue",
            code: EXTRACT_CODE,
            startLine: START,
          },
        ],
        expandedPropertyIds: [],
        expandedMethodIds: [EXTRACT_MEMBER],
        collapsed: false,
      };
      return { id: EXTRACT_FLOW, type: "class", data, position: { x: 0, y: 0 } };
    };
    const index = buildMemberSymbolIndex(EXTRACT_MEMBER, EXTRACT_CODE, START);
    const paramDefId = `local-def::${EXTRACT_MEMBER}::param::${PARAM}::${START}`;

    const pane = document.querySelector(".graph-pane")!;
    const bodyWrap = document.createElement("div");
    bodyWrap.className = "member-body-wrap";
    pane.appendChild(bodyWrap);

    const sigLine = EXTRACT_CODE.split("\n")[0]!;
    const paramTokenIndex = tokenizeLine(sigLine).tokens.findIndex((t) => t.text === PARAM);
    const typeTokenIndex = tokenizeLine(sigLine).tokens.findIndex((t) => t.text === TYPE);

    const def = document.createElement("span");
    def.dataset.traceKey = makeUsageTokenKey(
      EXTRACT_FLOW,
      EXTRACT_MEMBER,
      START,
      paramTokenIndex,
      PARAM,
    );
    def.dataset.localDefId = paramDefId;
    bodyWrap.appendChild(def);
    registerTraceHost(def);

    const sigType = document.createElement("span");
    sigType.dataset.traceKey = makeUsageTokenKey(
      EXTRACT_FLOW,
      EXTRACT_MEMBER,
      START,
      typeTokenIndex,
      TYPE,
    );
    sigType.dataset.tokenKind = "type";
    bodyWrap.appendChild(sigType);
    registerTraceHost(sigType);

    const useLine = EXTRACT_CODE.split("\n")[1]!;
    const useIndex = tokenizeLine(useLine).tokens.findIndex((t) => t.text === PARAM);
    const use = document.createElement("span");
    use.dataset.traceKey = makeUsageTokenKey(
      EXTRACT_FLOW,
      EXTRACT_MEMBER,
      START + 1,
      useIndex,
      PARAM,
    );
    use.dataset.localTargetId = paramDefId;
    bodyWrap.appendChild(use);
    registerTraceHost(use);

    const edges = assembleCodeLinePreviewEdges({
      name: PARAM,
      chipEl: def,
      kind: "variable",
      tokenIndex: paramTokenIndex,
      edgeKey: "test-result-def",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(EXTRACT_MEMBER, EXTRACT_CODE, START),
      sourceFlowId: EXTRACT_FLOW,
      memberId: EXTRACT_MEMBER,
      lineNumber: START,
      symbols: new Map([[TYPE, [{ filePath: "/proj/geo.ts", kind: "type", line: 1 }]]]),
      graphData: null,
      getNode: classNode,
      hasSymbol: (name) => name === TYPE,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    const cascade = edges.filter(
      (e) => e.connectionKind === "typesetting" || e.load != null,
    );
    expect(cascade).toHaveLength(2);
    expect(cascade[0]?.connectionKind).toBe("typesetting");
    expect(cascade[1]?.load?.filePath).toBe("/proj/geo.ts");
  });

  it("keeps param local wire when hovering spread initializer prev", () => {
    const MEMBER = "fn:file:merge";
    const FLOW = "flow:file:merge.ts";
    const START = 7;
    const CODE = `merge(prev: Record<string, string>): Record<string, string> {
  const next = { ...prev };
  return next;
}`;
    const index = buildMemberSymbolIndex(MEMBER, CODE, START);
    const prevParamDefId = `local-def::${MEMBER}::param::prev::${START}`;
    const nextDefId = [...index.defSites.values()].find((id) => id.includes("::local::next::"))!;

    const pane = document.querySelector(".graph-pane")!;
    const bodyWrap = document.createElement("div");
    bodyWrap.className = "member-body-wrap";
    pane.appendChild(bodyWrap);

    const spreadLine = CODE.split("\n")[1]!;
    const prevSpreadIndex = tokenizeLine(spreadLine).tokens.findIndex((t) => t.text === "prev");

    const paramDef = document.createElement("span");
    paramDef.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, START, 0, "prev");
    paramDef.dataset.localDefId = prevParamDefId;
    bodyWrap.appendChild(paramDef);
    registerTraceHost(paramDef);

    const nextDef = document.createElement("span");
    nextDef.dataset.localDefId = nextDefId;
    bodyWrap.appendChild(nextDef);

    const spreadPrev = document.createElement("span");
    spreadPrev.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      MEMBER,
      START + 1,
      prevSpreadIndex,
      "prev",
    );
    spreadPrev.dataset.localTargetId = prevParamDefId;
    bodyWrap.appendChild(spreadPrev);
    registerTraceHost(spreadPrev);

    const edges = assembleCodeLinePreviewEdges({
      name: "prev",
      chipEl: spreadPrev,
      kind: "variable",
      tokenIndex: prevSpreadIndex,
      edgeKey: "test-spread-prev",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(MEMBER, CODE, START),
      sourceFlowId: FLOW,
      memberId: MEMBER,
      lineNumber: START + 1,
      methodCode: CODE,
      methodStartLine: START,
      symbols: new Map(),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    const local = edges.filter((e) => !e.connectionKind || e.connectionKind === "usage");
    const binding = edges.filter((e) => e.connectionKind === "binding");
    expect(local.length).toBeGreaterThanOrEqual(1);
    expect(binding.length).toBeGreaterThanOrEqual(1);
    expect(local.some((e) => e.hop == null || e.hop === 1)).toBe(true);
  });

  it("chains param-def hover down the lexical tree like sig-type hover", () => {
    const EXTRACT_MEMBER = "method:file:Geo.extractFieldValue";
    const EXTRACT_CODE = `export function extractFieldValue(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  if (!addr) return null;
  return addr.city;
}`;
    const EXTRACT_START = 52;
    const index = buildMemberSymbolIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START);
    const paramDef = [...index.defSites.entries()].find(([, id]) =>
      id.includes("::param::result::"),
    );
    expect(paramDef).toBeTruthy();

    const pane = document.querySelector(".graph-pane")!;
    const resultDef = document.createElement("span");
    resultDef.dataset.localDefId = paramDef![1];
    pane.appendChild(resultDef);

    const resultUse = document.createElement("span");
    resultUse.dataset.localTargetId = paramDef![1];
    pane.appendChild(resultUse);

    const classData: ClassNodeData = {
      label: "Geo",
      filePath: "/geo.ts",
      expandedMethodIds: [EXTRACT_MEMBER],
      methods: [
        {
          id: EXTRACT_MEMBER,
          label: "extractFieldValue",
          symbolName: "extractFieldValue",
          code: EXTRACT_CODE,
          startLine: EXTRACT_START,
        },
      ],
      properties: [],
    };

    const edges = assembleCodeLinePreviewEdges({
      name: "result",
      chipEl: resultDef,
      kind: "variable",
      tokenIndex: 0,
      edgeKey: "test-result-param",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START),
      sourceFlowId: FLOW,
      memberId: EXTRACT_MEMBER,
      lineNumber: EXTRACT_START + 1,
      methodCode: EXTRACT_CODE,
      methodStartLine: EXTRACT_START,
      symbols: new Map(),
      graphData: null,
      getNode: () =>
        ({
          id: FLOW,
          type: "class",
          position: { x: 0, y: 0 },
          data: classData,
        }) as Node,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    expect(edges.some((e) => e.id.includes("chain-b-"))).toBe(true);
    expect(edges.some((e) => e.liveTo?.token === "city")).toBe(true);
  });

  it("chains binding initializer hover down to member-access relatives", () => {
    const EXTRACT_MEMBER = "method:file:Geo.extractFieldValue";
    const EXTRACT_CODE = `export function extractFieldValue(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  if (!addr) return null;
  return addr.city;
}`;
    const EXTRACT_START = 52;
    const index = buildMemberSymbolIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START);
    const declLine = EXTRACT_CODE.split("\n")[4]!;
    const declLineNo = EXTRACT_START + 4;
    const tokens = tokenizeLine(declLine).tokens;
    const addressIdx = tokens.findIndex(
      (t, i) => t.kind === "identifier" && t.text === "address" && tokens[i - 1]?.text === ".",
    );
    const addrDefId = [...index.defSites.values()].find((id) => id.includes("::local::addr::"))!;
    expect(addressIdx).toBeGreaterThan(-1);

    const pane = document.querySelector(".graph-pane")!;

    const addressEl = document.createElement("span");
    addressEl.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      EXTRACT_MEMBER,
      declLineNo,
      addressIdx,
      "address",
    );
    pane.appendChild(addressEl);

    const addrDefEl = document.createElement("span");
    addrDefEl.dataset.localDefId = addrDefId;
    pane.appendChild(addrDefEl);

    const classData: ClassNodeData = {
      label: "Geo",
      filePath: "/geo.ts",
      expandedMethodIds: [EXTRACT_MEMBER],
      methods: [
        {
          id: EXTRACT_MEMBER,
          label: "extractFieldValue",
          symbolName: "extractFieldValue",
          code: EXTRACT_CODE,
          startLine: EXTRACT_START,
        },
      ],
      properties: [],
    };

    const edges = assembleCodeLinePreviewEdges({
      name: "address",
      chipEl: addressEl,
      kind: "variable",
      tokenIndex: addressIdx,
      edgeKey: "test-address-init",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START),
      sourceFlowId: FLOW,
      memberId: EXTRACT_MEMBER,
      lineNumber: declLineNo,
      methodCode: EXTRACT_CODE,
      methodStartLine: EXTRACT_START,
      symbols: new Map(),
      graphData: null,
      getNode: () =>
        ({
          id: FLOW,
          type: "class",
          position: { x: 0, y: 0 },
          data: classData,
        }) as Node,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    expect(edges.some((e) => e.connectionKind === "binding")).toBe(true);
    expect(edges.some((e) => e.id.includes("chain-p-") && e.liveTo?.token === "city")).toBe(true);
    const cityEdge = edges.find((e) => e.liveTo?.token === "city");
    expect(cityEdge?.hop).toBe(3);
  });

  it("wires sig-type provenance when backward walk reaches a param", () => {
    const EXTRACT_MEMBER = "method:file:Geo.extractFieldValue";
    const TYPE = "GeocoderSearchResult";
    const EXTRACT_CODE = `export function extractFieldValue(
  result: ${TYPE},
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  if (!addr) return null;
  return addr.city;
}`;
    const EXTRACT_START = 52;
    const index = buildMemberSymbolIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START);
    const declLine = EXTRACT_CODE.split("\n")[4]!;
    const declLineNo = EXTRACT_START + 4;
    const tokens = tokenizeLine(declLine).tokens;
    const addressIdx = tokens.findIndex(
      (t, i) => t.kind === "identifier" && t.text === "address" && tokens[i - 1]?.text === ".",
    );
    const paramDefId = [...index.defSites.values()].find((id) => id.includes("::param::result::"))!;
    const typeLine = EXTRACT_CODE.split("\n")[1]!;
    const typeIdx = tokenizeLine(typeLine).tokens.findIndex((t) => t.text === TYPE);
    const typeLineNo = EXTRACT_START + 1;

    const pane = document.querySelector(".graph-pane")!;
    const bodyWrap = document.createElement("div");
    bodyWrap.className = "member-body-wrap";
    pane.appendChild(bodyWrap);

    const addressEl = document.createElement("span");
    addressEl.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      EXTRACT_MEMBER,
      declLineNo,
      addressIdx,
      "address",
    );
    bodyWrap.appendChild(addressEl);
    registerTraceHost(addressEl);

    const paramDefEl = document.createElement("span");
    paramDefEl.dataset.localDefId = paramDefId;
    bodyWrap.appendChild(paramDefEl);
    registerTraceHost(paramDefEl);

    const sigTypeEl = document.createElement("span");
    sigTypeEl.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      EXTRACT_MEMBER,
      typeLineNo,
      typeIdx,
      TYPE,
    );
    sigTypeEl.dataset.tokenKind = "type";
    bodyWrap.appendChild(sigTypeEl);
    registerTraceHost(sigTypeEl);

    const classData: ClassNodeData = {
      label: "Geo",
      filePath: "/geo.ts",
      expandedMethodIds: [EXTRACT_MEMBER],
      methods: [
        {
          id: EXTRACT_MEMBER,
          label: "extractFieldValue",
          symbolName: "extractFieldValue",
          code: EXTRACT_CODE,
          startLine: EXTRACT_START,
        },
      ],
      properties: [],
    };

    const edges = assembleCodeLinePreviewEdges({
      name: "address",
      chipEl: addressEl,
      kind: "variable",
      tokenIndex: addressIdx,
      edgeKey: "test-address-type-up",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START),
      sourceFlowId: FLOW,
      memberId: EXTRACT_MEMBER,
      lineNumber: declLineNo,
      methodCode: EXTRACT_CODE,
      methodStartLine: EXTRACT_START,
      symbols: new Map([[TYPE, [{ filePath: "/proj/geo.ts", kind: "type", line: 1 }]]]),
      graphData: null,
      getNode: () =>
        ({
          id: FLOW,
          type: "class",
          position: { x: 0, y: 0 },
          data: classData,
        }) as Node,
      hasSymbol: (name) => name === TYPE,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    const typeEdges = edges.filter(
      (e) => e.connectionKind === "typesetting" || e.id.includes("up-type-result"),
    );
    expect(typeEdges.some((e) => e.connectionKind === "typesetting")).toBe(true);
    expect(typeEdges.find((e) => e.connectionKind === "typesetting")?.hop).toBe(2);
  });

  it("binds field init -> value and does not cascade param chain from value usage", () => {
    const EXTRACT_MEMBER = "method:file:Geo.extractFieldValue";
    const EXTRACT_CODE = `extractFieldValue(field: AddressFieldKind): string | null {
  const value = extractFieldValue(result, field);
  return value;
}`;
    const EXTRACT_START = 10;
    const index = buildMemberSymbolIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START);
    const fieldParam = [...index.defSites.entries()].find(([, id]) =>
      id.includes("::param::field::"),
    )!;
    const valueDefId = [...index.defSites.values()].find((id) => id.includes("::local::value::"))!;
    const constLine = EXTRACT_CODE.split("\n")[1]!;
    const returnLine = EXTRACT_CODE.split("\n")[2]!;
    const constLineNo = EXTRACT_START + 1;
    const returnLineNo = EXTRACT_START + 2;
    const fieldIdx = tokenizeLine(constLine).tokens.findIndex((t) => t.text === "field");
    const valueDefIdx = tokenizeLine(constLine).tokens.findIndex(
      (t) => t.kind === "identifier" && t.text === "value",
    );
    const valueUseIdx = tokenizeLine(returnLine).tokens.findIndex((t) => t.text === "value");

    const pane = document.querySelector(".graph-pane")!;

    const fieldUseEl = document.createElement("span");
    fieldUseEl.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      EXTRACT_MEMBER,
      constLineNo,
      fieldIdx,
      "field",
    );
    fieldUseEl.dataset.localTargetId = fieldParam[1];
    pane.appendChild(fieldUseEl);

    const valueDefEl = document.createElement("span");
    valueDefEl.dataset.localDefId = valueDefId;
    pane.appendChild(valueDefEl);

    const valueUseEl = document.createElement("span");
    valueUseEl.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      EXTRACT_MEMBER,
      returnLineNo,
      valueUseIdx,
      "value",
    );
    valueUseEl.dataset.localTargetId = valueDefId;
    registerTraceHost(valueUseEl);
    pane.appendChild(valueUseEl);

    const defEdges = assembleCodeLinePreviewEdges({
      name: "value",
      chipEl: valueDefEl,
      kind: "variable",
      tokenIndex: valueDefIdx,
      edgeKey: "test-value-def",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START),
      sourceFlowId: FLOW,
      memberId: EXTRACT_MEMBER,
      lineNumber: constLineNo,
      methodCode: EXTRACT_CODE,
      methodStartLine: EXTRACT_START,
      symbols: new Map(),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    const binding = defEdges.find((e) => e.connectionKind === "binding");
    expect(binding?.from.type).toBe("element");
    expect(binding?.to.type).toBe("element");
    if (binding?.from.type === "element" && binding?.to.type === "element") {
      expect(binding.from.el).toBe(fieldUseEl);
      expect(binding.to.el).toBe(valueDefEl);
    }

    const useEdges = assembleCodeLinePreviewEdges({
      name: "value",
      chipEl: valueUseEl,
      kind: "variable",
      tokenIndex: valueUseIdx,
      edgeKey: "test-value-use",
      symbolIndex: index,
      controlFlowIndex: buildControlFlowIndex(EXTRACT_MEMBER, EXTRACT_CODE, EXTRACT_START),
      sourceFlowId: FLOW,
      memberId: EXTRACT_MEMBER,
      lineNumber: returnLineNo,
      methodCode: EXTRACT_CODE,
      methodStartLine: EXTRACT_START,
      symbols: new Map(),
      graphData: null,
      getNode: () => undefined,
      hasSymbol: () => false,
      lookup: () => undefined,
      cascadeEdges: [],
    });

    expect(useEdges.some((e) => e.id.includes("init-param"))).toBe(false);
    expect(useEdges.some((e) => e.liveTo?.token === "field")).toBe(false);
  });
});
