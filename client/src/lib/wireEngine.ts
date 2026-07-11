import { updateWireGeometry, type WireElements } from "@/lib/previewEdgeDom";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { Node } from "@xyflow/react";

const SETTLE_MS = 100;

export type WireEngine = {
  tickOnce: () => void;
  onTransformChange: () => void;
  dispose: () => void;
};

type WireEngineOptions = {
  getSvg: () => SVGSVGElement | null;
  getSpecs: () => PreviewEdgeSpec[];
  getWires: () => Map<string, WireElements>;
  getNode: (id: string) => Node | undefined;
};

export function createWireEngine(options: WireEngineOptions): WireEngine {
  let raf = 0;
  let settleTimer = 0;

  const tickOnce = (): void => {
    const svg = options.getSvg();
    if (!svg || options.getSpecs().length === 0) return;
    const box = svg.getBoundingClientRect();
    for (const spec of options.getSpecs()) {
      const wire = options.getWires().get(spec.id);
      if (wire) updateWireGeometry(wire, box, options.getNode);
    }
  };

  const stopLoop = (): void => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const scheduleSettle = (): void => {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      stopLoop();
      tickOnce();
    }, SETTLE_MS);
  };

  const loop = (): void => {
    tickOnce();
    raf = requestAnimationFrame(loop);
  };

  const onTransformChange = (): void => {
    if (options.getSpecs().length === 0) return;
    if (!raf) {
      raf = requestAnimationFrame(loop);
    }
    scheduleSettle();
  };

  const dispose = (): void => {
    stopLoop();
    window.clearTimeout(settleTimer);
  };

  return { tickOnce, onTransformChange, dispose };
}

let activeEngine: WireEngine | null = null;

export function registerWireEngine(engine: WireEngine | null): void {
  activeEngine = engine;
}

export function notifyWireTransform(): void {
  activeEngine?.onTransformChange();
}
