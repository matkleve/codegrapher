import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { toFlowId } from "@/lib/graphIds";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import { previewTargetTop } from "@/lib/ctrlPreviewHandles";
import {
  buildExternalReferenceCards,
  externalCardsNotYetInGraph,
  findDefinitionInLoadedGraph,
  resolveVisibleTarget,
} from "@/lib/resolveVisibleTarget";
import type { GraphData, SymbolEntry } from "@/types";

const ORDER = "/fixtures/demo/OrderService.ts";
const PAYMENT = "/fixtures/demo/PaymentGateway.ts";

const orderClassId = `class:${ORDER}:OrderService`;
const paymentClassId = `class:${PAYMENT}:PaymentGateway`;
const chargeMethodId = `method:${PAYMENT}:PaymentGateway.charge`;
const checkoutMethodId = `method:${ORDER}:OrderService.checkout`;

function demoGraph(): GraphData {
  return {
    nodes: [
      {
        id: orderClassId,
        type: "class",
        label: "OrderService",
        filePath: ORDER,
        code: "class OrderService {}",
      },
      {
        id: checkoutMethodId,
        type: "method",
        label: "checkout",
        filePath: ORDER,
        code: "async checkout() { return this.gateway.charge(id, amount); }",
        parent: orderClassId,
      },
      {
        id: paymentClassId,
        type: "class",
        label: "PaymentGateway",
        filePath: PAYMENT,
        code: "class PaymentGateway {}",
      },
      {
        id: chargeMethodId,
        type: "method",
        label: "charge",
        filePath: PAYMENT,
        code: "async charge(orderId: string, amount: number) {}",
        parent: paymentClassId,
      },
    ],
    edges: [],
  };
}

type FlowClassOpts = {
  collapsed?: boolean;
  expandedMethodIds?: string[];
};

function flowNodes(
  graphData: GraphData,
  paymentOpts: FlowClassOpts = {},
): Map<string, Node> {
  const nodes = new Map<string, Node>();

  const addClass = (
    classId: string,
    methods: ClassNodeData["methods"],
    opts: FlowClassOpts = {},
  ) => {
    const flowId = toFlowId(classId);
    const graphNode = graphData.nodes.find((n) => n.id === classId)!;
    const data: ClassNodeData = {
      label: graphNode.label,
      fileName: "x.ts",
      filePath: graphNode.filePath,
      graphNodeId: classId,
      nodeKind: "class",
      properties: [],
      methods,
      expandedPropertyIds: [],
      expandedMethodIds: opts.expandedMethodIds ?? [],
      collapsed: opts.collapsed ?? false,
    };
    nodes.set(flowId, { id: flowId, type: "class", data, position: { x: 0, y: 0 } });
  };

  addClass(orderClassId, [
    {
      id: checkoutMethodId,
      label: "checkout",
      symbolName: "checkout",
      code: "async checkout() {}",
    },
  ]);

  addClass(
    paymentClassId,
    [
      {
        id: chargeMethodId,
        label: "charge",
        symbolName: "charge",
        code: "async charge(orderId: string, amount: number) {}",
      },
    ],
    paymentOpts,
  );

  return nodes;
}

function getNodeFactory(nodes: Map<string, Node>) {
  return (id: string) => nodes.get(id);
}

describe("resolveVisibleTarget", () => {
  const symbols = new Map<string, SymbolEntry[]>([
    [
      "charge",
      [
        { filePath: PAYMENT, kind: "method", line: 4 },
        { filePath: "/elsewhere/Legacy.ts", kind: "method", line: 99 },
      ],
    ],
    ["checkout", [{ filePath: ORDER, kind: "method", line: 12 }]],
  ]);

  it("wires to on-canvas definition before external cards", () => {
    const graphData = demoGraph();
    const nodes = flowNodes(graphData);
    const orderFlowId = toFlowId(orderClassId);

    const result = resolveVisibleTarget(
      "charge",
      symbols,
      graphData,
      getNodeFactory(nodes),
      orderFlowId,
    );

    expect(result?.mode).toBe("graph");
    if (result?.mode === "graph") {
      expect(result.flowNodeId).toBe(toFlowId(paymentClassId));
      expect(result.memberId).toBe(chargeMethodId);
    }
  });

  it("findDefinitionInLoadedGraph matches method symbolName on canvas", () => {
    const graphData = demoGraph();
    const nodes = flowNodes(graphData);

    const target = findDefinitionInLoadedGraph(
      "charge",
      graphData,
      getNodeFactory(nodes),
      toFlowId(orderClassId),
      "function",
    );

    expect(target?.flowNodeId).toBe(toFlowId(paymentClassId));
  });

  it("drops in-graph files from external picker cards", () => {
    const graphData = demoGraph();
    const cards = externalCardsNotYetInGraph("charge", symbols, graphData);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.filePath).toBe("/elsewhere/Legacy.ts");
  });

  it("returns external mode when nothing is on canvas", () => {
    const result = resolveVisibleTarget(
      "charge",
      symbols,
      null,
      () => undefined,
      "flow-a",
    );
    expect(result?.mode).toBe("external");
    if (result?.mode === "external") {
      expect(result.cards.length).toBe(2);
    }
  });

  it("returns null external when every index file is already in graph", () => {
    const graphData = demoGraph();
    const nodes = flowNodes(graphData);
    const onlyPayment = new Map<string, SymbolEntry[]>([
      ["charge", [{ filePath: PAYMENT, kind: "method", line: 4 }]],
    ]);

    const result = resolveVisibleTarget(
      "charge",
      onlyPayment,
      graphData,
      getNodeFactory(nodes),
      toFlowId(orderClassId),
    );

    expect(result?.mode).toBe("graph");
  });

  it("returns null for unknown symbols", () => {
    const result = resolveVisibleTarget(
      "missing",
      symbols,
      demoGraph(),
      () => undefined,
      "flow-a",
    );
    expect(result).toBeNull();
  });

  it("targets class header when definition container is collapsed", () => {
    const graphData = demoGraph();
    const nodes = flowNodes(graphData, { collapsed: true });
    const target = findDefinitionInLoadedGraph(
      "charge",
      graphData,
      getNodeFactory(nodes),
      toFlowId(orderClassId),
      "function",
    );
    expect(target?.level).toBe("class");
    expect(target?.targetHandle).toBe(previewTargetTop(toFlowId(paymentClassId)));
  });

  it("targets member row when method body is collapsed", () => {
    const graphData = demoGraph();
    const nodes = flowNodes(graphData, { expandedMethodIds: [] });
    const target = findDefinitionInLoadedGraph(
      "charge",
      graphData,
      getNodeFactory(nodes),
      toFlowId(orderClassId),
      "function",
    );
    expect(target?.level).toBe("member");
    expect(target?.memberId).toBe(chargeMethodId);
  });

  it("targets line handle when method body is expanded", () => {
    const graphData = demoGraph();
    const nodes = flowNodes(graphData, {
      expandedMethodIds: [chargeMethodId],
    });
    const target = findDefinitionInLoadedGraph(
      "charge",
      graphData,
      getNodeFactory(nodes),
      toFlowId(orderClassId),
      "function",
    );
    expect(target?.level).toBe("line");
    expect(target?.lineNumber).toBeGreaterThan(0);
  });

  it("resolves top-level function nodes by symbolName", () => {
    const FUNC = "/fixtures/demo/helpers.ts";
    const fnId = `function:${FUNC}:createOrder`;
    const graphData: GraphData = {
      nodes: [
        {
          id: fnId,
          type: "function",
          label: "createOrder",
          filePath: FUNC,
          code: "export function createOrder() {}",
        },
      ],
      edges: [],
    };
    const flowId = toFlowId(fnId);
    const data: ClassNodeData = {
      label: "createOrder",
      fileName: "helpers.ts",
      filePath: FUNC,
      graphNodeId: fnId,
      nodeKind: "function",
      properties: [],
      methods: [
        {
          id: fnId,
          label: "createOrder",
          symbolName: "createOrder",
          code: "export function createOrder() {}",
        },
      ],
      expandedPropertyIds: [],
      expandedMethodIds: [],
      collapsed: false,
    };
    const nodes = new Map<string, Node>([
      [flowId, { id: flowId, type: "class", data, position: { x: 0, y: 0 } }],
    ]);

    const target = findDefinitionInLoadedGraph(
      "createOrder",
      graphData,
      (id) => nodes.get(id),
      "flow-other",
      "function",
    );
    expect(target?.mode).toBe("graph");
    expect(target?.flowNodeId).toBe(flowId);
  });

  it("builds one card per file for duplicate index rows", () => {
    const dupes = new Map<string, SymbolEntry[]>([
      [
        "foo",
        [
          { filePath: "/a/A.ts", kind: "function", line: 1 },
          { filePath: "/a/A.ts", kind: "function", line: 9 },
          { filePath: "/b/B.ts", kind: "function", line: 2 },
        ],
      ],
    ]);
    const cards = buildExternalReferenceCards("foo", dupes);
    expect(cards).toHaveLength(2);
    expect(cards.find((c) => c.filePath === "/a/A.ts")?.occurrenceCount).toBe(2);
  });
});
