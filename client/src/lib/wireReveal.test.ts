import { describe, expect, it, beforeEach } from "vitest";
import {
  buildRevealSchedule,
  orderSpecsForReveal,
  playWireReveal,
  stripWireRevealStroke,
  wireRevealDelayMs,
  WIRE_REVEAL_HOP_MS,
  WIRE_REVEAL_MS,
  WIRE_REVEAL_STAGGER_MS,
} from "@/lib/wireReveal";
import { startWireSignalEpoch, stopWireSignalEmitting } from "@/lib/traceWireSignal";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { WireElements } from "@/lib/previewEdgeDom";

function edge(id: string, hop?: number): PreviewEdgeSpec {
  return {
    id,
    from: { type: "handle", handle: "a" },
    to: { type: "handle", handle: "b" },
    kind: "function",
    hop,
  };
}

function mockWire(): WireElements {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M 0 0 L 100 0");
  path.getTotalLength = () => 100;
  const noopAnim = (): Animation =>
    ({
      finished: Promise.resolve(),
      cancel: () => {},
    }) as Animation;
  path.animate = noopAnim;
  glow.animate = noopAnim;
  group.append(glow, path);
  return {
    spec: {} as WireElements["spec"],
    group,
    glow,
    path,
    junction: document.createElementNS("http://www.w3.org/2000/svg", "g"),
    hitFrom: path,
    hitTo: path,
    hitMid: path,
  };
}

describe("wireRevealDelayMs", () => {
  it("staggers by hop then fan-out tie within hop", () => {
    expect(wireRevealDelayMs(undefined, 0)).toBe(0);
    expect(wireRevealDelayMs(2, 0)).toBe(WIRE_REVEAL_HOP_MS);
    expect(wireRevealDelayMs(3, 0)).toBe(WIRE_REVEAL_HOP_MS * 2);
    expect(wireRevealDelayMs(undefined, 1)).toBe(WIRE_REVEAL_STAGGER_MS);
    expect(wireRevealDelayMs(2, 2)).toBe(WIRE_REVEAL_HOP_MS + WIRE_REVEAL_STAGGER_MS * 2);
  });
});

describe("orderSpecsForReveal", () => {
  it("orders focus-near wires before transitive hops", () => {
    const specs = [edge("hop3", 3), edge("hop1"), edge("hop2", 2)];
    expect(orderSpecsForReveal(specs).map((s) => s.id)).toEqual(["hop1", "hop2", "hop3"]);
  });
});

describe("buildRevealSchedule", () => {
  it("assigns increasing delays outward from focus", () => {
    const schedule = buildRevealSchedule([edge("a"), edge("b"), edge("c", 2)]);
    expect(schedule.get("a")?.delayMs).toBe(0);
    expect(schedule.get("b")?.delayMs).toBe(WIRE_REVEAL_STAGGER_MS);
    expect(schedule.get("c")?.delayMs).toBe(WIRE_REVEAL_HOP_MS);
  });
});

describe("playWireReveal", () => {
  beforeEach(() => {
    startWireSignalEpoch();
  });

  it("arms path stroke draw and hides dashed glow until complete", () => {
    const wire = mockWire();
    playWireReveal(wire, 0);
    expect(wire.path.classList.contains("preview-edge-drawing")).toBe(true);
    expect(wire.glow.classList.contains("preview-edge-glow-drawing")).toBe(true);
    expect(wire.path.style.strokeDasharray).toBe("100");
    expect(wire.path.style.strokeDashoffset).toBe("100");
    expect(wire.glow.style.strokeDasharray).toBe("");
    expect(wire.glow.style.opacity).toBe("0");
    expect(wire.group.dataset.revealStarted).toBe("1");
  });

  it("does not restart while a draw is in flight", () => {
    const wire = mockWire();
    playWireReveal(wire, 0);
    wire.path.style.strokeDashoffset = "50";
    playWireReveal(wire, 0);
    expect(wire.path.style.strokeDashoffset).toBe("50");
  });

  it("exports a visible draw duration", () => {
    expect(WIRE_REVEAL_MS).toBeGreaterThanOrEqual(80);
  });

  it("does not start when signal emitter is off", () => {
    stopWireSignalEmitting();
    const wire = mockWire();
    playWireReveal(wire, 0);
    expect(wire.group.dataset.revealStarted).toBeUndefined();
  });

  it("stripWireRevealStroke clears reveal overrides and marching", () => {
    const wire = mockWire();
    playWireReveal(wire, 0);
    wire.path.classList.add("preview-edge-marching");
    wire.glow.classList.add("preview-edge-marching");
    stripWireRevealStroke(wire.path, wire.glow);
    expect(wire.path.style.strokeDasharray).toBe("");
    expect(wire.glow.style.strokeDasharray).toBe("");
    expect(wire.path.classList.contains("preview-edge-drawing")).toBe(false);
    expect(wire.glow.classList.contains("preview-edge-glow-drawing")).toBe(false);
    expect(wire.path.classList.contains("preview-edge-marching")).toBe(false);
    expect(wire.glow.classList.contains("preview-edge-marching")).toBe(false);
  });
});
