import { describe, expect, it } from "vitest";
import { findLocalDefElement } from "@/lib/localDefElements";
import { linksForElement } from "@/lib/linksForElement";

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

describe("linksForElement param defs", () => {
  it("wires every def sibling when hovering a usage", () => {
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
      const bodyDef = pane.querySelector<HTMLElement>(".member-body-wrap [data-local-def-id]")!;
      const usage = pane.querySelector<HTMLElement>("[data-local-target-id]")!;
      const pairs = linksForElement(usage);
      expect(pairs).toHaveLength(2);
      expect(pairs).toContainEqual({ from: headerDef, to: usage });
      expect(pairs).toContainEqual({ from: bodyDef, to: usage });
    } finally {
      document.body.removeChild(pane);
    }
  });

  it("fans out from header and body def siblings to each usage", () => {
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
      const bodyDef = pane.querySelector<HTMLElement>(".member-body-wrap [data-local-def-id]")!;
      const usage = pane.querySelector<HTMLElement>("[data-local-target-id]")!;
      const pairs = linksForElement(bodyDef);
      expect(pairs).toHaveLength(2);
      expect(pairs).toContainEqual({ from: headerDef, to: usage });
      expect(pairs).toContainEqual({ from: bodyDef, to: usage });
    } finally {
      document.body.removeChild(pane);
    }
  });
});
