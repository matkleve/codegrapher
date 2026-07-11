import { describe, expect, it } from "vitest";
import { EMPTY_TRACE_LIT } from "@/lib/computeTraceLit";
import { registerTraceHost } from "@/lib/elementRegistry";
import { applyTraceLit, clearTraceLit } from "@/lib/traceLitController";

describe("applyTraceLit", () => {
  it("applies endpoint socket colors without throwing for multi-class TOKEN_ANCHOR", () => {
    const host = document.createElement("span");
    host.dataset.traceKey = "flow::def::member-1";
    host.dataset.tokenKind = "variable";
    host.classList.add("token-def-label");

    const socket = document.createElement("span");
    socket.dataset.flowAnchor = "right";
    socket.classList.add("flow-anchor-off", "bg-border");
    host.append(socket);
    document.body.append(host);

    registerTraceHost(host);

    expect(() =>
      applyTraceLit(
        {
          ...EMPTY_TRACE_LIT,
          litTokenKeys: new Set(["flow::def::member-1"]),
          endpointTokenKeys: new Set(["flow::def::member-1"]),
        },
        { pinnedTokenKeys: new Set(["flow::def::member-1"]), hoveredTokenKey: null },
      ),
    ).not.toThrow();

    expect(socket.classList.contains("flow-anchor-on")).toBe(true);
    expect(
      socket.classList.contains("bg-[color:var(--token-edge-variable)]"),
    ).toBe(true);

    clearTraceLit();
    expect(socket.classList.contains("flow-anchor-off")).toBe(true);
    host.remove();
  });
});
