import { describe, expect, it, afterEach } from "vitest";
import { EMPTY_TRACE_LIT } from "@/lib/computeTraceLit";
import { registerTraceHost } from "@/lib/elementRegistry";
import { setTraceAnchorHost } from "@/lib/memberDefAnchor";
import { applyTraceLit, clearTraceLit } from "@/lib/traceLitController";
import { setTraceSessionActive } from "@/lib/wireHoverBoost";

describe("applyTraceLit", () => {
  afterEach(() => {
    clearTraceLit();
    setTraceSessionActive(false);
  });

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

  it("dims sibling local-def hosts at depth 2 while keeping full color on the focused host", () => {
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
    setTraceSessionActive(true);

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
    expect(body.classList.contains("trace-depth-faded")).toBe(true);
    const strength = Number(body.style.getPropertyValue("--trace-strength"));
    expect(strength).toBeGreaterThan(0);
    expect(strength).toBeLessThan(1);
    expect(body.style.opacity).toBe("");

    const headerSocket = header.querySelector<HTMLElement>('[data-flow-anchor="right"]')!;
    const bodySocket = body.querySelector<HTMLElement>('[data-flow-anchor="right"]')!;
    expect(headerSocket.classList.contains("flow-anchor-endpoint-sibling")).toBe(false);
    expect(bodySocket.classList.contains("trace-depth-faded")).toBe(true);

    clearTraceLit();
    pane.remove();
  });

  it("lights the hovered host for member def trace keys shared by title and signature", () => {
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
        <div class="member-body-wrap">
          <div class="code-line">
            <span class="token-chip" data-trace-key="flow-1::def::member-1">buildSubtitle</span>
          </div>
        </div>
      </div>
    `;
    document.body.append(pane);

    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    const bodyChip = pane.querySelector<HTMLElement>(".code-line .token-chip")!;
    registerTraceHost(label);
    registerTraceHost(bodyChip);
    setTraceSessionActive(true);

    setTraceAnchorHost(bodyChip);
    applyTraceLit(
      {
        ...EMPTY_TRACE_LIT,
        litTokenKeys: new Set(["flow-1::def::member-1"]),
        endpointTokenKeys: new Set(["flow-1::def::member-1"]),
      },
      {
        pinnedTokenKeys: new Set(),
        hoveredTokenKey: "flow-1::def::member-1",
      },
    );

    expect(bodyChip.classList.contains("token-chip-on")).toBe(true);
    expect(bodyChip.classList.contains("token-chip-endpoint-sibling")).toBe(false);
    expect(label.classList.contains("token-chip-lit")).toBe(true);
    expect(label.classList.contains("token-chip-on")).toBe(false);
    expect(label.classList.contains("token-chip-endpoint-sibling")).toBe(false);

    clearTraceLit();

    setTraceAnchorHost(label);
    applyTraceLit(
      {
        ...EMPTY_TRACE_LIT,
        litTokenKeys: new Set(["flow-1::def::member-1"]),
        endpointTokenKeys: new Set(["flow-1::def::member-1"]),
      },
      {
        pinnedTokenKeys: new Set(),
        hoveredTokenKey: "flow-1::def::member-1",
      },
    );

    expect(label.classList.contains("token-chip-on")).toBe(true);
    expect(label.classList.contains("token-chip-endpoint-sibling")).toBe(false);
    expect(bodyChip.classList.contains("token-chip-endpoint-sibling")).toBe(false);
    expect(bodyChip.classList.contains("trace-depth-faded")).toBe(true);

    clearTraceLit();
    pane.remove();
  });

  it("lights the right socket when a usage chip is the wire source", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <span class="token-chip" data-trace-key="flow::usage::field" data-local-target-id="def-a" data-token-kind="variable">
        <span data-flow-anchor="left" class="flow-anchor-off bg-border"></span>
        <span data-flow-anchor="right" class="flow-anchor-off bg-border"></span>
      </span>
    `;
    document.body.append(pane);

    const usage = pane.querySelector<HTMLElement>(".token-chip")!;
    registerTraceHost(usage);

    applyTraceLit(
      {
        ...EMPTY_TRACE_LIT,
        litTokenKeys: new Set(["flow::usage::field"]),
        endpointTokenKeys: new Set(["flow::usage::field"]),
        endpointPortSide: new Map([["flow::usage::field", new Set(["right"] as const)]]),
      },
      { pinnedTokenKeys: new Set(), hoveredTokenKey: null },
    );

    const left = usage.querySelector<HTMLElement>('[data-flow-anchor="left"]')!;
    const right = usage.querySelector<HTMLElement>('[data-flow-anchor="right"]')!;
    expect(left.classList.contains("flow-anchor-on")).toBe(false);
    expect(right.classList.contains("flow-anchor-on")).toBe(true);

    clearTraceLit();
    pane.remove();
  });

  it("lights both sockets when an endpoint is source and target", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <span class="token-chip" data-trace-key="flow::usage::x" data-local-target-id="def-a" data-token-kind="variable">
        <span data-flow-anchor="left" class="flow-anchor-off bg-border"></span>
        <span data-flow-anchor="right" class="flow-anchor-off bg-border"></span>
      </span>
    `;
    document.body.append(pane);

    const usage = pane.querySelector<HTMLElement>(".token-chip")!;
    registerTraceHost(usage);

    applyTraceLit(
      {
        ...EMPTY_TRACE_LIT,
        litTokenKeys: new Set(["flow::usage::x"]),
        endpointTokenKeys: new Set(["flow::usage::x"]),
        endpointPortSide: new Map([["flow::usage::x", new Set(["left", "right"] as const)]]),
      },
      { pinnedTokenKeys: new Set(), hoveredTokenKey: null },
    );

    const left = usage.querySelector<HTMLElement>('[data-flow-anchor="left"]')!;
    const right = usage.querySelector<HTMLElement>('[data-flow-anchor="right"]')!;
    expect(left.classList.contains("flow-anchor-on")).toBe(true);
    expect(right.classList.contains("flow-anchor-on")).toBe(true);

    clearTraceLit();
    pane.remove();
  });

  it("adds hover-preview class on hop-2+ endpoints when pointer matches", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <span class="token-chip member-sig-type-chip" data-trace-key="sig::type::AddressFieldKind" data-token-kind="type">
        <span data-flow-anchor="right" class="flow-anchor-off bg-border"></span>
        AddressFieldKind
      </span>
    `;
    document.body.append(pane);

    const typeChip = pane.querySelector<HTMLElement>(".token-chip")!;
    registerTraceHost(typeChip);
    setTraceSessionActive(true);

    applyTraceLit(
      {
        ...EMPTY_TRACE_LIT,
        litTokenKeys: new Set(["sig::type::AddressFieldKind"]),
        endpointTokenKeys: new Set(["sig::type::AddressFieldKind"]),
        traceDepth: new Map([["sig::type::AddressFieldKind", 2]]),
      },
      { pinnedTokenKeys: new Set(), hoveredTokenKey: "sig::type::AddressFieldKind" },
    );

    expect(typeChip.classList.contains("token-chip-hover-preview")).toBe(true);
    expect(typeChip.classList.contains("token-chip-source")).toBe(false);

    clearTraceLit();
    pane.remove();
  });

  it("gives lit-only tokens chip-on so --trace-strength styles apply", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <span class="token-chip" data-trace-key="flow::ref::other" data-token-kind="variable">other</span>
    `;
    document.body.append(pane);

    const chip = pane.querySelector<HTMLElement>(".token-chip")!;
    registerTraceHost(chip);
    setTraceSessionActive(true);

    applyTraceLit(
      {
        ...EMPTY_TRACE_LIT,
        litTokenKeys: new Set(["flow::ref::other"]),
        traceDepth: new Map([["flow::ref::other", 3]]),
      },
      { pinnedTokenKeys: new Set(), hoveredTokenKey: null },
    );

    expect(chip.classList.contains("token-chip-lit")).toBe(true);
    expect(chip.classList.contains("token-chip-on")).toBe(true);
    expect(chip.style.getPropertyValue("--trace-strength")).not.toBe("");

    clearTraceLit();
    pane.remove();
  });
});
