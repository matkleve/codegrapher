import type { MouseEvent } from "react";
import { useSimulationOptional, type SimAnchor } from "@/context/SimulationContext";
import { cn } from "@/lib/utils";

type SimGutterControlProps = {
  memberId: string;
  lineNumber: number;
  flowNodeId: string;
  filePath: string;
  methodCode: string;
  methodName: string;
  signatureLine: string;
  methodStartLine: number;
};

function buildAnchor(
  props: SimGutterControlProps,
  startLine: number,
): SimAnchor {
  return {
    flowNodeId: props.flowNodeId,
    memberId: props.memberId,
    methodName: props.methodName,
    code: props.methodCode,
    signatureLine: props.signatureLine,
    filePath: props.filePath,
    methodStartLine: props.methodStartLine,
    startLine,
  };
}

export function SimGutterControl(props: SimGutterControlProps) {
  const sim = useSimulationOptional();
  const role = sim?.lineGutterRole(props.memberId, props.lineNumber) ?? null;
  const inRange = sim?.isLineInSimRange(props.memberId, props.lineNumber) ?? false;
  const disabled = sim?.simActive ?? false;

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sim || disabled) return;

    if (e.altKey) {
      if (
        sim.startAnchor?.memberId === props.memberId &&
        sim.startAnchor.startLine === props.lineNumber
      ) {
        sim.disarmTrace();
        return;
      }
      sim.armStartHere(buildAnchor(props, props.lineNumber));
      return;
    }
    if (e.shiftKey && sim.startAnchor?.memberId === props.memberId) {
      sim.gutterRunRange(props.lineNumber, props.memberId);
      return;
    }
    sim.toggleEndHere(props.lineNumber, props.memberId);
  };

  return (
    <button
      type="button"
      className={cn(
        "sim-gutter-marker nodrag",
        role === "start" && "sim-gutter-marker--start",
        role === "end" && "sim-gutter-marker--end",
        role === "current" && "sim-gutter-marker--current",
        inRange && !role && "sim-gutter-marker--in-range",
        disabled && "sim-gutter-marker--disabled",
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={
        role === "start"
          ? `Trace start line ${props.lineNumber}`
          : role === "end"
            ? `Trace end line ${props.lineNumber}`
            : role === "current"
              ? `Current step line ${props.lineNumber}`
              : `Set trace marker for line ${props.lineNumber}`
      }
      title="Click: stop here · Alt+click: start · Shift+click: run range"
    >
      <span className="sim-gutter-marker__icon" aria-hidden>
        {role === "current" ? "→" : role === "start" ? "▶" : role === "end" ? "■" : "○"}
      </span>
    </button>
  );
}
