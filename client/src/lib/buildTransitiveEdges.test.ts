import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { buildTransitiveEdges } from "@/lib/buildTransitiveEdges";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import {
  clearElementRegistry,
  registerTraceHost,
} from "@/lib/elementRegistry";
import { toFlowId } from "@/lib/graphIds";
import { makeMemberDefKey, makeUsageTokenKey } from "@/lib/traceKeys";
import type { UsageSiteRecord } from "@/lib/usageSiteIndex";
import type { GraphData, SymbolEntry } from "@/types";

const FILE = "/svc.ts";
const CLASS_ID = `class:${FILE}:Svc`;
const CHARGE_ID = `method:${FILE}:Svc.charge`;
const RUN_ID = `method:${FILE}:Svc.run`;
const OTHER_ID = `method:${FILE}:Svc.other`;
const FLOW = toFlowId(CLASS_ID);

function classNode(id: string, methods: ClassNodeData["methods"]): Node {
  const data: ClassNodeData = {
    label: "Svc",
    fileName: "Svc.ts",
    filePath: "/svc.ts",
    graphNodeId: `class:${id}`,
    nodeKind: "class",
    properties: [],
    methods,
    expandedPropertyIds: [],
    expandedMethodIds: [],
    collapsed: false,
  };
  return { id, type: "class", data, position: { x: 0, y: 0 } };
}

function mountUsageChip(
  pane: HTMLElement,
  memberId: string,
  lineNumber: number,
  token: string,
): HTMLElement {
  const el = document.createElement("span");
  el.className = "token-chip";
  el.dataset.traceKey = makeUsageTokenKey(FLOW, memberId, lineNumber, token);
  el.textContent = token;
  pane.append(el);
  return el;
}

describe("buildTransitiveEdges", () => {
  it("does not fan out via call-argument co-occurrence on the same line", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="m-extract">
        <span class="member-row-label" data-symbol-name="extractFieldValue" data-trace-key="${makeMemberDefKey(FLOW, "m-extract")}"></span>
      </div>
    `;
    document.body.append(pane);

    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    registerTraceHost(label);
    mountUsageChip(pane, "m-sub", 2, "field");

    const index = new Map<string, UsageSiteRecord[]>([
      [
        "extractFieldValue",
        [
          {
            flowNodeId: FLOW,
            memberId: "m-score",
            lineNumber: 2,
            line: "  const value = extractFieldValue(result, field);",
          },
        ],
      ],
      [
        "field",
        [
          {
            flowNodeId: FLOW,
            memberId: "m-sub",
            lineNumber: 2,
            line: "  return field;",
          },
        ],
      ],
    ]);

    const graphData: GraphData = {
      nodes: [
        {
          id: "class:Svc",
          type: "class",
          label: "Svc",
          filePath: "/svc.ts",
          code: "class Svc {}",
        },
        {
          id: "method:Svc.extractFieldValue",
          type: "method",
          label: "extractFieldValue",
          filePath: "/svc.ts",
          code: "extractFieldValue() {}",
          parent: "class:Svc",
        },
      ],
      edges: [],
    };

    const flowNode = classNode(FLOW, [
      {
        id: "m-extract",
        label: "extractFieldValue",
        symbolName: "extractFieldValue",
        code: "extractFieldValue() {}",
      },
    ]);
    const getNode = (id: string) => (id === FLOW ? flowNode : undefined);
    const symbols = new Map<string, SymbolEntry[]>([
      [
        "extractFieldValue",
        [{ name: "extractFieldValue", kind: "method", filePath: "/svc.ts" }],
      ],
    ]);

    const edges = buildTransitiveEdges(
      makeMemberDefKey(FLOW, "m-extract"),
      graphData,
      index,
      2,
      getNode,
      symbols,
    );

    expect(edges).toHaveLength(0);

    clearElementRegistry();
    pane.remove();
  });

  it("follows callees on usage lines for hop-2 expansion", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.append(pane);

    mountUsageChip(pane, OTHER_ID, 3, "process");

    const index = new Map<string, UsageSiteRecord[]>([
      [
        "charge",
        [
          {
            flowNodeId: FLOW,
            memberId: RUN_ID,
            lineNumber: 1,
            line: "return process(charge(id));",
          },
        ],
      ],
      [
        "process",
        [
          {
            flowNodeId: FLOW,
            memberId: OTHER_ID,
            lineNumber: 3,
            line: "  return process(x);",
          },
        ],
      ],
    ]);

    const graphData: GraphData = {
      nodes: [
        {
          id: CLASS_ID,
          type: "class",
          label: "Svc",
          filePath: FILE,
          code: "class Svc {}",
        },
        {
          id: CHARGE_ID,
          type: "method",
          label: "charge",
          filePath: FILE,
          code: "charge() {}",
          parent: CLASS_ID,
        },
        {
          id: RUN_ID,
          type: "method",
          label: "run",
          filePath: FILE,
          code: "return process(charge(id));",
          parent: CLASS_ID,
        },
        {
          id: OTHER_ID,
          type: "method",
          label: "other",
          filePath: FILE,
          code: "other() { return process(x); }",
          parent: CLASS_ID,
        },
      ],
      edges: [],
    };

    const flowNode = classNode(FLOW, [
      {
        id: CHARGE_ID,
        label: "charge",
        symbolName: "charge",
        code: "charge() {}",
      },
      {
        id: RUN_ID,
        label: "run",
        symbolName: "run",
        code: "return process(charge(id));",
      },
      {
        id: OTHER_ID,
        label: "other",
        symbolName: "other",
        code: "other() { return process(x); }",
      },
    ]);
    const getNode = (id: string) => (id === FLOW ? flowNode : undefined);
    const symbols = new Map<string, SymbolEntry[]>([
      ["charge", [{ name: "charge", kind: "method", filePath: FILE, line: 1 }]],
      ["process", [{ name: "process", kind: "method", filePath: FILE, line: 1 }]],
    ]);

    const edges = buildTransitiveEdges(
      makeUsageTokenKey(FLOW, CHARGE_ID, 1, "charge"),
      graphData,
      index,
      2,
      getNode,
      symbols,
    );

    expect(edges).toHaveLength(1);
    expect(edges[0]?.hop).toBe(2);

    pane.remove();
  });
});
