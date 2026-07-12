import { describe, expect, it } from "vitest";
import { playWireReveal, WIRE_REVEAL_MS } from "@/lib/wireReveal";
import type { WireElements } from "@/lib/previewEdgeDom";

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
  return { spec: {} as WireElements["spec"], group, glow, path, junction: document.createElementNS("http://www.w3.org/2000/svg", "g"), hitFrom: path, hitTo: path, hitMid: path };
}

describe("playWireReveal", () => {
  it("arms dash draw classes on path and glow", () => {
    const wire = mockWire();
    playWireReveal(wire, 0);
    expect(wire.path.classList.contains("preview-edge-drawing")).toBe(true);
    expect(wire.glow.classList.contains("preview-edge-glow-drawing")).toBe(true);
    expect(wire.path.style.strokeDasharray).toBeTruthy();
    expect(wire.glow.style.strokeDasharray).toBeTruthy();
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
});
