import { describe, expect, it } from "vitest";
import { isDegeneratePreviewEdge } from "@/lib/previewEdgeFilter";
import { memberDefId } from "@/lib/localSymbolLinks";
import { makeMemberDefKey } from "@/lib/traceKeys";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";

const FLOW = "flow:geo";
const MEMBER = "fn:buildViewbox";

describe("isDegeneratePreviewEdge", () => {
  it("flags a self-loop on one definition chip", () => {
    const el = document.createElement("span");
    el.className = "member-row-label";
    document.body.append(el);

    const spec: PreviewEdgeSpec = {
      id: "self",
      from: { type: "element", el },
      to: { type: "element", el },
      kind: "function",
    };

    expect(isDegeneratePreviewEdge(spec, () => undefined)).toBe(true);
    el.remove();
  });

  it("flags member-def title ↔ signature sibling wires", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    const defKey = makeMemberDefKey(FLOW, MEMBER);
    pane.innerHTML = `
      <div data-member-id="${MEMBER}">
        <span class="member-row-label" data-trace-key="${defKey}" data-local-def-id="${memberDefId(MEMBER)}"></span>
        <div class="member-body-wrap">
          <span class="token-chip" data-trace-key="${defKey}"></span>
        </div>
      </div>
    `;
    document.body.append(pane);
    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    const body = pane.querySelector<HTMLElement>(".token-chip")!;

    const spec: PreviewEdgeSpec = {
      id: "sibling",
      from: { type: "element", el: label },
      to: { type: "element", el: body },
      kind: "function",
    };

    expect(isDegeneratePreviewEdge(spec, () => undefined)).toBe(true);
    document.body.innerHTML = "";
  });
});
