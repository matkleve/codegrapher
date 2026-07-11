import { useLayoutEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { ConnectorChip } from "@/components/code/ConnectorChip";
import { LoadTargetPicker } from "@/components/graph/LoadTargetPicker";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { useLoadTargetAction } from "@/hooks/useLoadTargetAction";
import { fromExternalCards } from "@/lib/loadTargets";
import { refinePreviewEdge } from "@/lib/resolveLiveAnchor";
import { resolvePreviewAnchor } from "@/lib/resolvePreviewAnchor";
import type { PreviewEdgeSpec } from "@/lib/previewEdgeTypes";
import type { SemanticTokenKind } from "@/lib/tokenColors";

const LOAD_STUB_OFFSET_PX = 72;

type PickerState = {
  token: string;
  targets: ReturnType<typeof fromExternalCards>;
  anchor: { x: number; y: number };
  contextFilePath?: string;
  kind: SemanticTokenKind;
};

function loadSocketSide(flip: boolean): "left" | "right" {
  return flip ? "left" : "right";
}

function positionChip(
  chip: HTMLElement,
  spec: PreviewEdgeSpec,
  svgBox: DOMRect,
  getNode: (id: string) => ReturnType<ReturnType<typeof useReactFlow>["getNode"]>,
): boolean {
  const { to } = refinePreviewEdge(spec, getNode);
  const toPt = resolvePreviewAnchor(to, svgBox, "to");
  if (!toPt) {
    chip.style.display = "none";
    return false;
  }
  const flip = toPt.x - LOAD_STUB_OFFSET_PX < 8;
  const x = flip ? toPt.x + LOAD_STUB_OFFSET_PX : toPt.x - LOAD_STUB_OFFSET_PX;
  chip.dataset.loadSocket = loadSocketSide(flip);
  chip.style.display = "";
  chip.style.left = `${x}px`;
  chip.style.top = `${toPt.y}px`;
  return true;
}

type LoadChipProps = {
  spec: PreviewEdgeSpec;
  onActivate: (spec: PreviewEdgeSpec) => void;
  onEnter: () => void;
  chipRef: (el: HTMLSpanElement | null) => void;
};

function LoadChip({ spec, onActivate, onEnter, chipRef }: LoadChipProps) {
  const count = spec.load?.candidates.length ?? spec.load?.occurrenceCount ?? 1;
  const isCallSite = spec.load?.direction === "callSite";
  const label = count > 1 ? `Load · ${count} files` : "Load";

  return (
    <ConnectorChip
      ref={chipRef}
      variant="load"
      kind={spec.kind}
      label={label}
      showLeftSocket
      showRightSocket
      role="button"
      tabIndex={0}
      data-load-edge-id={spec.id}
      data-load-socket="right"
      className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
      title={
        count > 1
          ? isCallSite
            ? `Choose which caller file to load (${count} in project)`
            : `Choose which file to load (${count} definitions in repo)`
          : isCallSite
            ? "Load file with a call site"
            : "Load definition into graph"
      }
      onMouseEnter={onEnter}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onActivate(spec);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onActivate(spec);
        }
      }}
    />
  );
}

export function LoadConnector() {
  const { previewEdges, cancelHoverLeaveGrace } = useGraphInteraction();
  const loadTarget = useLoadTargetAction();
  const { getNode } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<Map<string, HTMLSpanElement>>(new Map());
  const specsRef = useRef<PreviewEdgeSpec[]>([]);
  const [picker, setPicker] = useState<PickerState | null>(null);

  const loadSpecs = previewEdges.filter((e) => e.load);
  const loadEdgeKey = loadSpecs.map((e) => e.id).join(",");

  useLayoutEffect(() => {
    specsRef.current = loadSpecs;
  }, [loadSpecs]);

  useLayoutEffect(() => {
    if (!loadEdgeKey) return;

    let raf = 0;
    const tick = () => {
      const container = containerRef.current;
      if (!container) return;
      const box = container.getBoundingClientRect();
      const svgBox = new DOMRect(box.left, box.top, box.width, box.height);
      for (const spec of specsRef.current) {
        const chip = chipsRef.current.get(spec.id);
        if (chip) positionChip(chip, spec, svgBox, getNode);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [getNode, loadEdgeKey]);

  const handleActivate = (spec: PreviewEdgeSpec) => {
    cancelHoverLeaveGrace();
    const load = spec.load;
    if (!load) return;

    const candidates = load.candidates ?? [];
    if (candidates.length > 1) {
      const chip = chipsRef.current.get(spec.id);
      const rect = chip?.getBoundingClientRect();
      if (!rect) return;
      setPicker({
        token: load.token,
        targets: fromExternalCards(candidates),
        anchor: { x: rect.left + rect.width / 2, y: rect.bottom },
        kind: spec.kind,
      });
      return;
    }

    loadTarget(load.filePath);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 z-[48] overflow-visible"
        aria-hidden={!loadEdgeKey}
      >
        {loadSpecs.map((spec) => (
          <LoadChip
            key={spec.id}
            spec={spec}
            onActivate={handleActivate}
            onEnter={cancelHoverLeaveGrace}
            chipRef={(el) => {
              if (el) chipsRef.current.set(spec.id, el);
              else chipsRef.current.delete(spec.id);
            }}
          />
        ))}
      </div>

      {picker ? (
        <LoadTargetPicker
          token={picker.token}
          targets={picker.targets}
          anchor={picker.anchor}
          contextFilePath={picker.contextFilePath}
          kind={picker.kind}
          onSelect={loadTarget}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </>
  );
}
