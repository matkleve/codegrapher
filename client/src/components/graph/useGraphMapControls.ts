import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useReactFlow, type Node, type OnMove } from "@xyflow/react";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import { FIT_VIEW_PADDING } from "@/lib/flowLayout";
import { loadShowGrid, saveShowGrid, syncGridToViewport } from "@/lib/graphGrid";

export function useGraphMapControls(options: {
  gridRef: RefObject<HTMLDivElement | null>;
  nodes: Node[];
  syncGridRef?: RefObject<() => void>;
}) {
  const { gridRef, nodes, syncGridRef } = options;
  const { fitView, setViewport, getViewport, setCenter } = useReactFlow();
  const [showGrid, setShowGrid] = useState(loadShowGrid);
  const [mapControlFlash, setMapControlFlash] = useState<string | null>(null);
  const mapControlFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncGrid = useCallback(() => {
    const gridEl = gridRef.current;
    if (!gridEl || !showGrid) return;
    syncGridToViewport(getViewport(), gridEl);
  }, [getViewport, gridRef, showGrid]);

  useEffect(() => {
    if (syncGridRef) {
      syncGridRef.current = syncGrid;
    }
  }, [syncGrid, syncGridRef]);

  const flashMapControl = useCallback((key: string) => {
    if (mapControlFlashTimerRef.current) {
      clearTimeout(mapControlFlashTimerRef.current);
    }
    setMapControlFlash(key);
    mapControlFlashTimerRef.current = setTimeout(() => {
      setMapControlFlash(null);
      mapControlFlashTimerRef.current = null;
    }, 450);
  }, []);

  useEffect(
    () => () => {
      if (mapControlFlashTimerRef.current) {
        clearTimeout(mapControlFlashTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    syncGrid();
  }, [showGrid, syncGrid]);

  const onMove: OnMove = useCallback(() => {
    syncGrid();
  }, [syncGrid]);

  const toggleGrid = useCallback(() => {
    setShowGrid((on) => {
      const next = !on;
      saveShowGrid(next);
      return next;
    });
  }, []);

  const centerView = useCallback(() => {
    if (nodes.length > 0) {
      const vp = getViewport();
      const bounds = nodes.reduce(
        (acc, n) => {
          const w =
            typeof n.width === "number" ? n.width : CLASS_NODE_DEFAULT_WIDTH;
          const h = typeof n.height === "number" ? n.height : 120;
          const x1 = n.position.x;
          const y1 = n.position.y;
          const x2 = n.position.x + w;
          const y2 = n.position.y + h;
          return {
            minX: Math.min(acc.minX, x1),
            minY: Math.min(acc.minY, y1),
            maxX: Math.max(acc.maxX, x2),
            maxY: Math.max(acc.maxY, y2),
          };
        },
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
      );
      const cx = (bounds.minX + bounds.maxX) / 2;
      const cy = (bounds.minY + bounds.maxY) / 2;
      setCenter(cx, cy, { zoom: vp.zoom, duration: 200 });
    } else {
      setViewport({ x: 0, y: 0, zoom: 1 });
    }
    syncGrid();
  }, [getViewport, nodes, setCenter, setViewport, syncGrid]);

  const fitToScreen = useCallback(() => {
    if (nodes.length > 0) {
      fitView({ padding: FIT_VIEW_PADDING, duration: 200 });
      syncGrid();
    }
  }, [fitView, nodes.length, syncGrid]);

  return {
    showGrid,
    mapControlFlash,
    flashMapControl,
    syncGrid,
    toggleGrid,
    onMove,
    centerView,
    fitToScreen,
  };
}
