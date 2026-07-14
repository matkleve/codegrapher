import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { LineTargetAnchor } from "@/components/code/LineTargetAnchor";
import { SimGutterControl } from "@/components/simulation/SimGutterControl";
import { CodeLineTokenList } from "@/components/code/CodeLineTokenList";
import { useCodeLineController } from "@/components/code/useCodeLineController";
import { previewLineHandle } from "@/lib/ctrlPreviewHandles";
import { cn } from "@/lib/utils";
import type { CodeLineProps } from "@/components/code/codeLineTypes";

export type { CodeLineProps } from "@/components/code/codeLineTypes";

function CodeLineComponent(props: CodeLineProps) {
  const {
    lineNumber,
    memberId,
    sourceFlowId,
    filePath,
    methodCode,
    methodName,
    signatureLine,
    methodStartLine,
  } = props;

  const controller = useCodeLineController(props);

  const lineTargetId = previewLineHandle(memberId, lineNumber);

  const {
    isSimCurrent,
    inSimRange,
    simShimmering,
    sim,
    simInlineValues,
  } = controller;

  return (
    <div
      className={cn(
        "code-line group/code-line",
        isSimCurrent && "code-line--sim-current",
        inSimRange && !isSimCurrent && "code-line--sim-range",
        simShimmering && "code-line--sim-shimmer",
      )}
      data-line-number={lineNumber}
      data-member-id={memberId}
      style={
        simShimmering && sim
          ? ({ "--sim-shimmer-duration": `${sim.substepFallbackShimmerMs}ms` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="code-line-gutter-wrap">
        {methodCode && methodName && signatureLine && methodStartLine != null ? (
          <SimGutterControl
            memberId={memberId}
            lineNumber={lineNumber}
            flowNodeId={sourceFlowId}
            filePath={filePath}
            methodCode={methodCode}
            methodName={methodName}
            signatureLine={signatureLine}
            methodStartLine={methodStartLine}
          />
        ) : null}
        <span className="code-line-gutter" aria-hidden>
          {lineNumber}
        </span>
      </div>
      <div className="code-line-body relative overflow-visible whitespace-pre-wrap font-mono text-xs leading-relaxed">
        <Handle
          type="target"
          position={Position.Left}
          id={lineTargetId}
          className="!h-0 !w-0 !border-0 !bg-transparent !opacity-0"
        />
        <LineTargetAnchor targetId={lineTargetId} />
        <CodeLineTokenList {...props} controller={controller} />
        {simInlineValues.length > 0 ? (
          <span className="sim-inline-values" aria-hidden>
            {simInlineValues.map((v) => (
              <span
                key={v.name}
                className={cn(
                  "sim-inline-value",
                  v.kind === "unevaluated" && "sim-inline-value--unevaluated",
                  v.kind === "unknown" && "sim-inline-value--unknown",
                )}
              >
                <span className="sim-inline-value__name">{v.name}</span>
                {" = "}
                {v.kind === "unevaluated" ? "~" : ""}
                {v.display}
              </span>
            ))}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const CodeLine = memo(CodeLineComponent);
