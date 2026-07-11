import type { WireElements } from "@/lib/previewEdgeDom";
import type { StructuralWireElements } from "@/lib/structuralEdgeDom";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { StructuralEdgeSpec } from "@/lib/structuralEdgeTypes";
import type { Node } from "@xyflow/react";

const SETTLE_MS = 100;

export type WireEngine = {
  tickOnce: () => void;
  onTransformChange: () => void;
  dispose: () => void;
};

type WireLayer = {
  getSpecs: () => PreviewEdgeSpec[] | StructuralEdgeSpec[];
  getWires: () => Map<string, WireElements | StructuralWireElements>;
  update: (
    wire: WireElements | StructuralWireElements,
    box: DOMRect,
    getNode: (id: string) => Node | undefined,
  ) => boolean;
};

type WireEngineOptions = {
  getSvg: () => SVGSVGElement | null;
  getNode: (id: string) => Node | undefined;
  layers: WireLayer[];
};

export function createWireEngine(options: WireEngineOptions): WireEngine {
  let raf = 0;
  let settleTimer = 0;

  const tickOnce = (): void => {
    const svg = options.getSvg();
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const hasSpecs = options.layers.some((layer) => layer.getSpecs().length > 0);
    if (!hasSpecs) return;

    for (const layer of options.layers) {
      for (const spec of layer.getSpecs()) {
        const wire = layer.getWires().get(spec.id);
        if (wire) layer.update(wire, box, options.getNode);
      }
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
    const hasSpecs = options.layers.some((layer) => layer.getSpecs().length > 0);
    if (!hasSpecs) return;
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
