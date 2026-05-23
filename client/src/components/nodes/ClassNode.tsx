import { memo, useCallback, type ReactNode } from "react";
import {
  Handle,
  NodeResizeControl,
  Position,
  type NodeProps,
  useReactFlow,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { CollapsibleMemberRow } from "@/components/nodes/CollapsibleMemberRow";
import { FileTypeChip } from "@/components/nodes/FileTypeChip";
import { NodeCardHeader } from "@/components/nodes/NodeCardHeader";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import { camelToWords } from "@/lib/camelToWords";
import { cn } from "@/lib/utils";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

function MemberSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <p className="text-left text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-2">{children}</div>
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
    <div
      className={cn(
        "relative rounded-lg border border-border bg-card text-left shadow-sm",
        (selected || nodeData.selected) && "ring-2 ring-ring",
        nodeData.pathHighlighted && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      )}
      style={{ width: nodeWidth }}
    >
      <NodeResizeControl
        position="bottom-right"
        minWidth={200}
        isVisible={selected}
        onResize={onResize}
        className="class-node-resizer-handle nodrag"
      />
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <NodeCardHeader
        title={title}
        chip={<FileTypeChip filePath={nodeData.filePath} />}
        bodyExpanded={bodyExpanded}
        onToggleCollapsed={onToggleCollapsed}
      />
      {bodyExpanded && (
        <div className="nodrag flex flex-col gap-2 px-3 py-2">
          {hasProperties && (
            <MemberSection label="Properties">
              {nodeData.properties.map((p) => (
                <CollapsibleMemberRow
                  key={p.id}
                  memberId={p.id}
                  label={p.label}
                  code={p.code}
                  expanded={nodeData.expandedPropertyIds.includes(p.id)}
                  onToggle={onToggleProperty}
                />
              ))}
            </MemberSection>
          )}
          {hasProperties && hasMethods ? (
            <div className="border-t border-border" role="separator" />
          ) : null}
          {hasMethods && (
            <MemberSection label="Methods">
              {nodeData.methods.map((m) => (
                <CollapsibleMemberRow
                  key={m.id}
                  memberId={m.id}
                  label={m.label}
                  code={m.code}
                  expanded={nodeData.expandedMethodIds.includes(m.id)}
                  onToggle={onToggleMethod}
                />
              ))}
            </MemberSection>
          )}
          {!hasProperties && !hasMethods ? (
            <p className="text-left text-xs text-muted-foreground">No members</p>
          ) : null}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  );
}

export const ClassNode = memo(ClassNodeComponent);
