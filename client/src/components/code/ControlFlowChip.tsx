import { forwardRef, useImperativeHandle, useRef } from "react";
import { ConnectorChip } from "@/components/code/ConnectorChip";
import type { TokenChipHandle } from "@/components/code/TokenChip";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import type { ControlFlowRole } from "@/lib/controlFlowLinks";
import { cn } from "@/lib/utils";

type ControlFlowChipProps = {
  text: string;
  traceKey: string;
  cfRole: Exclude<ControlFlowRole, "condition">;
  shimmerDelay?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
};

/** Interactive switch/if/case/else keyword — chip plumbing, keyword ink. */
export const ControlFlowChip = forwardRef<TokenChipHandle, ControlFlowChipProps>(
  function ControlFlowChip(
    {
      text,
      traceKey,
      cfRole,
      shimmerDelay = "0s",
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onClick,
      onKeyDown,
    },
    ref,
  ) {
    const chipRef = useRef<HTMLSpanElement>(null);
    useTraceHostRegistration(chipRef);

    useImperativeHandle(ref, () => ({
      getRightAnchor: () =>
        chipRef.current?.querySelector<HTMLElement>('[data-flow-anchor="right"]') ?? null,
      getLeftAnchor: () =>
        chipRef.current?.querySelector<HTMLElement>('[data-flow-anchor="left"]') ?? null,
      getChipElement: () => chipRef.current,
    }));

    return (
      <ConnectorChip
        ref={chipRef}
        variant="inline"
        kind="variable"
        label={text}
        active={false}
        showLeftSocket={false}
        showRightSocket={false}
        shimmerDelay={shimmerDelay}
        role="button"
        tabIndex={0}
        data-symbol-name={text}
        data-symbol-role={cfRole === "head" ? "definition" : "usage"}
        data-control-flow-role={cfRole}
        data-trace-key={traceKey}
        className={cn("control-flow-chip connector-chip--control-flow hoverable cursor-pointer")}
        textClassName="control-flow-chip-text"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        onKeyDown={onKeyDown}
      />
    );
  },
);
