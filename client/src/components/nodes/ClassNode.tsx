import { memo, useCallback, type ReactNode } from "react";
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
  const nodeWidth = width ?? CLASS_NODE_DEFAULT_WIDTH;
  const { setNodes } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const patchNodeData = useCallback(
    (patch: Partial<ClassNodeData>) => {
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id !== id || n.type !== "class") return n;
          return { ...n, data: { ...(n.data as ClassNodeData), ...patch } };
        }),
      );
      requestAnimationFrame(() => updateNodeInternals(id));
    },
    [id, setNodes, updateNodeInternals],
  );

  const onToggleMethod = useCallback(
    (methodId: string) => {
      const expanded = new Set(nodeData.expandedMethodIds);
      if (expanded.has(methodId)) expanded.delete(methodId);
      else expanded.add(methodId);
      patchNodeData({ expandedMethodIds: [...expanded] });
    },
    [nodeData.expandedMethodIds, patchNodeData],
  );

  const onToggleProperty = useCallback(
    (propertyId: string) => {
      const expanded = new Set(nodeData.expandedPropertyIds);
      if (expanded.has(propertyId)) expanded.delete(propertyId);
      else expanded.add(propertyId);
      patchNodeData({ expandedPropertyIds: [...expanded] });
    },
    [nodeData.expandedPropertyIds, patchNodeData],
  );

  const onToggleCollapsed = useCallback(() => {
    patchNodeData({ collapsed: bodyExpanded });
  }, [bodyExpanded, patchNodeData]);

  const propertiesSectionExpanded = !(nodeData.propertiesSectionCollapsed ?? false);
  const methodsSectionExpanded = !(nodeData.methodsSectionCollapsed ?? false);

  const onTogglePropertiesSection = useCallback(() => {
    patchNodeData({ propertiesSectionCollapsed: propertiesSectionExpanded });
  }, [propertiesSectionExpanded, patchNodeData]);

  const onToggleMethodsSection = useCallback(() => {
    patchNodeData({ methodsSectionCollapsed: methodsSectionExpanded });
  }, [methodsSectionExpanded, patchNodeData]);

  const allPropertiesExpanded =
    nodeData.properties.length > 0 &&
    nodeData.properties.every((p) => nodeData.expandedPropertyIds.includes(p.id));

  const allMethodsExpanded =
    nodeData.methods.length > 0 &&
    nodeData.methods.every((m) => nodeData.expandedMethodIds.includes(m.id));

  const onBulkToggleProperties = useCallback(() => {
    if (allPropertiesExpanded) {
      patchNodeData({ expandedPropertyIds: [] });
      return;
    }
    patchNodeData({
      propertiesSectionCollapsed: false,
      expandedPropertyIds: nodeData.properties.map((p) => p.id),
    });
  }, [allPropertiesExpanded, nodeData.properties, patchNodeData]);

  const onBulkToggleMethods = useCallback(() => {
    if (allMethodsExpanded) {
      patchNodeData({ expandedMethodIds: [] });
      return;
    }
    patchNodeData({
      methodsSectionCollapsed: false,
      expandedMethodIds: nodeData.methods.map((m) => m.id),
    });
  }, [allMethodsExpanded, nodeData.methods, patchNodeData]);

  const applyWidth = useCallback(
    (nextWidth: number) => {
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id !== id) return n;
          return {
            ...n,
            width: nextWidth,
            height: undefined,
            style: { ...n.style, width: nextWidth },
          };
        }),
      );
      requestAnimationFrame(() => updateNodeInternals(id));
    },
    [id, setNodes, updateNodeInternals],
  );

  const onResize = useCallback(
    (_event: unknown, params: { width: number }) => {
      applyWidth(params.width);
    },
    [applyWidth],
  );

  const title = camelToWords(nodeData.label);
  const hasProperties = nodeData.properties.length > 0;
  const hasMethods = nodeData.methods.length > 0;

  return (
    <div className="relative" style={{ width: nodeWidth }}>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-border bg-card text-left shadow-sm",
          (selected || nodeData.selected) && "ring-2 ring-ring",
          nodeData.pathHighlighted && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        )}
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
        <div className="nodrag flex flex-col gap-2 p-3">
          {hasProperties && (
            <MemberSection
              label="Properties"
              expanded={propertiesSectionExpanded}
              onToggle={onTogglePropertiesSection}
              bulkActionLabel={allPropertiesExpanded ? "Close all" : "Open all"}
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
              bulkActionLabel={allMethodsExpanded ? "Close all" : "Open all"}
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
      </div>
      <NodeResizeControl
        position="bottom-right"
        minWidth={200}
        isVisible={selected}
        onResize={onResize}
        className="class-node-resizer-handle nodrag"
      />
    </div>
  );
}

export const ClassNode = memo(ClassNodeComponent);
