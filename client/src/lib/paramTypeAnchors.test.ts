import { describe, expect, it } from "vitest";
import {
  findBodyParamTypeChip,
  findHeaderParamTypeChip,
  typeTokenIndexOnParamSignature,
} from "@/lib/paramTypeAnchors";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeSigParamDefKey, makeSignatureTypeKey, makeUsageTokenKey } from "@/lib/traceKeys";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { Node } from "@xyflow/react";

const FLOW = "flow:file:helpers.ts";
const MEMBER = "fn:file:extract";
const START = 52;

const CODE = `export function extractFieldValue(
  result: GeocoderSearchResult,
  field: AddressFieldKind,
): string | null {
  const addr = result.address;
  return addr;
}`;

function classNode(): Node {
  const data: ClassNodeData = {
    label: "Helpers",
    fileName: "helpers.ts",
    filePath: "/proj/helpers.ts",
    graphNodeId: "class:helpers",
    nodeKind: "class",
    properties: [],
    methods: [
      {
        id: MEMBER,
        label: "extract Field Value",
        symbolName: "extractFieldValue",
        code: CODE,
        startLine: START,
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

describe("typeTokenIndexOnParamSignature", () => {
  it("finds the type token index after param colon", () => {
    const line = "  result: GeocoderSearchResult,";
    const idx = typeTokenIndexOnParamSignature(line, "result", "GeocoderSearchResult");
    expect(idx).not.toBeNull();
  });
});

describe("findBodyParamTypeChip", () => {
  it("prefers the inline signature-line type over header tags", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "member-body-wrap";
    pane.appendChild(bodyWrap);

    const bodyType = document.createElement("span");
    const line = CODE.split("\n")[1]!;
    const tokenIndex = typeTokenIndexOnParamSignature(
      line,
      "result",
      "GeocoderSearchResult",
    )!;
    bodyType.dataset.traceKey = makeUsageTokenKey(
      FLOW,
      MEMBER,
      START + 1,
      tokenIndex,
      "GeocoderSearchResult",
    );
    bodyWrap.appendChild(bodyType);
    registerTraceHost(bodyType);

    const headerType = document.createElement("span");
    headerType.dataset.traceKey = makeSignatureTypeKey(
      FLOW,
      MEMBER,
      "GeocoderSearchResult",
    );
    pane.appendChild(headerType);
    registerTraceHost(headerType);

    const chip = findBodyParamTypeChip(
      FLOW,
      MEMBER,
      "result",
      "GeocoderSearchResult",
      () => classNode(),
    );
    expect(chip).toBe(bodyType);

    document.body.innerHTML = "";
  });
});

describe("findHeaderParamTypeChip", () => {
  it("scopes header type chip to the matching param input group", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);

    const group = document.createElement("span");
    group.className = "member-sig-value member-sig-value--in";

    const param = document.createElement("span");
    param.dataset.traceKey = makeSigParamDefKey(FLOW, MEMBER, "result");
    group.appendChild(param);

    const type = document.createElement("span");
    type.dataset.traceKey = makeSignatureTypeKey(FLOW, MEMBER, "GeocoderSearchResult");
    group.appendChild(type);

    pane.appendChild(group);
    registerTraceHost(param);
    registerTraceHost(type);

    expect(
      findHeaderParamTypeChip(FLOW, MEMBER, "result", "GeocoderSearchResult"),
    ).toBe(type);

    document.body.innerHTML = "";
  });
});
