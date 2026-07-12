import { describe, expect, it } from "vitest";
import {
  buildParamTypeCascadeEdges,
  paramNameFromDefId,
} from "@/lib/paramTypeCascadeEdges";
import { registerTraceHost } from "@/lib/elementRegistry";
import {
  makeSigParamDefKey,
  makeSignatureTypeKey,
  makeUsageTokenKey,
} from "@/lib/traceKeys";
import { typeTokenIndexOnParamSignature } from "@/lib/paramTypeAnchors";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { SymbolEntry } from "@/types";
import type { Node } from "@xyflow/react";

const FLOW = "flow:file:order.ts";
const MEMBER = "fn:order:extract";
const PARAM = "field";
const TYPE = "AddressFieldKind";

const METHOD_CODE = `extractFieldValue(${PARAM}: ${TYPE}): string | null {
  return ${PARAM};
}`;

function classNode(): Node {
  const data: ClassNodeData = {
    label: "OrderService",
    fileName: "order.ts",
    filePath: "/proj/order.ts",
    graphNodeId: "class:order",
    nodeKind: "class",
    properties: [],
    methods: [
      {
        id: MEMBER,
        label: "extract Field Value",
        symbolName: "extractFieldValue",
        code: METHOD_CODE,
        startLine: 10,
      },
    ],
    expandedPropertyIds: [],
    expandedMethodIds: [MEMBER],
    propertiesSectionCollapsed: false,
    methodsSectionCollapsed: false,
    collapsed: false,
    pinnedMemberIds: [],
  };
  return { id: FLOW, type: "class", data, position: { x: 0, y: 0 } };
}

describe("paramNameFromDefId", () => {
  it("extracts param name from scoped def id", () => {
    expect(paramNameFromDefId(`local-def::${MEMBER}::param::field::10`)).toBe(
      "field",
    );
  });
});

describe("buildParamTypeCascadeEdges", () => {
  it("emits tier-2 sig-type→param and tier-3 Load stub when type is off canvas", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);

    const paramDef = document.createElement("span");
    paramDef.dataset.traceKey = makeSigParamDefKey(FLOW, MEMBER, PARAM);
    paramDef.dataset.localDefId = `local-def::${MEMBER}::param::${PARAM}::10`;
    pane.appendChild(paramDef);
    registerTraceHost(paramDef);

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "member-body-wrap";
    pane.appendChild(bodyWrap);

    const bodyParamDef = document.createElement("span");
    bodyParamDef.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, 10, 0, PARAM);
    bodyParamDef.dataset.localDefId = paramDef.dataset.localDefId;
    bodyWrap.appendChild(bodyParamDef);
    registerTraceHost(bodyParamDef);

    const tokenIndex = typeTokenIndexOnParamSignature(METHOD_CODE.split("\n")[0]!, PARAM, TYPE)!;
    const sigType = document.createElement("span");
    sigType.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      MEMBER,
      10,
      tokenIndex,
      TYPE,
    );
    sigType.dataset.tokenKind = "type";
    bodyWrap.appendChild(sigType);
    registerTraceHost(sigType);

    const symbols = new Map<string, SymbolEntry[]>([
      [TYPE, [{ filePath: "/proj/types.ts", kind: "type", line: 3 }]],
    ]);

    const edges = buildParamTypeCascadeEdges({
      paramName: PARAM,
      paramDefEl: paramDef,
      flowNodeId: FLOW,
      memberId: MEMBER,
      symbols,
      graphData: null,
      getNode: () => classNode(),
      hasSymbol: (name) => name === TYPE,
      edgeIdPrefix: "test",
    });

    expect(edges).toHaveLength(2);
    expect(edges[0]?.hop).toBe(2);
    expect(edges[0]?.connectionKind).toBe("typesetting");
    expect(edges[1]?.hop).toBe(3);
    expect(edges[1]?.load?.filePath).toBe("/proj/types.ts");
    expect(edges[0]?.from.type).toBe("element");
    expect((edges[0]?.from as { el: HTMLElement }).el).toBe(sigType);
    expect((edges[0]?.to as { el: HTMLElement }).el).toBe(paramDef);
    expect(edges[0]?.liveTo?.traceKey).toBe(paramDef.dataset.traceKey);

    document.body.innerHTML = "";
  });

  it("anchors header hover to header sig-type and param chips", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);

    const tags = document.createElement("span");
    tags.className = "member-signature-tags";
    const group = document.createElement("span");
    group.className = "member-sig-value member-sig-value--in";

    const paramDef = document.createElement("span");
    paramDef.dataset.traceKey = makeSigParamDefKey(FLOW, MEMBER, PARAM);
    paramDef.dataset.localDefId = `local-def::${MEMBER}::param::${PARAM}::10`;
    group.appendChild(paramDef);

    const sigType = document.createElement("span");
    sigType.dataset.traceKey = makeSignatureTypeKey(FLOW, MEMBER, TYPE);
    group.appendChild(sigType);

    tags.appendChild(group);
    pane.appendChild(tags);
    registerTraceHost(paramDef);
    registerTraceHost(sigType);

    const edges = buildParamTypeCascadeEdges({
      paramName: PARAM,
      paramDefEl: paramDef,
      flowNodeId: FLOW,
      memberId: MEMBER,
      symbols: new Map([[TYPE, [{ filePath: "/proj/types.ts", kind: "type", line: 3 }]]]),
      graphData: null,
      getNode: () => classNode(),
      hasSymbol: (name) => name === TYPE,
      edgeIdPrefix: "test-header",
    });

    expect(edges[0]?.connectionKind).toBe("typesetting");
    expect((edges[0]?.from as { el: HTMLElement }).el).toBe(sigType);
    expect((edges[0]?.to as { el: HTMLElement }).el).toBe(paramDef);

    document.body.innerHTML = "";
  });

  it("prefers body inline chips when hovering body param def", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "member-body-wrap";
    pane.appendChild(bodyWrap);

    const bodyParamDef = document.createElement("span");
    bodyParamDef.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, 10, 0, PARAM);
    bodyParamDef.dataset.localDefId = `local-def::${MEMBER}::param::${PARAM}::10`;
    bodyWrap.appendChild(bodyParamDef);
    registerTraceHost(bodyParamDef);

    const tokenIndex = typeTokenIndexOnParamSignature(METHOD_CODE.split("\n")[0]!, PARAM, TYPE)!;
    const sigType = document.createElement("span");
    sigType.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, 10, tokenIndex, TYPE);
    bodyWrap.appendChild(sigType);
    registerTraceHost(sigType);

    const edges = buildParamTypeCascadeEdges({
      paramName: PARAM,
      paramDefEl: bodyParamDef,
      flowNodeId: FLOW,
      memberId: MEMBER,
      symbols: new Map([[TYPE, [{ filePath: "/proj/types.ts", kind: "type", line: 3 }]]]),
      graphData: null,
      getNode: () => classNode(),
      hasSymbol: (name) => name === TYPE,
      edgeIdPrefix: "test-body",
    });

    expect((edges[0]?.from as { el: HTMLElement }).el).toBe(sigType);
    expect((edges[0]?.to as { el: HTMLElement }).el).toBe(bodyParamDef);

    document.body.innerHTML = "";
  });

  it("returns empty when param has no indexed type", () => {
    const paramDef = document.createElement("span");
    const code = `run(x: string): void { return; }`;
    const node = classNode();
    (node.data as ClassNodeData).methods[0]!.code = code;

    const edges = buildParamTypeCascadeEdges({
      paramName: "x",
      paramDefEl: paramDef,
      flowNodeId: FLOW,
      memberId: MEMBER,
      symbols: new Map(),
      graphData: null,
      getNode: () => node,
      hasSymbol: () => false,
      edgeIdPrefix: "test",
    });

    expect(edges).toEqual([]);
  });
});
