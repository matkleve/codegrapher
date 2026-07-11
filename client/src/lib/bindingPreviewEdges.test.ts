import { describe, expect, it } from "vitest";
import { buildBindingPreviewEdges } from "@/lib/bindingPreviewEdges";
import { buildMemberSymbolIndex } from "@/lib/localSymbolLinks";
import { makeUsageTokenKey } from "@/lib/traceKeys";
import { tokenizeLine } from "@/lib/tokenizeLine";

const MEMBER = "method:file:Svc.fn";
const FLOW = "flow-1";

const CODE = `get(result: SearchResult): string | null {
  const addr = result.address;
  return addr;
}`;

describe("buildBindingPreviewEdges", () => {
  it("wires initializer chip to binding def in the DOM", () => {
    const index = buildMemberSymbolIndex(MEMBER, CODE);
    const declLine = "  const addr = result.address;";
    const tokens = tokenizeLine(declLine).tokens;
    const addrIndex = tokens.findIndex((t) => t.kind === "identifier" && t.text === "addr");
    const addressIndex = tokens.findIndex(
      (t, i) => t.kind === "identifier" && t.text === "address" && tokens[i - 1]?.text === ".",
    );
    expect(addrIndex).toBeGreaterThan(-1);
    expect(addressIndex).toBeGreaterThan(-1);

    const pane = document.createElement("div");
    pane.className = "graph-pane";

    const addrDefId = `local-def::${MEMBER}::local::addr::2`;
    const initTraceKey = makeUsageTokenKey(FLOW, MEMBER, 2, addressIndex, "address");

    const initChip = document.createElement("span");
    initChip.dataset.traceKey = initTraceKey;
    initChip.dataset.tokenKind = "variable";

    const bindingChip = document.createElement("span");
    bindingChip.dataset.localDefId = addrDefId;
    bindingChip.dataset.tokenKind = "variable";

    pane.append(initChip, bindingChip);
    document.body.append(pane);

    const fromInit = buildBindingPreviewEdges(
      initChip,
      index,
      FLOW,
      MEMBER,
      2,
      addressIndex,
      "edge",
    );
    expect(fromInit).toHaveLength(1);
    expect(fromInit[0]?.connectionKind).toBe("binding");
    expect(fromInit[0]?.from).toEqual({ type: "element", el: initChip });
    expect(fromInit[0]?.to).toEqual({ type: "element", el: bindingChip });

    const fromBinding = buildBindingPreviewEdges(
      bindingChip,
      index,
      FLOW,
      MEMBER,
      2,
      addrIndex,
      "edge",
    );
    expect(fromBinding).toHaveLength(1);
    expect(fromBinding[0]?.from).toEqual({ type: "element", el: initChip });
    expect(fromBinding[0]?.to).toEqual({ type: "element", el: bindingChip });

    pane.remove();
  });
});
