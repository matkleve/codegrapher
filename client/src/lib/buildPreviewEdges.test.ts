import { describe, expect, it } from "vitest";
import {
  buildDefinitionFanOutEdges,
  buildLoadPreviewEdge,
  buildUsagePreviewEdge,
  liveToFromUsageEl,
} from "@/lib/buildPreviewEdges";
import { previewMemberHandle } from "@/lib/ctrlPreviewHandles";
import type { GraphVisibleTarget } from "@/lib/resolveVisibleTarget";

describe("buildLoadPreviewEdge", () => {
  it("stores every unloadable candidate on the load spec", () => {
    const usageEl = document.createElement("span");
    usageEl.dataset.traceKey = "flow-a::member::3::0::token";

    const edge = buildLoadPreviewEdge(
      "edge-1",
      [
        {
          symbolName: "charge",
          filePath: "/a/One.ts",
          line: 1,
          occurrenceCount: 1,
        },
        {
          symbolName: "charge",
          filePath: "/b/Two.ts",
          line: 2,
          occurrenceCount: 1,
        },
      ],
      usageEl,
      "charge",
      "function",
    );

    expect(edge.load?.occurrenceCount).toBe(2);
    expect(edge.load?.candidates).toHaveLength(2);
    expect(edge.load?.token).toBe("charge");
    expect(edge.load?.filePath).toBe("/a/One.ts");
  });

  it("throws when given zero cards", () => {
    const usageEl = document.createElement("span");
    expect(() =>
      buildLoadPreviewEdge("e", [], usageEl, "x", "function"),
    ).toThrow();
  });

  it("builds usage edge with live anchors", () => {
    const usageEl = document.createElement("span");
    usageEl.dataset.traceKey = "flow-a::member::3::0::token";

    const target: GraphVisibleTarget = {
      mode: "graph",
      level: "member",
      flowNodeId: "flow-b",
      targetHandle: previewMemberHandle("member-b"),
      label: "token",
      kind: "function",
      memberId: "member-b",
    };

    const edge = buildUsagePreviewEdge("wire-1", target, usageEl, "token");
    expect(edge.liveFrom?.flowNodeId).toBe("flow-b");
    expect(edge.liveTo?.flowNodeId).toBe("flow-a");
    expect(edge.load).toBeUndefined();
  });

  it("parses signature type trace keys without coercing sig-type to a line", () => {
    const usageEl = document.createElement("span");
    usageEl.dataset.traceKey = "flow-a::member-1::sig-type::AddressFieldKind";

    const hint = liveToFromUsageEl("AddressFieldKind", usageEl);
    expect(hint).toEqual({
      token: "AddressFieldKind",
      flowNodeId: "flow-a",
      memberId: "member-1",
      role: "usage",
      traceKey: "flow-a::member-1::sig-type::AddressFieldKind",
    });
    expect(hint?.lineNumber).toBeUndefined();
  });

  it("builds fan-out edges for each usage element", () => {
    const def = document.createElement("span");
    const u1 = document.createElement("span");
    const u2 = document.createElement("span");
    const edges = buildDefinitionFanOutEdges("sym", "function", def, [u1, u2]);
    expect(edges).toHaveLength(2);
    expect(edges[0]!.id).toBe("def-sym-0");
  });
});
