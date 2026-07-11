import { describe, expect, it } from "vitest";
import { buildStructuralEdges } from "@/lib/buildStructuralEdges";
import { previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { toFlowId } from "@/lib/graphIds";
import type { GraphData } from "@/types";

describe("buildStructuralEdges", () => {
  const childId = "class:/demo/Child.ts:Child";
  const parentId = "class:/demo/Parent.ts:Parent";

  const graphData: GraphData = {
    nodes: [
      {
        id: childId,
        type: "class",
        label: "Child",
        filePath: "/demo/Child.ts",
        code: "",
      },
      {
        id: parentId,
        type: "class",
        label: "Parent",
        filePath: "/demo/Parent.ts",
        code: "",
      },
    ],
    edges: [{ source: childId, target: parentId, type: "extends" }],
  };

  it("emits structural specs when both endpoints are mounted", () => {
    const mounted = new Set([childId, parentId]);
    const specs = buildStructuralEdges(
      graphData,
      mounted,
      new Set(["extends", "implements", "composition"]),
    );
    expect(specs).toHaveLength(1);
    expect(specs[0]!.edgeType).toBe("extends");
    expect(specs[0]!.from).toEqual({
      type: "handle",
      handle: previewTargetTop(toFlowId(childId)),
    });
    expect(specs[0]!.to).toEqual({
      type: "handle",
      handle: previewTargetTop(toFlowId(parentId)),
    });
  });

  it("skips edges when an endpoint is not on canvas", () => {
    const specs = buildStructuralEdges(
      graphData,
      new Set([childId]),
      new Set(["extends"]),
    );
    expect(specs).toHaveLength(0);
  });

  it("respects visible type filter", () => {
    const mounted = new Set([childId, parentId]);
    const specs = buildStructuralEdges(graphData, mounted, new Set(["composition"]));
    expect(specs).toHaveLength(0);
  });
});
