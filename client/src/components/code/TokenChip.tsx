import { forwardRef, useRef, useImperativeHandle } from "react";
import { ConnectorChip } from "@/components/code/ConnectorChip";
import { useTraceHostRegistration } from "@/hooks/useElementRegistry";
import type { SemanticTokenKind } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

export type TokenChipHandle = {
  getRightAnchor: () => HTMLElement | null;
  getLeftAnchor: () => HTMLElement | null;
  getChipElement: () => HTMLElement | null;
};

type TokenChipProps = {
  text: string;
  semantic: SemanticTokenKind;
  traceKey?: string;
  interactive: boolean;
  localDefId?: string;
  localTargetId?: string;
  shimmerDelay?: string;
  symbolRole?: "usage" | "definition";
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  tabIndex?: number;
  role?: string;
  className?: string;
};

export const TokenChip = forwardRef<TokenChipHandle, TokenChipProps>(
  function TokenChip(
    {
      text,
      semantic,
      traceKey,
      interactive,
      localDefId,
      localTargetId,
      shimmerDelay = "0s",
      symbolRole = "usage",
      onMouseEnter,
      onMouseLeave,
      onClick,
      onKeyDown,
      tabIndex,
      role,
      className: chipClassName,
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
        kind={semantic}
        label={text}
        active={false}
        showLeftSocket={false}
        showRightSocket={false}
        shimmerDelay={shimmerDelay}
        role={role}
        tabIndex={tabIndex}
        data-symbol-name={text}
        data-symbol-role={symbolRole}
        data-trace-key={traceKey}
        {...(localDefId ? { "data-local-def-id": localDefId } : {})}
        {...(localTargetId ? { "data-local-target-id": localTargetId } : {})}
        className={cn(chipClassName, interactive && "cursor-pointer")}
        textClassName="token-chip-text"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onKeyDown={onKeyDown}
      />
    );
  },
);
