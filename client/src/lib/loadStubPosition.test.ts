import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { loadStubPanePosition } from "@/lib/loadStubPosition";

describe("loadStubPanePosition", () => {
  let target: HTMLElement;
  let node: HTMLElement;
  let pane: HTMLElement;

  beforeEach(() => {
    pane = document.createElement("div");
    pane.className = "graph-pane";
    document.body.appendChild(pane);
    vi.spyOn(pane, "getBoundingClientRect").mockReturnValue({
      left: 280,
      top: 100,
      right: 1200,
      bottom: 900,
      width: 920,
      height: 800,
      x: 280,
      y: 100,
      toJSON: () => ({}),
    });

    node = document.createElement("div");
    node.className = "react-flow__node";
    pane.appendChild(node);

    target = document.createElement("span");
    target.className = "token-chip";
    node.appendChild(target);

    vi.spyOn(node, "getBoundingClientRect").mockReturnValue({
      left: 400,
      top: 200,
      right: 700,
      bottom: 600,
      width: 300,
      height: 400,
      x: 400,
      y: 200,
      toJSON: () => ({}),
    });
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      left: 480,
      top: 240,
      right: 600,
      bottom: 260,
      width: 120,
      height: 20,
      x: 480,
      y: 240,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("places the stub left of the flow node in pane coordinates", () => {
    const pos = loadStubPanePosition(target, 180, 36);
    expect(pos).toEqual({ left: -80, top: 132 });
  });

  it("clamps vertical position inside the graph pane", () => {
    vi.spyOn(target, "getBoundingClientRect").mockReturnValue({
      left: 480,
      top: 90,
      right: 600,
      bottom: 110,
      width: 120,
      height: 20,
      x: 480,
      y: 90,
      toJSON: () => ({}),
    });

    const pos = loadStubPanePosition(target, 180, 36);
    expect(pos!.top).toBe(8);
  });
});
