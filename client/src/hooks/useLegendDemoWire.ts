import { type RefObject, useLayoutEffect, useState } from "react";
import {
  branchJunctionPoint,
  layoutBranchFanPaths,
  previewWirePath,
} from "@/lib/wirePaths";
import { cubicPath } from "@/lib/resolvePreviewAnchor";
import type { LegendConnectionKind } from "@/lib/connectionWireStyle";
import type { PreviewConnectionKind } from "@/lib/previewEdgeTypes";

type Side = "left" | "right";

export type DemoWireEndpoint = {
  id: string;
  fromSide?: Side;
  toSide?: Side;
};

export type DemoWireSpec =
  | {
      mode: "preview";
      kind: PreviewConnectionKind;
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

export type LegendDemoWireState = {
  paths: string[];
  junction: { x: number; y: number } | null;
};

function anchorPort(
  el: HTMLElement,
  svgBox: DOMRect,
  side: Side,
): { x: number; y: number; side: Side } {
  const r = el.getBoundingClientRect();
  const y = r.top + r.height / 2 - svgBox.top;
  const x =
    side === "right" ? r.right - svgBox.left : r.left - svgBox.left;
  return { x, y, side };
}

function resolveEl(
  root: HTMLElement,
  id: string,
): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-demo-anchor="${id}"]`);
}

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
      if (svgBox.width <= 0 || svgBox.height <= 0) {
        setState({ paths: [], junction: null });
        return;
      }

      if (spec.mode === "branch") {
        const fromEl = resolveEl(root, spec.from.id);
        if (!fromEl) {
          setState({ paths: [], junction: null });
          return;
        }
        const from = anchorPort(fromEl, svgBox, spec.from.fromSide ?? "right");
        const spurs = spec.to
          .map((target) => {
            const toEl = resolveEl(root, target.id);
            if (!toEl) return null;
            const to = anchorPort(toEl, svgBox, target.toSide ?? "left");
            return { x2: to.x, y2: to.y, toEl };
          })
          .filter((spur): spur is NonNullable<typeof spur> => spur != null);

        const paths = layoutBranchFanPaths(
          from.x,
          from.y,
          fromEl,
          spurs,
          svgBox,
        );
        const junction = branchJunctionPoint(
          from.x,
          from.y,
          fromEl,
          spurs,
          svgBox,
        );
        setState({ paths, junction });
        return;
      }

      const fromEl = resolveEl(root, spec.from.id);
      const toEl = resolveEl(root, spec.to.id);
      if (!fromEl || !toEl) {
        setState({ paths: [], junction: null });
        return;
      }

      const fromSide = spec.from.fromSide ?? "right";
      const toSide = spec.to.toSide ?? "left";
      const from = anchorPort(fromEl, svgBox, fromSide);
      const to = anchorPort(toEl, svgBox, toSide);

      if (spec.mode === "preview") {
        setState({
          paths: [
            previewWirePath({
              connectionKind: spec.kind,
              x1: from.x,
              y1: from.y,
              x2: to.x,
              y2: to.y,
              fromSide,
              toSide,
              fromEl,
              toEl,
              svgBox,
            }),
          ],
          junction: null,
        });
        return;
      }

      setState({
        paths: [
          cubicPath(from.x, from.y, to.x, to.y, fromSide, toSide, {
            clearance: 18,
          }),
        ],
        junction: null,
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [legendKind, rootRef, spec, svgRef]);

  return state;
}
