import { describe, expect, it, afterEach } from "vitest";
import {
  clearElementRegistry,
  getByTraceKey,
  registerTraceHost,
} from "@/lib/elementRegistry";
import { clearTraceAnchorHost, setTraceAnchorHost } from "@/lib/memberDefAnchor";

describe("getByTraceKey", () => {
  afterEach(() => {
    clearElementRegistry();
    clearTraceAnchorHost();
    document.body.innerHTML = "";
  });

  it("resolves member def keys to the active body chip when hovered", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="member-1">
        <span class="member-row-label token-def-label" data-trace-key="flow-1::def::member-1"></span>
        <div class="member-body-wrap">
          <div class="code-line">
            <span class="token-chip" data-trace-key="flow-1::def::member-1">buildSubtitle</span>
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
    expect(getByTraceKey("flow-1::def::member-1")).toBe(bodyChip);

    setTraceAnchorHost(label);
    expect(getByTraceKey("flow-1::def::member-1")).toBe(label);
  });
});
