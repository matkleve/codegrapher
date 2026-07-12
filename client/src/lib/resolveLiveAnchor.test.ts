import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeControlFlowKey, makeUsageTokenKey } from "@/lib/traceKeys";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import { templateInterpolationSites } from "@/lib/templateInterpolations";
import { tokenizeLine } from "@/lib/tokenizeLine";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { Node } from "@xyflow/react";

const FLOW = "flow:file:geo.ts";
const MEMBER = "fn:file:buildViewbox";
const START_LINE = 41;

const VIEWBOX_CODE = `export function buildViewbox(lat: number, lng: number): string {
  const delta = 0.1;
  return \`\${lng - delta},\${lat + delta},\${lng + delta},\${lat - delta}\`;
}`;

function mountChip(
  traceKey: string,
  attrs: Record<string, string>,
): HTMLElement {
  const el = document.createElement("span");
  el.className = "token-chip";
  el.dataset.traceKey = traceKey;
  for (const [k, v] of Object.entries(attrs)) {
    el.dataset[k] = v;
  }
  document.body.appendChild(el);
  registerTraceHost(el);
  return el;
}

function mockGetNode(): (id: string) => Node | undefined {
  const data: ClassNodeData = {
    label: "buildViewbox",
    fileName: "geo.ts",
    filePath: "/geo.ts",
    graphNodeId: "g1",
    nodeKind: "function",
    properties: [],
    methods: [
      {
        id: MEMBER,
        label: "buildViewbox",
        code: VIEWBOX_CODE,
        startLine: START_LINE,
      },
    ],
    expandedMethodIds: [MEMBER],
    expandedPropertyIds: [],
    collapsed: false,
  };
  return () =>
    ({
      id: FLOW,
      type: "class",
      data,
    }) as Node;
}

describe("refinePreviewEdge local param anchors", () => {
  beforeEach(() => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("resolves liveFrom definition hint via traceKey to the mounted chip", () => {
    const sigLine = VIEWBOX_CODE.split("\n")[0]!;
    const lngParamIndex = tokenizeLine(sigLine).tokens.findIndex((t) => t.text === "lng");
    const returnSites = templateInterpolationSites(VIEWBOX_CODE.split("\n")[2]!);
    const lngUseIndex = returnSites[0]!.tokenIndex;

    const lngDefKey = makeUsageTokenKey(FLOW, MEMBER, START_LINE, lngParamIndex, "lng");
    const lngDef = mountChip(lngDefKey, {
      localDefId: `local-def::${MEMBER}::param::lng::${START_LINE}`,
      symbolName: "lng",
      symbolRole: "definition",
    });
    const lngUseKey = makeUsageTokenKey(FLOW, MEMBER, START_LINE + 2, lngUseIndex, "lng");
    const lngUse = mountChip(lngUseKey, {
      localTargetId: `local-def::${MEMBER}::param::lng::${START_LINE}`,
      symbolName: "lng",
      symbolRole: "usage",
    });

    const spec: PreviewEdgeSpec = {
      id: "test-lng",
      from: { type: "element", el: lngDef },
      to: { type: "element", el: lngUse },
      kind: "variable",
      liveFrom: {
        token: "lng",
        flowNodeId: FLOW,
        memberId: MEMBER,
        lineNumber: START_LINE,
        role: "definition",
        traceKey: lngDefKey,
      },
      liveTo: {
        token: "lng",
        flowNodeId: FLOW,
        memberId: MEMBER,
        lineNumber: START_LINE + 2,
        tokenIndex: lngUseIndex,
        role: "usage",
        traceKey: lngUseKey,
      },
    };

    const { from, to } = refinePreviewEdge(spec, mockGetNode());
    expect(from.type).toBe("element");
    expect(to.type).toBe("element");
    if (from.type === "element") expect(from.el).toBe(lngDef);
    if (to.type === "element") expect(to.el).toBe(lngUse);
  });

  it("resolves branch liveTo to the case keyword element, not the line handle", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);
    const cfKey = makeControlFlowKey(FLOW, MEMBER, START_LINE + 2, 0);
    const caseEl = document.createElement("span");
    caseEl.dataset.traceKey = cfKey;
    caseEl.textContent = "case";
    pane.append(caseEl);
    registerTraceHost(caseEl);

    const spec: PreviewEdgeSpec = {
      id: "branch",
      from: { type: "element", el: document.createElement("span") },
      to: { type: "element", el: caseEl },
      kind: "variable",
      connectionKind: "branch",
      liveTo: {
        token: "case",
        flowNodeId: FLOW,
        memberId: MEMBER,
        lineNumber: START_LINE + 2,
        role: "usage",
        traceKey: cfKey,
      },
    };

    const { to } = refinePreviewEdge(spec, mockGetNode());
    expect(to.type).toBe("element");
    if (to.type === "element") expect(to.el).toBe(caseEl);

    document.body.innerHTML = "";
  });

  it("resolves sig-type liveTo via DOM when registry misses", () => {
    const traceKey = `${FLOW}::${MEMBER}::sig-type::GeocoderSearchResult`;
    const pane = document.querySelector(".graph-pane")!;
    const node = document.createElement("div");
    node.dataset.flowNodeId = FLOW;
    const row = document.createElement("div");
    row.dataset.memberId = MEMBER;
    const chip = document.createElement("span");
    chip.className = "member-sig-type-chip";
    chip.dataset.traceKey = traceKey;
    chip.dataset.symbolName = "GeocoderSearchResult";
    row.append(chip);
    node.append(row);
    pane.append(node);

    const spec: PreviewEdgeSpec = {
      id: "sig-type",
      from: { type: "element", el: document.createElement("span") },
      to: { type: "element", el: chip },
      kind: "type",
      liveTo: {
        token: "GeocoderSearchResult",
        flowNodeId: FLOW,
        memberId: MEMBER,
        role: "usage",
        traceKey,
      },
    };

    const { to } = refinePreviewEdge(spec, mockGetNode());
    expect(to.type).toBe("element");
    if (to.type === "element") expect(to.el).toBe(chip);
  });

  it("uses file-absolute line numbers when falling back to line handles", () => {
    const returnSites = templateInterpolationSites(VIEWBOX_CODE.split("\n")[2]!);
    const lngUseIndex = returnSites[0]!.tokenIndex;
    const getNode = mockGetNode();
    const spec: PreviewEdgeSpec = {
      id: "test-fallback",
      from: { type: "handle", handle: `preview-member-${MEMBER}` },
      to: { type: "handle", handle: `preview-line-${MEMBER}-7` },
      kind: "variable",
      liveTo: {
        token: "lng",
        flowNodeId: FLOW,
        memberId: MEMBER,
        lineNumber: START_LINE + 2,
        tokenIndex: lngUseIndex,
        role: "usage",
      },
    };

    const { to } = refinePreviewEdge(spec, getNode);
    expect(to.type).toBe("handle");
    if (to.type === "handle") {
      expect(to.handle).toBe(`preview-line-${MEMBER}-${START_LINE + 2}`);
    }
  });
});
