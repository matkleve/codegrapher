import { memo, useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  Handle,
  NodeResizeControl,
  Position,
  type NodeProps,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { PREVIEW_TARGET_TOP } from "@/lib/ctrlPreviewHandles";
import { CollapsibleMemberRow } from "@/components/nodes/CollapsibleMemberRow";
import { ExpandChevron } from "@/components/nodes/ExpandChevron";
import { FileTypeChip } from "@/components/nodes/FileTypeChip";
import { NodeCardHeader } from "@/components/nodes/NodeCardHeader";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import {
  CLASS_NODE_MIN_HEIGHT,
  computeClassNodeHeight,
  fitLayoutToHeight,
  layoutPreferenceFromData,
  resolveNodeHeight,
} from "@/lib/classNodeLayout";
import { camelToWords } from "@/lib/camelToWords";
import { cn } from "@/lib/utils";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

function MemberSection({
  label,
  expanded,
  onToggle,
  bulkActionLabel,
  onBulkAction,
  children,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  bulkActionLabel: string;
  onBulkAction: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="nodrag flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <ExpandChevron expanded={expanded} className="text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </button>
        <button
          type="button"
          className="nodrag shrink-0 cursor-pointer rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-primary/10 hover:text-foreground"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onBulkAction();
          }}
        >
          {bulkActionLabel}
        </button>
      </div>
      {expanded ? <div className="flex flex-col gap-2">{children}</div> : null}
    </section>
  );
}

function ClassNodeComponent({ id, data, selected, width }: NodeProps) {
  const nodeData = data as ClassNodeData;
  const bodyExpanded = !(nodeData.collapsed ?? false);
  const nodeWidth = nodeData.width ?? width ?? CLASS_NODE_DEFAULT_WIDTH;
  const nodeHeight = nodeData.height;
  const cardRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const withPreference = useCallback(
    (patch: Partial<ClassNodeData>): Partial<ClassNodeData> => {
      if (patch.layoutPreference !== undefined) return patch;
      const merged = { ...nodeData, ...patch };
      return { ...patch, layoutPreference: layoutPreferenceFromData(merged) };
    },
    [nodeData],
  );

  const commitNode = useCallback(
    (
      patch: Partial<ClassNodeData>,
      size?: { width: number; height?: number },
      opts?: { keepPreference?: boolean },
    ) => {
      const nextPatch = opts?.keepPreference ? patch : withPreference(patch);
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id !== id || n.type !== "class") return n;
          const prev = n.data as ClassNodeData;
          const nextData = { ...prev, ...nextPatch };
          const w = size?.width ?? nextData.width ?? nodeWidth;
          let h = size?.height ?? nextData.height;
          if (nextData.collapsed && typeof h === "number") {
            h = Math.max(CLASS_NODE_MIN_HEIGHT, h);
          }
          return {
            ...n,
            width: w,
            height: h,
            style: { ...n.style, width: w, ...(h != null ? { height: h } : {}) },
            data: { ...nextData, width: w, height: h },
          };
        }),
      );
      requestAnimationFrame(() => updateNodeInternals(id));
    },
    [id, nodeWidth, setNodes, updateNodeInternals, withPreference],
  );

  const toggleMember = useCallback(
    (
      memberId: string,
      kind: "property" | "method",
    ) => {
      const expandedKey =
        kind === "property" ? "expandedPropertyIds" : "expandedMethodIds";
      const expanded = new Set(
        kind === "property"
          ? nodeData.expandedPropertyIds
          : nodeData.expandedMethodIds,
      );
      const pinned = new Set(nodeData.pinnedMemberIds ?? []);
      const opening = !expanded.has(memberId);

      if (opening) {
        expanded.add(memberId);
        pinned.add(memberId);
      } else {
        expanded.delete(memberId);
        pinned.delete(memberId);
      }

      const patch: Partial<ClassNodeData> = {
        pinnedMemberIds: [...pinned],
        [expandedKey]: [...expanded],
        ...(kind === "property"
          ? { propertiesSectionCollapsed: false }
          : { methodsSectionCollapsed: false }),
      };

      const mergedWithPatch: ClassNodeData = { ...nodeData, ...patch };
      let nextHeight = opening
        ? computeClassNodeHeight(mergedWithPatch)
        : (nodeHeight ?? computeClassNodeHeight(mergedWithPatch));
      if (!opening && nodeHeight != null) {
        Object.assign(
          patch,
          fitLayoutToHeight(mergedWithPatch, nextHeight, { ignorePinned: false }),
        );
        nextHeight = nodeHeight;
      }

      commitNode(
        { ...patch, height: nextHeight },
        { width: nodeWidth, height: nextHeight },
      );
    },
    [commitNode, nodeData, nodeHeight, nodeWidth],
  );

  const onToggleMethod = useCallback(
    (methodId: string) => toggleMember(methodId, "method"),
    [toggleMember],
  );

  const onToggleProperty = useCallback(
    (propertyId: string) => toggleMember(propertyId, "property"),
    [toggleMember],
  );

  const onToggleCollapsed = useCallback(() => {
    const collapsed = bodyExpanded;
    const patch: Partial<ClassNodeData> = { collapsed };
    const merged = { ...nodeData, ...patch };
    const nextHeight = computeClassNodeHeight(merged);
    commitNode({ ...patch, height: nextHeight }, { width: nodeWidth, height: nextHeight });
  }, [bodyExpanded, commitNode, nodeData, nodeWidth]);

  const propertiesSectionExpanded = !(nodeData.propertiesSectionCollapsed ?? false);
  const methodsSectionExpanded = !(nodeData.methodsSectionCollapsed ?? false);

  const onTogglePropertiesSection = useCallback(() => {
    const collapsing = propertiesSectionExpanded;
    const patch: Partial<ClassNodeData> = {
      propertiesSectionCollapsed: collapsing,
      ...(collapsing ? { expandedPropertyIds: [] } : {}),
    };
    const merged = { ...nodeData, ...patch };
    const nextHeight = collapsing
      ? computeClassNodeHeight(merged)
      : resolveNodeHeight(merged, nodeHeight ?? undefined);
    commitNode({ ...patch, height: nextHeight }, { width: nodeWidth, height: nextHeight });
  }, [commitNode, nodeData, nodeHeight, nodeWidth, propertiesSectionExpanded]);

  const onToggleMethodsSection = useCallback(() => {
    const collapsing = methodsSectionExpanded;
    const patch: Partial<ClassNodeData> = {
      methodsSectionCollapsed: collapsing,
      ...(collapsing ? { expandedMethodIds: [] } : {}),
    };
    const merged = { ...nodeData, ...patch };
    const nextHeight = collapsing
      ? computeClassNodeHeight(merged)
      : resolveNodeHeight(merged, nodeHeight ?? undefined);
    commitNode({ ...patch, height: nextHeight }, { width: nodeWidth, height: nextHeight });
  }, [commitNode, methodsSectionExpanded, nodeData, nodeHeight, nodeWidth]);

  const anyPropertiesExpanded = nodeData.expandedPropertyIds.length > 0;
  const anyMethodsExpanded = nodeData.expandedMethodIds.length > 0;

  const onBulkToggleProperties = useCallback(() => {
    if (anyPropertiesExpanded) {
      const pinned = (nodeData.pinnedMemberIds ?? []).filter((pid) =>
        nodeData.methods.some((m) => m.id === pid),
      );
      const merged: ClassNodeData = {
        ...nodeData,
        expandedPropertyIds: [],
        pinnedMemberIds: pinned,
      };
      const h = computeClassNodeHeight(merged);
      commitNode(
        {
          expandedPropertyIds: [],
          pinnedMemberIds: pinned,
          height: h,
        },
        { width: nodeWidth, height: h },
      );
      return;
    }
    const pinned = new Set([
      ...(nodeData.pinnedMemberIds ?? []),
      ...nodeData.properties.map((p) => p.id),
    ]);
    const merged: ClassNodeData = {
      ...nodeData,
      propertiesSectionCollapsed: false,
      expandedPropertyIds: nodeData.properties.map((p) => p.id),
      pinnedMemberIds: [...pinned],
    };
    const nextHeight = resolveNodeHeight(merged, nodeHeight ?? undefined);
    commitNode(
      {
        propertiesSectionCollapsed: false,
        expandedPropertyIds: merged.expandedPropertyIds,
        pinnedMemberIds: merged.pinnedMemberIds,
        height: nextHeight,
      },
      { width: nodeWidth, height: nextHeight },
    );
  }, [anyPropertiesExpanded, commitNode, nodeData, nodeWidth]);

  const onBulkToggleMethods = useCallback(() => {
    if (anyMethodsExpanded) {
      const pinned = (nodeData.pinnedMemberIds ?? []).filter((pid) =>
        nodeData.properties.some((p) => p.id === pid),
      );
      const merged: ClassNodeData = {
        ...nodeData,
        expandedMethodIds: [],
        pinnedMemberIds: pinned,
      };
      const h = computeClassNodeHeight(merged);
      commitNode(
        {
          expandedMethodIds: [],
          pinnedMemberIds: pinned,
          height: h,
        },
        { width: nodeWidth, height: h },
      );
      return;
    }
    const pinned = new Set([
      ...(nodeData.pinnedMemberIds ?? []),
      ...nodeData.methods.map((m) => m.id),
    ]);
    const merged: ClassNodeData = {
      ...nodeData,
      methodsSectionCollapsed: false,
      expandedMethodIds: nodeData.methods.map((m) => m.id),
      pinnedMemberIds: [...pinned],
    };
    const nextHeight = resolveNodeHeight(merged, nodeHeight ?? undefined);
    commitNode(
      {
        methodsSectionCollapsed: false,
        expandedMethodIds: merged.expandedMethodIds,
        pinnedMemberIds: merged.pinnedMemberIds,
        height: nextHeight,
      },
      { width: nodeWidth, height: nextHeight },
    );
  }, [anyMethodsExpanded, commitNode, nodeData, nodeWidth]);

  const onResize = useCallback(
    (_event: unknown, params: { width: number; height: number }) => {
      isResizingRef.current = true;
      const fitted = fitLayoutToHeight(
        { ...nodeData, width: params.width, collapsed: false },
        params.height,
        { ignorePinned: true },
      );
      const height = fitted.collapsed
        ? CLASS_NODE_MIN_HEIGHT
        : params.height;
      commitNode(
        {
          width: params.width,
          height,
          ...fitted,
        },
        { width: params.width, height },
        { keepPreference: true },
      );
    },
    [commitNode, nodeData],
  );

  const onResizeEnd = useCallback(() => {
    isResizingRef.current = false;
  }, []);

  const title = camelToWords(nodeData.label);

  useLayoutEffect(() => {
    if (bodyExpanded) return;
    const el = cardRef.current;
    if (!el) return;

    const prevHeight = el.style.height;
    el.style.height = "auto";
    const measured = Math.max(
      CLASS_NODE_MIN_HEIGHT,
      Math.ceil(el.scrollHeight),
    );
    el.style.height = prevHeight;

    if (nodeHeight != null && Math.abs(measured - nodeHeight) <= 1) return;
    commitNode({}, { width: nodeWidth, height: measured }, { keepPreference: true });
  }, [
    bodyExpanded,
    commitNode,
    nodeData.filePath,
    nodeData.label,
    nodeHeight,
    nodeWidth,
  ]);

  const contentTallerThanNode =
    nodeHeight != null &&
    computeClassNodeHeight(nodeData) > nodeHeight + 2;
  const hasProperties = nodeData.properties.length > 0;
  const hasMethods = nodeData.methods.length > 0;

  return (
    <div
      ref={cardRef}
      className={cn(
        "class-node-root relative flex flex-col rounded-lg border border-border text-left shadow-sm",
        bodyExpanded ? "h-full overflow-hidden bg-card" : "shrink-0 overflow-visible bg-accent",
        (selected || nodeData.selected) && "ring-2 ring-ring",
        nodeData.pathHighlighted && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
      style={{
        width: nodeWidth,
        ...(bodyExpanded
          ? { height: nodeHeight }
          : { minHeight: CLASS_NODE_MIN_HEIGHT }),
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id={PREVIEW_TARGET_TOP}
        className="!h-1 !w-1 !border-0 !bg-transparent !opacity-0"
      />
      <NodeCardHeader
        title={title}
        chip={<FileTypeChip filePath={nodeData.filePath} />}
        bodyExpanded={bodyExpanded}
        onToggleCollapsed={onToggleCollapsed}
      />
      {bodyExpanded && (
        <div
          className={cn(
            "nodrag flex min-h-0 flex-col gap-2 p-3",
            contentTallerThanNode ? "flex-1 overflow-y-auto scrollbar-thin" : "shrink-0",
          )}
        >
          {hasProperties && (
            <MemberSection
              label="Properties"
              expanded={propertiesSectionExpanded}
              onToggle={onTogglePropertiesSection}
              bulkActionLabel={anyPropertiesExpanded ? "Close all" : "Open all"}
              onBulkAction={onBulkToggleProperties}
            >
              {nodeData.properties.map((p) => (
                <CollapsibleMemberRow
                  key={p.id}
                  memberId={p.id}
                  label={p.label}
                  code={p.code}
                  expanded={nodeData.expandedPropertyIds.includes(p.id)}
                  onToggle={onToggleProperty}
                  flowNodeId={id}
                  graphNodeId={nodeData.graphNodeId}
                  filePath={nodeData.filePath}
                />
              ))}
            </MemberSection>
          )}
          {hasProperties && hasMethods ? (
            <div className="border-t border-border" role="separator" />
          ) : null}
          {hasMethods && (
            <MemberSection
              label="Methods"
              expanded={methodsSectionExpanded}
              onToggle={onToggleMethodsSection}
              bulkActionLabel={anyMethodsExpanded ? "Close all" : "Open all"}
              onBulkAction={onBulkToggleMethods}
            >
              {nodeData.methods.map((m) => (
                <CollapsibleMemberRow
                  key={m.id}
                  memberId={m.id}
                  label={m.label}
                  code={m.code}
                  expanded={nodeData.expandedMethodIds.includes(m.id)}
                  onToggle={onToggleMethod}
                  flowNodeId={id}
                  graphNodeId={nodeData.graphNodeId}
                  filePath={nodeData.filePath}
                />
              ))}
            </MemberSection>
          )}
        {!hasProperties && !hasMethods ? (
          <p className="text-left text-xs text-muted-foreground">No members</p>
        ) : null}
        </div>
      )}
      <NodeResizeControl
        position="bottom-right"
        minWidth={200}
        minHeight={CLASS_NODE_MIN_HEIGHT}
        isVisible={selected}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
        className="class-node-resizer-handle nodrag"
      />
    </div>
  );
}

export const ClassNode = memo(ClassNodeComponent);
