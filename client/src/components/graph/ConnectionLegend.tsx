import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Waypoints } from "lucide-react";
import { ConnectionLegendKindDemo } from "@/components/graph/ConnectionLegendKindDemo";
import { GraphMapControlSlot } from "@/components/graph/GraphMapControlSlot";
import { InteractiveListRow } from "@/components/ui/InteractiveListRow";
import { FloatingPanel } from "@/components/ui/floatingPanel";
import { WireMarkerDefs } from "@/components/graph/WireMarkerDefs";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { INTERACTIVE_TOGGLE_ACTIVE } from "@/lib/controlTokens";
import {
  computeActiveConnectionKinds,
  computePulsingConnectionKinds,
  CONNECTION_KIND_DESCRIPTION,
  CONNECTION_KIND_LABEL,
  LEGEND_CONNECTION_KINDS,
  legendSwatchClasses,
  wireStyleForKind,
  type LegendConnectionKind,
} from "@/lib/connectionWireStyle";
import { cn } from "@/lib/utils";
import { useViewportAnchoredPosition } from "@/hooks/useViewportAnchoredPosition";

const DETAIL_PANEL_GAP = 10;
const DETAIL_WIDTH_PX = 304;

type DetailAnchor = {
  panelLeft: number;
  rowCenterY: number;
};

type ConnectionLegendProps = {
  flashKey: string;
  activeFlashKey: string | null;
  onFlash: (key: string) => void;
};

function LegendSwatch({
  kind,
  visible,
  firing,
  pulse,
}: {
  kind: LegendConnectionKind;
  visible: boolean;
  firing: boolean;
  pulse: boolean;
}) {
  const def = wireStyleForKind(kind);
  const pathClass = legendSwatchClasses(kind, { pulse }).join(" ");

  return (
    <svg
      className={cn(
        "connection-legend-swatch",
        !visible && "connection-legend-swatch--inactive",
        visible && !firing && "connection-legend-swatch--idle",
        visible && firing && "connection-legend-swatch--firing",
      )}
      viewBox="0 1 56 14"
      aria-hidden
    >
      <defs>
        <WireMarkerDefs />
      </defs>
      {def.legendPathD ? (
        <path
          d={def.legendPathD}
          fill="none"
          className={cn("connection-legend-swatch-line", pathClass)}
          stroke={def.stroke}
          markerEnd={`url(#${def.markerId})`}
          markerStart={
            def.markerStartId ? `url(#${def.markerStartId})` : undefined
          }
        />
      ) : (
        <line
          x1={8}
          y1={8}
          x2={42}
          y2={8}
          className={cn("connection-legend-swatch-line", pathClass)}
          stroke={def.stroke}
          markerEnd={`url(#${def.markerId})`}
        />
      )}
      {kind === "branch" ? (
        <circle
          cx={8}
          cy={5}
          r={2}
          className="preview-edge-junction"
          fill={def.stroke}
        />
      ) : null}
    </svg>
  );
}

function ConnectionLegendDetail({
  kind,
  active,
  anchor,
  panelRef,
}: {
  kind: LegendConnectionKind;
  active: boolean;
  anchor: DetailAnchor;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const position = useViewportAnchoredPosition(
    panelRef,
    { x: anchor.panelLeft, y: anchor.rowCenterY },
    {
      mode: "beside-left",
      gap: DETAIL_PANEL_GAP,
      viewportMargin: 8,
    },
  );

  return createPortal(
    <FloatingPanel
      ref={panelRef}
      variant="chrome"
      className="connection-legend-detail px-3 py-2"
      style={{
        position: "fixed",
        zIndex: 60,
        width: DETAIL_WIDTH_PX,
        left: position?.left ?? anchor.panelLeft - DETAIL_WIDTH_PX - DETAIL_PANEL_GAP,
        top: position?.top ?? anchor.rowCenterY,
        visibility: position ? "visible" : "hidden",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="connection-legend-detail-title">
        {CONNECTION_KIND_LABEL[kind]}
      </p>
      <p className="connection-legend-detail-copy">
        {CONNECTION_KIND_DESCRIPTION[kind]}
      </p>
      <ConnectionLegendKindDemo kind={kind} active={active} />
    </FloatingPanel>,
    document.body,
  );
}

export function ConnectionLegend({
  flashKey,
  activeFlashKey,
  onFlash,
}: ConnectionLegendProps) {
  const {
    isEdgeKindVisible,
    toggleEdgeKind,
    previewEdges,
    structuralEdges,
    pulseEdges,
  } = useGraphInteraction();
  const [open, setOpen] = useState(false);
  const [hoveredKind, setHoveredKind] = useState<LegendConnectionKind | null>(
    null,
  );
  const [detailAnchor, setDetailAnchor] = useState<DetailAnchor | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const legendPanelRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);
  const openedAtRef = useRef(0);

  const activeKinds = useMemo(
    () => computeActiveConnectionKinds(previewEdges, structuralEdges, pulseEdges),
    [previewEdges, structuralEdges, pulseEdges],
  );

  const pulsingKinds = useMemo(
    () => computePulsingConnectionKinds(pulseEdges),
    [pulseEdges],
  );

  const focusedVisible = hoveredKind ? isEdgeKindVisible(hoveredKind) : false;

  const showDetail = (
    kind: LegendConnectionKind,
    rowEl: HTMLElement,
  ) => {
    const panel = legendPanelRef.current;
    if (!panel) return;
    const rowRect = rowEl.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    setHoveredKind(kind);
    setDetailAnchor({
      panelLeft: panelRect.left,
      rowCenterY: rowRect.top + rowRect.height / 2,
    });
  };

  useEffect(() => {
    if (open) openedAtRef.current = Date.now();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (hoveredKind) {
        setHoveredKind(null);
        setDetailAnchor(null);
        return;
      }
      setOpen(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (Date.now() - openedAtRef.current < 120) return;
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (detailPanelRef.current?.contains(target)) return;
      setOpen(false);
      setHoveredKind(null);
      setDetailAnchor(null);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown, { capture: true });
    };
  }, [open, hoveredKind]);

  return (
    <GraphMapControlSlot
      ref={rootRef}
      flashKey={flashKey}
      activeFlashKey={activeFlashKey}
      onFlash={onFlash}
      variant="secondary"
      className={open ? INTERACTIVE_TOGGLE_ACTIVE : undefined}
      label="Connection legend"
      labelVisibility={open ? "hidden" : "hover"}
      icon={<Waypoints />}
      aria-expanded={open}
      aria-pressed={open}
      onClick={() => setOpen((v) => !v)}
    >
      {open ? (
        <FloatingPanel
          ref={legendPanelRef}
          variant="chrome"
          className="connection-legend-panel absolute right-0 bottom-full z-50 mb-2 px-1 py-1"
          role="dialog"
          aria-label="Connection kinds"
        >
          <ul className="flex flex-col gap-0.5">
            {LEGEND_CONNECTION_KINDS.map((kind) => {
              const visible = isEdgeKindVisible(kind);
              const firing = activeKinds.has(kind);
              const focused = hoveredKind === kind;
              return (
                <li key={kind}>
                  <InteractiveListRow
                    density="legend"
                    tone={visible ? "default" : "passive"}
                    emphasis={firing ? "live" : "default"}
                    className={cn(
                      "connection-legend-row",
                      focused && "list-row-legend-focused",
                    )}
                    title={CONNECTION_KIND_LABEL[kind]}
                    aria-pressed={visible}
                    onMouseEnter={(e) => showDetail(kind, e.currentTarget)}
                    onFocus={(e) => showDetail(kind, e.currentTarget)}
                    onClick={() => toggleEdgeKind(kind)}
                    leading={
                      <LegendSwatch
                        kind={kind}
                        visible={visible}
                        firing={firing}
                        pulse={pulsingKinds.has(kind)}
                      />
                    }
                  />
                </li>
              );
            })}
          </ul>
        </FloatingPanel>
      ) : null}
      {open && hoveredKind && detailAnchor ? (
        <ConnectionLegendDetail
          kind={hoveredKind}
          active={focusedVisible}
          anchor={detailAnchor}
          panelRef={detailPanelRef}
        />
      ) : null}
    </GraphMapControlSlot>
  );
}
