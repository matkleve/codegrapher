import { useCallback, useEffect, useRef } from "react";
import { GraphFlowCanvas } from "@/components/graph/GraphFlowCanvas";
import { GraphEmptyState } from "@/components/graph/GraphEmptyState";
import { GraphMapControls } from "@/components/graph/GraphMapControls";
import { GraphNodeContextMenu } from "@/components/graph/GraphNodeContextMenu";
import { GraphPane } from "@/components/graph/GraphPane";
import { GraphToolbar } from "@/components/graph/GraphToolbar";
import { useGraphFlowController } from "@/components/graph/useGraphFlowController";
import { useGraphMapControls } from "@/components/graph/useGraphMapControls";
import { useGraphPathMode } from "@/components/graph/useGraphPathMode";
import { useGraphReadingFocus } from "@/components/graph/useGraphReadingFocus";
import type {
  GraphCanvasHandle,
  GraphCanvasProps,
} from "@/components/graph/graphCanvasTypes";
import { GraphInteractionProvider } from "@/context/GraphInteractionContext";
import { JumpTooltipProvider } from "@/context/JumpTooltipContext";
import { SimulationProvider } from "@/context/SimulationContext";
import { SimulationPanel, SimulationPreflight } from "@/components/simulation/SimulationPanel";
import { SimulationToolbar } from "@/components/simulation/SimulationToolbar";
import { cn } from "@/lib/utils";

interface GraphFlowInnerProps extends GraphCanvasProps {
  canvasRef: React.Ref<GraphCanvasHandle>;
}

export function GraphFlowInner({
  graphData,
  graphResetKey,
  onFileDrop,
  onLoadFile,
  loading,
  canvasRef,
}: GraphFlowInnerProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const syncGridRef = useRef<() => void>(() => {});
  const onRestoreSnapshotRef = useRef<() => void>(() => {});
  const syncGrid = useCallback(() => syncGridRef.current(), []);
  const onRestoreSnapshot = useCallback(() => onRestoreSnapshotRef.current(), []);

  const flow = useGraphFlowController({
    graphData,
    graphResetKey,
    onFileDrop,
    loading,
    canvasRef,
    syncGrid,
    onRestoreSnapshot,
  });

  const path = useGraphPathMode({
    nodes: flow.nodes,
    edges: flow.edges,
    setNodes: flow.setNodes,
    setEdges: flow.setEdges,
  });

  useEffect(() => {
    onRestoreSnapshotRef.current = path.clearPathMode;
  }, [path.clearPathMode]);

  const map = useGraphMapControls({
    gridRef,
    nodes: flow.nodes,
    syncGridRef,
  });

  const reading = useGraphReadingFocus({
    graphPaneRef: flow.graphPaneRef,
    nodes: flow.nodes,
    setNodes: flow.setNodes,
    graphResetKey,
    syncGrid: map.syncGrid,
  });

  return (
    <div className="pointer-events-auto relative flex min-h-0 min-w-0 flex-1 flex-col">
      {flow.graphError && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {flow.graphError}
        </div>
      )}

      {path.pathInfo && (
        <div className="pointer-events-none absolute top-14 left-1/2 z-20 -translate-x-1/2 rounded-md border border-ring bg-popover px-3.5 py-2 text-sm text-popover-foreground shadow-md">
          {path.pathInfo}
        </div>
      )}

      {path.pathFromId && (
        <p className="pointer-events-none absolute top-14 right-3 z-20 text-xs text-muted-foreground">
          Click target node…
        </p>
      )}

      <JumpTooltipProvider>
        <GraphInteractionProvider
          graphData={graphData}
          nodes={flow.nodes}
          setNodes={flow.setNodes}
          onLoadFile={onLoadFile}
          onFocusReadingMember={reading.focusReadingMember}
          onSelectReadingFocus={reading.selectReadingFocus}
        >
          <SimulationProvider>
            <GraphToolbar
              canGoBack={flow.canGoBack}
              canGoForward={flow.canGoForward}
              onLastGraph={flow.handleLastGraph}
              onNextGraph={flow.handleNextGraph}
              loading={loading}
            />

            <div className="flex min-h-0 min-w-0 flex-1">
              <GraphPane
                ref={flow.graphPaneRef}
                onClickCapture={reading.handleReadingFocusCapture}
                onDragOver={flow.handleDragOver}
                onDrop={flow.handleDrop}
              >
                <div
                  ref={gridRef}
                  aria-hidden
                  className={cn(
                    "graph-canvas-grid canvas-dot-grid pointer-events-none absolute inset-0 z-0",
                    !map.showGrid && "hidden",
                  )}
                />
                <GraphFlowCanvas
                  nodes={flow.nodes}
                  edges={flow.edges}
                  onNodesChange={flow.onNodesChange}
                  onEdgesChange={flow.onEdgesChange}
                  onNodeClick={path.onNodeClick}
                  onNodeContextMenu={path.onNodeContextMenu}
                  onPaneClick={path.onPaneClick}
                  onMove={map.onMove}
                />
                {!flow.hasGraph && !loading && (
                  <GraphEmptyState title={flow.emptyTitle} hint={flow.emptyHint} />
                )}
              </GraphPane>
              <SimulationPanel />
            </div>
            <SimulationToolbar />
            <SimulationPreflight />
            <GraphMapControls
              showGrid={map.showGrid}
              mapControlFlash={map.mapControlFlash}
              hasReadingFocus={reading.hasReadingFocus}
              onFlash={map.flashMapControl}
              onToggleGrid={map.toggleGrid}
              onFocusReadingView={reading.focusReadingView}
              onCenterView={map.centerView}
              onFitToScreen={map.fitToScreen}
            />
          </SimulationProvider>
        </GraphInteractionProvider>
      </JumpTooltipProvider>

      {path.contextMenu && (
        <GraphNodeContextMenu
          x={path.contextMenu.x}
          y={path.contextMenu.y}
          onFindPath={() => path.startPathFrom(path.contextMenu!.nodeId)}
        />
      )}
    </div>
  );
}
