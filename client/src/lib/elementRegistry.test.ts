import { describe, expect, it } from "vitest";
import {
  clearElementRegistry,
  getByTraceKey,
  registerTraceHost,
} from "@/lib/elementRegistry";

describe("getByTraceKey", () => {
  it("prefers member row label over signature-line chip for def keys", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div data-member-id="member-1">
        <span class="member-row-label token-def-label" data-trace-key="flow-1::def::member-1"></span>
        <div class="code-line">
          <span class="token-chip" data-trace-key="flow-1::def::member-1">buildSubtitle</span>
        </div>
      </div>
    `;
    document.body.append(pane);

    const label = pane.querySelector<HTMLElement>(".member-row-label")!;
    const bodyChip = pane.querySelector<HTMLElement>(".token-chip")!;
    registerTraceHost(label);
    registerTraceHost(bodyChip);

    expect(getByTraceKey("flow-1::def::member-1")).toBe(label);

    clearElementRegistry();
    pane.remove();
  });
});
