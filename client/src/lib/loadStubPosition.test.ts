import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { loadStubPanePosition } from "@/lib/loadStubPosition";

/** paneRect left=280 right=1200 top=100 bottom=900. */
function mockPane(): HTMLElement {
  const pane = document.createElement("div");
  pane.className = "graph-pane";
  document.body.appendChild(pane);
  vi.spyOn(pane, "getBoundingClientRect").mockReturnValue({
    left: 280, top: 100, right: 1200, bottom: 900, width: 920, height: 800,
    x: 280, y: 100, toJSON: () => ({}),
  } as DOMRect);
  return pane;
}

function mockRect(el: HTMLElement, r: Partial<DOMRect>): void {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0,
    toJSON: () => ({}), ...r,
  } as DOMRect);
}

describe("loadStubPanePosition", () => {
  let target: HTMLElement;
  let node: HTMLElement;
  let pane: HTMLElement;

  beforeEach(() => {
    pane = mockPane();
    node = document.createElement("div");
    node.className = "react-flow__node";
    pane.appendChild(node);
    target = document.createElement("span");
    target.className = "token-chip";
    node.appendChild(target);
    mockRect(target, { left: 480, top: 240, right: 600, bottom: 260, width: 120, height: 20 });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("places the stub left of the node (socket right) when there is room", () => {
    // node.left 600 → left = 600 - 180 - 20 = 400, comfortably past pane.left(280).
    mockRect(node, { left: 600, top: 200, right: 900, bottom: 600, width: 300, height: 400 });
    const pos = loadStubPanePosition(target, 180, 28);
    expect(pos).toEqual({ left: 400, top: 236, socket: "right" });
  });

  it("flips to the right of the node (socket left) when the node hugs the pane left edge", () => {
    // node.left 400 → left-of-node = 200, which is past pane.left(280): flip right.
    mockRect(node, { left: 400, top: 200, right: 700, bottom: 600, width: 300, height: 400 });
    const pos = loadStubPanePosition(target, 180, 28);
    expect(pos).toEqual({ left: 720, top: 236, socket: "left" }); // node.right(700) + gap(20)
  });

  it("never spills past the pane's left edge", () => {
    mockRect(node, { left: 300, top: 200, right: 600, bottom: 600, width: 300, height: 400 });
    const pos = loadStubPanePosition(target, 180, 28);
    expect(pos!.left).toBeGreaterThanOrEqual(280);
  });

  it("clamps left inside the pane when neither side fits", () => {
    // Wide stub: left-of-node overflows AND right-of-node overflows → clamp to pane.
    mockRect(node, { left: 340, top: 200, right: 1180, bottom: 600, width: 840, height: 400 });
    const pos = loadStubPanePosition(target, 900, 28);
    expect(pos!.socket).toBe("right");
    expect(pos!.left).toBe(280 + 8); // paneLeft + margin
  });

  it("clamps vertical position inside the graph pane", () => {
    mockRect(node, { left: 600, top: 200, right: 900, bottom: 600, width: 300, height: 400 });
    mockRect(target, { left: 480, top: 90, right: 600, bottom: 110, width: 120, height: 20 });
    const pos = loadStubPanePosition(target, 180, 28);
    expect(pos!.top).toBe(108);
  });
});
