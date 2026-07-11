import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildDefinitionPreviewEdges } from "@/lib/buildDefinitionPreviewEdges";
import { memberDefId } from "@/lib/localSymbolLinks";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeMemberDefKey } from "@/lib/traceKeys";

const FLOW = "flow:geo";
const MEMBER = "fn:buildViewbox";

describe("buildDefinitionPreviewEdges member def siblings", () => {
  let label: HTMLElement;
  let bodyChip: HTMLElement;

  beforeEach(() => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    const defKey = makeMemberDefKey(FLOW, MEMBER);
    const defId = memberDefId(MEMBER);
    pane.innerHTML = `
      <div data-member-id="${MEMBER}" data-flow-node-id="${FLOW}">
        <span class="member-row-label token-def-label"
          data-trace-key="${defKey}"
          data-local-def-id="${defId}"
          data-symbol-name="buildViewbox"
          data-symbol-role="definition"></span>
        <div class="member-body-wrap">
          <div class="code-line">
            <span class="token-chip"
              data-trace-key="${defKey}"
              data-symbol-name="buildViewbox"
              data-symbol-role="definition">buildViewbox</span>
          </div>
        </div>
      </div>
    `;
    document.body.append(pane);
    label = pane.querySelector<HTMLElement>(".member-row-label")!;
    bodyChip = pane.querySelector<HTMLElement>(".token-chip")!;
    registerTraceHost(label);
    registerTraceHost(bodyChip);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not wire the row title to the signature-line def chip", () => {
    bodyChip.dataset.localDefId = memberDefId(MEMBER);
    const fromBody = buildDefinitionPreviewEdges("buildViewbox", "function", bodyChip);
    const fromTitle = buildDefinitionPreviewEdges("buildViewbox", "function", label);

    const isSiblingWire = (from: HTMLElement, to: HTMLElement) =>
      (from === bodyChip && to === label) || (from === label && to === bodyChip);

    for (const edges of [fromBody, fromTitle]) {
      for (const edge of edges) {
        if (edge.from.type !== "element" || edge.to.type !== "element") continue;
        expect(isSiblingWire(edge.from.el, edge.to.el)).toBe(false);
      }
    }
  });

  it("does not wire siblings when the body chip incorrectly carries local-target-id", () => {
    bodyChip.dataset.localTargetId = memberDefId(MEMBER);
    const edges = buildDefinitionPreviewEdges("buildViewbox", "function", label);
    expect(edges).toHaveLength(0);
  });

  it("returns no preview wires when only off-canvas call sites exist", () => {
    const edges = buildDefinitionPreviewEdges("buildViewbox", "function", label, {
      graphData: null,
      getNode: () => undefined,
      sourceFlowId: FLOW,
      sourceMemberId: MEMBER,
      lookupOffCanvasCallSiteFiles: () => [
        { filePath: "/other.ts", line: 10, symbolName: "buildViewbox" },
      ],
    });
    expect(edges).toHaveLength(0);
  });
});
