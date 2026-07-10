import { describe, expect, it } from "vitest";
import type { Node } from "@xyflow/react";
import { buildLoadPreviewEdge } from "@/lib/buildPreviewEdges";
import { toFlowId } from "@/lib/graphIds";
import { rebuildTraceEdgesForKey } from "@/lib/rebuildTraceEdges";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";
import type { GraphData, SymbolEntry } from "@/types";

const ORDER = "/fixtures/demo/OrderService.ts";
const PAYMENT = "/fixtures/demo/PaymentGateway.ts";
const orderClassId = `class:${ORDER}:OrderService`;
const paymentClassId = `class:${PAYMENT}:PaymentGateway`;
const chargeMethodId = `method:${PAYMENT}:PaymentGateway.charge`;
const checkoutMethodId = `method:${ORDER}:OrderService.checkout`;
const orderFlowId = toFlowId(orderClassId);
const paymentFlowId = toFlowId(paymentClassId);

describe("rebuildTraceEdgesForKey", () => {
  it("returns null when edges are not load stubs", () => {
    const chip = document.createElement("span");
    chip.dataset.traceKey = `${orderFlowId}::${checkoutMethodId}::12::charge`;
    document.body.append(chip);

    const usageEdge = {
      id: "usage",
      from: { type: "handle" as const, handle: "h" },
      to: { type: "element" as const, el: chip },
      kind: "function" as const,
    };

    const rebuilt = rebuildTraceEdgesForKey(
      chip.dataset.traceKey!,
      [usageEdge],
      new Map(),
      null,
      () => undefined,
    );
    expect(rebuilt).toBeNull();
    chip.remove();
  });

  it("returns null when usage chip is disconnected from DOM", () => {
    const chip = document.createElement("span");
    chip.dataset.traceKey = `${orderFlowId}::${checkoutMethodId}::12::charge`;
    chip.dataset.symbolName = "charge";

    const loadEdge = buildLoadPreviewEdge(
      "load-edge",
      [{ symbolName: "charge", filePath: PAYMENT, line: 4, occurrenceCount: 1 }],
      chip,
      "charge",
      "function",
    );

    const rebuilt = rebuildTraceEdgesForKey(
      chip.dataset.traceKey!,
      [loadEdge],
      new Map([["charge", [{ filePath: PAYMENT, kind: "method", line: 4 }]]]),
      { nodes: [], edges: [] },
      () => undefined,
    );
    expect(rebuilt).toBeNull();
  });

  it("returns null when definition is still off-canvas", () => {
    const chip = document.createElement("span");
    chip.dataset.traceKey = `${orderFlowId}::${checkoutMethodId}::12::charge`;
    chip.dataset.symbolName = "charge";
    document.body.append(chip);

    const loadEdge = buildLoadPreviewEdge(
      "load-edge",
      [
        {
          symbolName: "charge",
          filePath: "/elsewhere/Legacy.ts",
          line: 9,
          occurrenceCount: 1,
        },
      ],
      chip,
      "charge",
      "function",
    );

    const graphData: GraphData = {
      nodes: [
        {
          id: orderClassId,
          type: "class",
          label: "OrderService",
          filePath: ORDER,
          code: "",
        },
      ],
      edges: [],
    };

    const rebuilt = rebuildTraceEdgesForKey(
      chip.dataset.traceKey!,
      [loadEdge],
      new Map([
        ["charge", [{ filePath: "/elsewhere/Legacy.ts", kind: "method", line: 9 }]],
      ]),
      graphData,
      () => undefined,
    );
    expect(rebuilt).toBeNull();
    chip.remove();
  });

  it("upgrades a load stub after the target class lands on the canvas", () => {
    const graphData: GraphData = {
      nodes: [
        {
          id: orderClassId,
          type: "class",
          label: "OrderService",
          filePath: ORDER,
          code: "",
        },
        {
          id: checkoutMethodId,
          type: "method",
          label: "checkout",
          filePath: ORDER,
          code: "return this.gateway.charge(id, amount);",
          parent: orderClassId,
        },
        {
          id: paymentClassId,
          type: "class",
          label: "PaymentGateway",
          filePath: PAYMENT,
          code: "",
        },
        {
          id: chargeMethodId,
          type: "method",
          label: "charge",
          filePath: PAYMENT,
          code: "async charge() {}",
          parent: paymentClassId,
        },
      ],
      edges: [],
    };

    const paymentData: ClassNodeData = {
      label: "PaymentGateway",
      fileName: "PaymentGateway.ts",
      filePath: PAYMENT,
      graphNodeId: paymentClassId,
      nodeKind: "class",
      properties: [],
      methods: [
        {
          id: chargeMethodId,
          label: "charge",
          symbolName: "charge",
          code: "async charge() {}",
        },
      ],
      expandedPropertyIds: [],
      expandedMethodIds: [],
      collapsed: false,
    };

    const orderData: ClassNodeData = {
      label: "Order Service",
      fileName: "OrderService.ts",
      filePath: ORDER,
      graphNodeId: orderClassId,
      nodeKind: "class",
      properties: [],
      methods: [
        {
          id: checkoutMethodId,
          label: "checkout",
          symbolName: "checkout",
          code: "return this.gateway.charge(id, amount);",
        },
      ],
      expandedPropertyIds: [],
      expandedMethodIds: [checkoutMethodId],
      collapsed: false,
    };

    const nodes = new Map<string, Node>([
      [paymentFlowId, { id: paymentFlowId, type: "class", data: paymentData, position: { x: 0, y: 0 } }],
      [orderFlowId, { id: orderFlowId, type: "class", data: orderData, position: { x: 0, y: 0 } }],
    ]);

    const chip = document.createElement("span");
    chip.dataset.traceKey = `${orderFlowId}::${checkoutMethodId}::12::charge`;
    chip.dataset.symbolName = "charge";
    document.body.append(chip);

    const loadEdge = buildLoadPreviewEdge(
      "load-edge",
      [{ symbolName: "charge", filePath: PAYMENT, line: 4, occurrenceCount: 1 }],
      chip,
      "charge",
      "function",
    );

    const symbols = new Map<string, SymbolEntry[]>([
      ["charge", [{ filePath: PAYMENT, kind: "method", line: 4 }]],
    ]);

    const rebuilt = rebuildTraceEdgesForKey(
      chip.dataset.traceKey!,
      [loadEdge],
      symbols,
      graphData,
      (id) => nodes.get(id),
    );

    expect(rebuilt).not.toBeNull();
    expect(rebuilt![0]!.load).toBeUndefined();
    expect(rebuilt![0]!.liveFrom?.flowNodeId).toBe(paymentFlowId);

    chip.remove();
  });
});
