import { describe, expect, it, afterEach } from "vitest";
import {
  clearTraceAnchorHost,
  areMemberDefSiblingHosts,
  lockTraceAnchorPreference,
  resolveMemberDefEndpoint,
  setTraceAnchorHost,
  unlockTraceAnchorPreference,
} from "@/lib/memberDefAnchor";
import { registerTraceHost } from "@/lib/elementRegistry";

describe("resolveMemberDefEndpoint", () => {
  afterEach(() => {
    unlockTraceAnchorPreference();
    clearTraceAnchorHost();
    document.body.innerHTML = "";
  });

  it("prefers the hovered body chip when member body is open", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="member-1">
        <span class="member-row-label token-def-label" data-trace-key="flow-1::def::member-1"></span>
        <div class="member-body-wrap">
          <div class="code-line">
            <span class="token-chip" data-trace-key="flow-1::def::member-1">extractFieldValue</span>
          </div>
        </div>
      </div>
    `;
    document.body.append(pane);

    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    const bodyChip = pane.querySelector<HTMLElement>(".token-chip")!;
    registerTraceHost(label);
    registerTraceHost(bodyChip);

    setTraceAnchorHost(bodyChip);
    expect(resolveMemberDefEndpoint("flow-1::def::member-1")).toBe(bodyChip);
  });

  it("falls back to the row title when the body chip is not mounted", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="member-1">
        <span class="member-row-label token-def-label" data-trace-key="flow-1::def::member-1"></span>
      </div>
    `;
    document.body.append(pane);

    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    registerTraceHost(label);

    setTraceAnchorHost(
      pane.querySelector<HTMLElement>(".token-chip") ?? document.createElement("span"),
    );
    expect(resolveMemberDefEndpoint("flow-1::def::member-1")).toBe(label);
  });

  it("returns to the body chip after expand when body trace was preferred", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="member-1">
        <span class="member-row-label token-def-label" data-trace-key="flow-1::def::member-1"></span>
      </div>
    `;
    document.body.append(pane);

    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    registerTraceHost(label);

    const detachedBody = document.createElement("span");
    detachedBody.className = "token-chip";
    detachedBody.dataset.traceKey = "flow-1::def::member-1";
    setTraceAnchorHost(detachedBody);
    expect(resolveMemberDefEndpoint("flow-1::def::member-1")).toBe(label);

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "member-body-wrap";
    const line = document.createElement("div");
    line.className = "code-line";
    const bodyChip = document.createElement("span");
    bodyChip.className = "token-chip";
    bodyChip.dataset.traceKey = "flow-1::def::member-1";
    line.append(bodyChip);
    bodyWrap.append(line);
    pane.querySelector("[data-member-id]")!.append(bodyWrap);
    registerTraceHost(bodyChip);

    expect(resolveMemberDefEndpoint("flow-1::def::member-1")).toBe(bodyChip);
  });

  it("keeps body preference when anchor host clears while pin-locked", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="member-1">
        <span class="member-row-label token-def-label" data-trace-key="flow-1::def::member-1"></span>
        <div class="member-body-wrap">
          <div class="code-line">
            <span class="token-chip" data-trace-key="flow-1::def::member-1">extractFieldValue</span>
          </div>
        </div>
      </div>
    `;
    document.body.append(pane);

    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    const bodyChip = pane.querySelector<HTMLElement>(".token-chip")!;
    registerTraceHost(label);
    registerTraceHost(bodyChip);

    setTraceAnchorHost(bodyChip);
    lockTraceAnchorPreference();
    clearTraceAnchorHost();

    expect(resolveMemberDefEndpoint("flow-1::def::member-1")).toBe(bodyChip);
  });

  it("treats row title and signature chip as sibling hosts, not wire endpoints", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="member-1">
        <span class="member-row-label" data-trace-key="flow-1::def::member-1" data-local-def-id="local-def::member::member-1"></span>
        <div class="member-body-wrap">
          <span class="token-chip" data-trace-key="flow-1::def::member-1" data-local-target-id="local-def::member::member-1"></span>
        </div>
      </div>
    `;
    document.body.append(pane);
    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    const body = pane.querySelector<HTMLElement>(".token-chip")!;
    expect(areMemberDefSiblingHosts(label, body)).toBe(true);
  });
});
