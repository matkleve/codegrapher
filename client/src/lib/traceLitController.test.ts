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

  it("greys sibling local-def hosts while keeping full color on the focused host", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <span class="token-chip member-sig-token-chip" data-trace-key="sig::field" data-local-def-id="def-a" data-token-kind="variable">
        <span data-flow-anchor="right" class="flow-anchor-off bg-border"></span>
      </span>
      <span class="token-chip" data-trace-key="body::field" data-local-def-id="def-a" data-token-kind="variable">
        <span data-flow-anchor="right" class="flow-anchor-off bg-border"></span>
      </span>
    `;
    document.body.append(pane);

    const header = pane.querySelector<HTMLElement>(".member-sig-token-chip")!;
    const body = pane.querySelector<HTMLElement>(".token-chip:not(.member-sig-token-chip)")!;
    registerTraceHost(header);
    registerTraceHost(body);

    applyTraceLit(
      {
        ...EMPTY_TRACE_LIT,
        litTokenKeys: new Set(["sig::field", "body::field"]),
        endpointTokenKeys: new Set(["sig::field", "body::field"]),
      },
      { pinnedTokenKeys: new Set(), hoveredTokenKey: "sig::field" },
    );

    expect(header.classList.contains("token-chip-on")).toBe(true);
    expect(header.classList.contains("token-chip-endpoint-sibling")).toBe(false);
    expect(body.classList.contains("token-chip-on")).toBe(true);
    expect(body.classList.contains("token-chip-endpoint-sibling")).toBe(true);

    const headerSocket = header.querySelector<HTMLElement>('[data-flow-anchor="right"]')!;
    const bodySocket = body.querySelector<HTMLElement>('[data-flow-anchor="right"]')!;
    expect(headerSocket.classList.contains("flow-anchor-endpoint-sibling")).toBe(false);
    expect(bodySocket.classList.contains("flow-anchor-endpoint-sibling")).toBe(true);

    clearTraceLit();
    pane.remove();
  });

  it("applies chip-on to member row label for def trace keys", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="member-1">
        <span class="member-row-label token-def-label"
          data-trace-key="flow-1::def::member-1"
          data-local-def-id="local-def::member::member-1"
          data-token-kind="function">
          <span data-flow-anchor="right" class="flow-anchor-off bg-border"></span>
        </span>
        <div class="code-line">
          <span class="token-chip" data-trace-key="flow-1::def::member-1">buildSubtitle</span>
        </div>
      </div>
    `;
    document.body.append(pane);

    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    const bodyChip = pane.querySelector<HTMLElement>(".code-line .token-chip")!;
    registerTraceHost(label);
    registerTraceHost(bodyChip);

    applyTraceLit(
      {
        ...EMPTY_TRACE_LIT,
        litTokenKeys: new Set(["flow-1::def::member-1"]),
        endpointTokenKeys: new Set(["flow-1::def::member-1"]),
      },
      { pinnedTokenKeys: new Set(), hoveredTokenKey: "flow-1::def::member-1" },
    );

    expect(label.classList.contains("token-chip-on")).toBe(true);
    expect(bodyChip.classList.contains("token-chip-on")).toBe(false);
    const socket = label.querySelector<HTMLElement>('[data-flow-anchor="right"]')!;
    expect(socket.classList.contains("flow-anchor-on")).toBe(true);

    clearTraceLit();
    pane.remove();
  });
});
