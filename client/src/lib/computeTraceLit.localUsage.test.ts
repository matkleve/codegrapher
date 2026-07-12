import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { computeTraceLit } from "@/lib/computeTraceLit";
import { buildElementPreviewEdge } from "@/lib/buildPreviewEdges";
import { registerTraceHost } from "@/lib/elementRegistry";
import { makeUsageTokenKey } from "@/lib/traceKeys";

const FLOW = "flow:file:svc.ts";
const MEMBER = "fn:svc:run";
const ADDR_DEF = "local-def::m::local::addr::2";

function mountAddrLine(pane: HTMLElement): { def: HTMLElement; uses: HTMLElement[] } {
  const line =
    "return addr.city ?? addr.town ?? addr.village ?? addr.municipality;";
  const def = document.createElement("span");
  def.className = "token-chip";
  def.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, 2, 1, "addr");
  def.dataset.localDefId = ADDR_DEF;
  def.dataset.tokenKind = "variable";
  pane.appendChild(def);
  registerTraceHost(def);

  const uses: HTMLElement[] = [];
  for (const [idx, name] of [
    [5, "city"],
    [9, "town"],
    [13, "village"],
  ] as const) {
    const use = document.createElement("span");
    use.className = "token-chip";
    use.dataset.traceKey = makeUsageTokenKey(FLOW, MEMBER, 61, idx, "addr");
    use.dataset.localTargetId = ADDR_DEF;
    use.dataset.tokenKind = "variable";
    pane.appendChild(use);
    registerTraceHost(use);
    uses.push(use);
  }

  return { def, uses };
}

describe("computeTraceLit local usage hover", () => {
  beforeEach(() => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("marks sibling usages as provenance endpoints when hop-2 wires exist", () => {
    const pane = document.querySelector(".graph-pane")!;
    const { def, uses } = mountAddrLine(pane);
    const focus = uses[0]!;
    const focusKey = focus.dataset.traceKey!;
    const sibling = uses[1]!;
    const siblingKey = sibling.dataset.traceKey!;

    const lit = computeTraceLit(focusKey, [
      buildElementPreviewEdge("e0", def, focus, "variable"),
      { ...buildElementPreviewEdge("e1", def, sibling, "variable"), hop: 2 },
    ]);

    expect(lit.endpointTokenKeys.has(focusKey)).toBe(true);
    expect(lit.endpointTokenKeys.has(siblingKey)).toBe(true);
    expect(lit.siblingEndpointTokenKeys.has(siblingKey)).toBe(true);
    expect(lit.siblingEndpointTokenKeys.has(def.dataset.traceKey!)).toBe(true);
  });

  it("marks sibling usages grey on usage hover even without edge hop hints", () => {
    const pane = document.querySelector(".graph-pane")!;
    const { uses } = mountAddrLine(pane);
    const focus = uses[0]!;
    const focusKey = focus.dataset.traceKey!;
    const sibling = uses[2]!;
    const siblingKey = sibling.dataset.traceKey!;

    const lit = computeTraceLit(focusKey, []);

    expect(lit.siblingEndpointTokenKeys.has(siblingKey)).toBe(true);
    expect(lit.siblingEndpointTokenKeys.has(focusKey)).toBe(false);
  });
});
