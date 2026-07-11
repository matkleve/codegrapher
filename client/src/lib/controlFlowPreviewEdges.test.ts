import { describe, expect, it } from "vitest";
import { buildControlFlowPreviewEdges } from "@/lib/controlFlowPreviewEdges";
import { buildControlFlowIndex, controlFlowAnchorFor } from "@/lib/controlFlowLinks";
import { makeControlFlowKey } from "@/lib/traceKeys";
import { tokenizeLine } from "@/lib/tokenizeLine";

const MEMBER = "method:file:Svc.extractFieldValue";
const FLOW = "flow-1";

const CODE = `extractFieldValue(field: AddressFieldKind): string | null {
  switch (field) {
    case 'city':
      return null;
    case 'district':
      return null;
  }
}`;

function idxOf(line: string, text: string): number {
  return tokenizeLine(line).tokens.findIndex((t) => t.text === text);
}

function mountAnchor(
  pane: HTMLElement,
  flowNodeId: string,
  memberId: string,
  lineNumber: number,
  tokenIndex: number,
): HTMLElement {
  const el = document.createElement("span");
  el.dataset.traceKey = makeControlFlowKey(flowNodeId, memberId, lineNumber, tokenIndex);
  pane.append(el);
  return el;
}

describe("buildControlFlowPreviewEdges", () => {
  it("fans out from the switch keyword to every case branch", () => {
    const index = buildControlFlowIndex(MEMBER, CODE);
    const lines = CODE.split("\n");
    const switchLineNo = lines.findIndex((l) => l.includes("switch (field)")) + 1;
    const switchTokenIdx = idxOf(lines[switchLineNo - 1]!, "switch");

    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.append(pane);

    const headEl = mountAnchor(pane, FLOW, MEMBER, switchLineNo, switchTokenIdx);
    const group = controlFlowAnchorFor(index, switchLineNo, switchTokenIdx)!;
    const groupData = index.groups.get(group.groupId)!;
    const branchEls = groupData.branches.map((b) =>
      mountAnchor(pane, FLOW, MEMBER, b.lineNumber, b.tokenIndex),
    );

    const edges = buildControlFlowPreviewEdges(
      headEl,
      index,
      FLOW,
      MEMBER,
      switchLineNo,
      switchTokenIdx,
      "edge",
    );

    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.connectionKind === "branch")).toBe(true);
    expect(edges.map((e) => (e.to as { el: HTMLElement }).el)).toEqual(branchEls);
    expect(edges.every((e) => (e.from as { el: HTMLElement }).el === headEl)).toBe(true);

    pane.remove();
  });

  it("fans out from the discriminant identifier the same as the keyword", () => {
    const index = buildControlFlowIndex(MEMBER, CODE);
    const lines = CODE.split("\n");
    const switchLineNo = lines.findIndex((l) => l.includes("switch (field)")) + 1;
    const fieldIdx = idxOf(lines[switchLineNo - 1]!, "field");

    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.append(pane);

    const conditionEl = mountAnchor(pane, FLOW, MEMBER, switchLineNo, fieldIdx);
    const anchor = controlFlowAnchorFor(index, switchLineNo, fieldIdx)!;
    const groupData = index.groups.get(anchor.groupId)!;
    for (const b of groupData.branches) {
      mountAnchor(pane, FLOW, MEMBER, b.lineNumber, b.tokenIndex);
    }

    const edges = buildControlFlowPreviewEdges(
      conditionEl,
      index,
      FLOW,
      MEMBER,
      switchLineNo,
      fieldIdx,
      "edge",
    );
    expect(edges).toHaveLength(2);

    pane.remove();
  });

  it("wires a single edge back to the head when hovering one branch", () => {
    const index = buildControlFlowIndex(MEMBER, CODE);
    const lines = CODE.split("\n");
    const switchLineNo = lines.findIndex((l) => l.includes("switch (field)")) + 1;
    const switchTokenIdx = idxOf(lines[switchLineNo - 1]!, "switch");
    const cityLineNo = lines.findIndex((l) => l.includes("case 'city'")) + 1;
    const caseTokenIdx = idxOf(lines[cityLineNo - 1]!, "case");

    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.append(pane);

    const headEl = mountAnchor(pane, FLOW, MEMBER, switchLineNo, switchTokenIdx);
    const branchEl = mountAnchor(pane, FLOW, MEMBER, cityLineNo, caseTokenIdx);

    const edges = buildControlFlowPreviewEdges(
      branchEl,
      index,
      FLOW,
      MEMBER,
      cityLineNo,
      caseTokenIdx,
      "edge",
    );

    expect(edges).toHaveLength(1);
    expect((edges[0]!.from as { el: HTMLElement }).el).toBe(headEl);
    expect((edges[0]!.to as { el: HTMLElement }).el).toBe(branchEl);

    pane.remove();
  });

  it("returns no edges for a non-anchor position", () => {
    const index = buildControlFlowIndex(MEMBER, CODE);
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.append(pane);
    const el = document.createElement("span");
    pane.append(el);

    expect(
      buildControlFlowPreviewEdges(el, index, FLOW, MEMBER, 99, 99, "edge"),
    ).toEqual([]);

    pane.remove();
  });
});
