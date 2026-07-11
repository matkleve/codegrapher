import { describe, expect, it } from "vitest";
import { findLocalDefElement } from "@/lib/localDefElements";
import { linksForElement } from "@/lib/localDefLinks";
import { tokenizeLine } from "@/lib/tokenizeLine";

describe("findLocalDefElement", () => {
  it("prefers in-body def over signature header chip", () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div class="member-row">
        <div class="member-signature-tags">
          <span class="token-chip member-sig-token-chip" data-local-def-id="def-a"></span>
        </div>
        <div class="member-body-wrap">
          <div class="code-line">
            <span class="token-chip" data-local-def-id="def-a"></span>
          </div>
        </div>
      </div>
    `;
    const bodyChip = root.querySelector<HTMLElement>(".member-body-wrap .token-chip")!;
    expect(findLocalDefElement(root, "def-a")).toBe(bodyChip);
  });
});

describe("linksForElement same-line occurrences", () => {
  it("keeps each usage occurrence distinct on one line", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    const line =
      "return addr.city ?? addr.town ?? addr.village ?? addr.municipality;";
    const tokens = tokenizeLine(line).tokens;
    const addrIndices = tokens
      .map((t, i) => (t.text === "addr" ? i : -1))
      .filter((i) => i >= 0);
    expect(addrIndices.length).toBeGreaterThanOrEqual(2);

    const addrDefId = "local-def::m::local::addr::2";
    pane.innerHTML = `
      <span class="token-chip" data-trace-key="flow::m::2::1::addr" data-local-def-id="${addrDefId}"></span>
      <span class="token-chip" data-trace-key="flow::m::61::${addrIndices[0]}::addr" data-local-target-id="${addrDefId}"></span>
      <span class="token-chip" data-trace-key="flow::m::61::${addrIndices[1]}::addr" data-local-target-id="${addrDefId}"></span>
    `;
    document.body.appendChild(pane);
    try {
      const def = pane.querySelector<HTMLElement>("[data-local-def-id]")!;
      const usages = pane.querySelectorAll<HTMLElement>("[data-local-target-id]");
      const pairsA = linksForElement(usages[0]!);
      const pairsB = linksForElement(usages[1]!);
      expect(pairsA).toEqual([{ from: def, to: usages[0] }]);
      expect(pairsB).toEqual([{ from: def, to: usages[1] }]);
      expect(pairsA[0]!.to).not.toBe(pairsB[0]!.to);
    } finally {
      document.body.removeChild(pane);
    }
  });
});
describe("linksForElement param defs", () => {
  it("wires a usage to the preferred in-body def", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div class="member-signature-tags">
        <span class="token-chip member-sig-token-chip" data-local-def-id="def-a"></span>
      </div>
      <div class="member-body-wrap">
        <span class="token-chip" data-local-def-id="def-a"></span>
        <span class="token-chip" data-local-target-id="def-a"></span>
      </div>
    `;
    document.body.appendChild(pane);
    try {
      const bodyDef = pane.querySelector<HTMLElement>(".member-body-wrap [data-local-def-id]")!;
      const usage = pane.querySelector<HTMLElement>("[data-local-target-id]")!;
      const pairs = linksForElement(usage);
      expect(pairs).toEqual([{ from: bodyDef, to: usage }]);
    } finally {
      document.body.removeChild(pane);
    }
  });

  it("fans out from the hovered def host to each usage", () => {
    const pane = document.createElement("div");
    pane.className = "graph-pane";
    pane.innerHTML = `
      <div class="member-signature-tags">
        <span class="token-chip member-sig-token-chip" data-local-def-id="def-a"></span>
      </div>
      <div class="member-body-wrap">
        <span class="token-chip" data-local-def-id="def-a"></span>
        <span class="token-chip" data-local-target-id="def-a"></span>
      </div>
    `;
    document.body.appendChild(pane);
    try {
      const headerDef = pane.querySelector<HTMLElement>(".member-sig-token-chip")!;
      const usage = pane.querySelector<HTMLElement>("[data-local-target-id]")!;
      const pairs = linksForElement(headerDef);
      expect(pairs).toEqual([{ from: headerDef, to: usage }]);
    } finally {
      document.body.removeChild(pane);
    }
  });
});
