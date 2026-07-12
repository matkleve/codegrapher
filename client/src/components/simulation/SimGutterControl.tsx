import { useCallback, useRef, useState, type MouseEvent } from "react";
import { useSimulationOptional, type SimAnchor } from "@/context/SimulationContext";
import {
  GUTTER_ACTION_LABELS,
  gutterMenuActions,
  gutterPreviewAction,
  gutterPrimaryAction,
  type GutterAction,
} from "@/lib/simGutterActions";
import { GutterActionIcon, SimGutterMenu } from "@/components/simulation/SimGutterMenu";
import { cn } from "@/lib/utils";

const MENU_DWELL_MS = 400;

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

function buildAnchor(props: SimGutterControlProps, startLine: number): SimAnchor {
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const dwellRef = useRef(0);
  const closeRef = useRef(0);

  const anchorState = sim?.gutterAnchorState ?? { start: null, end: null };
  const previewAction =
    role === "start"
      ? "start"
      : role === "end"
        ? "end"
        : role === "pause"
          ? "pause"
          : role === "current"
            ? "current"
            : gutterPreviewAction(props.memberId, props.lineNumber, anchorState);
  const primaryAction = gutterPrimaryAction(props.memberId, props.lineNumber, anchorState);
  const menuActions = gutterMenuActions(primaryAction);

  const clearTimers = useCallback(() => {
    window.clearTimeout(dwellRef.current);
    window.clearTimeout(closeRef.current);
  }, []);

  const runAction = useCallback(
    (action: GutterAction) => {
      if (!sim || disabled) return;
      sim.applyGutterAction(
        action,
        buildAnchor(props, props.lineNumber),
        props.lineNumber,
        props.memberId,
      );
      setMenuOpen(false);
    },
    [disabled, props, sim],
  );

  const onPrimaryClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    runAction(primaryAction);
  };

  const onMouseEnter = () => {
    setHovering(true);
    clearTimers();
    dwellRef.current = window.setTimeout(() => setMenuOpen(true), MENU_DWELL_MS);
  };

  const onMouseLeave = () => {
    setHovering(false);
    clearTimers();
    closeRef.current = window.setTimeout(() => setMenuOpen(false), 120);
  };

  const showPreview =
    hovering || menuOpen || role != null || (inRange && previewAction === "pause");

  return (
    <div
      className="sim-gutter-action nodrag"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        className={cn(
          "sim-gutter-marker",
          role === "start" && "sim-gutter-marker--start",
          role === "end" && "sim-gutter-marker--end",
          role === "pause" && "sim-gutter-marker--pause",
          role === "current" && "sim-gutter-marker--current",
          inRange && !role && "sim-gutter-marker--in-range",
          showPreview && !role && previewAction === "pause" && "sim-gutter-marker--pause-hint",
          disabled && "sim-gutter-marker--disabled",
          (showPreview || role) && "sim-gutter-marker--visible",
        )}
        onClick={onPrimaryClick}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={
          role === "start"
            ? `Trace start line ${props.lineNumber}`
            : role === "end"
              ? `Trace end line ${props.lineNumber}`
              : role === "pause"
                ? `Pause breakpoint line ${props.lineNumber}`
                : role === "current"
                  ? `Current step line ${props.lineNumber}`
                  : `${GUTTER_ACTION_LABELS[primaryAction]} — line ${props.lineNumber}`
        }
        title={`Click: ${GUTTER_ACTION_LABELS[primaryAction].toLowerCase()} · hover for more`}
      >
        <span className="sim-gutter-marker__icon" aria-hidden>
          <GutterActionIcon
            action={role === "current" ? "current" : (previewAction as GutterAction | "current")}
          />
        </span>
      </button>
      {menuOpen && !disabled ? (
        <SimGutterMenu actions={menuActions} onPick={runAction} />
      ) : null}
    </div>
  );
}
