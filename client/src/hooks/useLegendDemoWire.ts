import { type RefObject, useLayoutEffect, useState } from "react";
import { layoutLegendDemoWires } from "@/lib/legendDemoWireLayout";
import type { LegendConnectionKind } from "@/lib/connectionWireStyle";

type Side = "left" | "right";

export type DemoWireEndpoint = {
  id: string;
  fromSide?: Side;
  toSide?: Side;
};

export type DemoWireSpec =
  | {
      mode: "preview";
      kind: import("@/lib/previewEdgeTypes").PreviewConnectionKind;
      from: DemoWireEndpoint;
      to: DemoWireEndpoint;
    }
  | {
      mode: "branch";
      from: DemoWireEndpoint;
      to: DemoWireEndpoint[];
    }
  | {
      mode: "structural";
      from: DemoWireEndpoint;
      to: DemoWireEndpoint;
    };

import type { PreviewEdgeJunction } from "@/lib/previewEdgeJunction";

export type LegendDemoWireState = {
  paths: string[];
  junction: PreviewEdgeJunction | null;
};

export function useLegendDemoWire(
  rootRef: RefObject<HTMLElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  spec: DemoWireSpec | null,
  legendKind: LegendConnectionKind,
): LegendDemoWireState {
  const [state, setState] = useState<LegendDemoWireState>({
    paths: [],
    junction: null,
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg || !spec) {
      setState({ paths: [], junction: null });
      return;
    }

    const measure = (): void => {
      const svgBox = svg.getBoundingClientRect();
      setState(layoutLegendDemoWires(spec, root, svgBox));
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [legendKind, rootRef, spec, svgRef]);

  return state;
}
