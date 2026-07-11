import { memo } from "react";
import {
  Handle,
  NodeResizeControl,
  Position,
  type NodeProps,
} from "@xyflow/react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { useGraphInteraction } from "@/context/GraphInteractionContext";
import { previewTargetTop } from "@/lib/ctrlPreviewHandles";
import { TOKEN_ANCHOR } from "@/lib/tokenColors";
import { CollapsibleMemberRow } from "@/components/nodes/CollapsibleMemberRow";
import { FileTypeChip } from "@/components/nodes/FileTypeChip";
import { MemberSection } from "@/components/nodes/MemberSection";
import { NodeCardHeader } from "@/components/nodes/NodeCardHeader";
import { CLASS_NODE_DEFAULT_WIDTH } from "@/components/nodes/graphNodeUi";
import { CLASS_NODE_MIN_HEIGHT } from "@/lib/classNodeLayout";
import { useClassNodeController } from "@/components/nodes/useClassNodeController";
import { camelToWords } from "@/lib/camelToWords";
import { cn } from "@/lib/utils";
import type { ClassNodeData } from "@/components/nodes/flowNodeData";

function ClassNodeComponent({ id, data, selected, width }: NodeProps) {
  const nodeData = data as ClassNodeData;
  const bodyExpanded = !(nodeData.collapsed ?? false);
  const nodeWidth = nodeData.width ?? width ?? CLASS_NODE_DEFAULT_WIDTH;
  const nodeHeight = nodeData.height;

  const {
    cardRef,
    propertiesSectionExpanded,
    methodsSectionExpanded,
    anyPropertiesExpanded,
    anyMethodsExpanded,
    onToggleMethod,
    onToggleProperty,
    onToggleCollapsed,
    onTogglePropertiesSection,
    onToggleMethodsSection,
    onBulkToggleProperties,
    onBulkToggleMethods,
    onResize,
    onResizeEnd,
  } = useClassNodeController({ id, nodeData, nodeWidth, nodeHeight, bodyExpanded });

  const { isHandleActive, edgeKindAtHandle } = useGraphInteraction();
  const classTargetId = previewTargetTop(id);
  const classTargetActive = isHandleActive(classTargetId);
  const classKind = edgeKindAtHandle(classTargetId);
  const classAnchorColor =
    classTargetActive && classKind ? TOKEN_ANCHOR[classKind] : "bg-border";

  const title = camelToWords(nodeData.label);
  const hasProperties = nodeData.properties.length > 0;
  const hasMethods = nodeData.methods.length > 0;

  return (
    <div
      ref={cardRef}
      data-flow-node-id={id}
      className={cn(
        "class-node-root relative flex flex-col overflow-visible border border-border/40 text-left",
        bodyExpanded ? "h-full bg-card" : "h-full shrink-0 bg-card",
        (selected || nodeData.selected) && "ring-1 ring-ring/50",
        nodeData.pathHighlighted && "ring-1 ring-ring ring-offset-1 ring-offset-background",
      )}
      style={{
        width: nodeWidth,
        height: nodeHeight ?? CLASS_NODE_MIN_HEIGHT,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        id={previewTargetTop(id)}
        className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
      />
      <FlowAnchor
        side="left"
        targetId={previewTargetTop(id)}
        size="node"
        visible
        highlighted={classTargetActive}
        colorClass={classAnchorColor}
      />
      <FlowAnchor
        side="right"
        targetId={previewTargetTop(id)}
        size="node"
        visible
        highlighted={classTargetActive}
        colorClass={classAnchorColor}
      />
      <NodeCardHeader
        title={title}
        symbolName={nodeData.label}
        filePath={nodeData.filePath}
        flowNodeId={id}
        graphNodeId={nodeData.graphNodeId}
        chip={<FileTypeChip filePath={nodeData.filePath} />}
        bodyExpanded={bodyExpanded}
        onToggleCollapsed={onToggleCollapsed}
      />
      {bodyExpanded && (
        <div className="nodrag flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3">
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
                  symbolName={p.symbolName}
                  code={p.code}
                  expanded={nodeData.expandedPropertyIds.includes(p.id)}
                  onToggle={onToggleProperty}
                  flowNodeId={id}
                  graphNodeId={nodeData.graphNodeId}
                  filePath={nodeData.filePath}
                  classLabel={nodeData.label}
                  isReadingFocus={nodeData.readingFocusMemberId === p.id}
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
                  symbolName={m.symbolName}
                  code={m.code}
                  showSignatureTags
                  expanded={nodeData.expandedMethodIds.includes(m.id)}
                  onToggle={onToggleMethod}
                  flowNodeId={id}
                  graphNodeId={nodeData.graphNodeId}
                  filePath={nodeData.filePath}
                  classLabel={nodeData.label}
                  isReadingFocus={nodeData.readingFocusMemberId === m.id}
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
        minWidth={400}
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
