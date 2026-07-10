import { forwardRef, useRef, useImperativeHandle } from "react";
import { ConnectorChip } from "@/components/code/ConnectorChip";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
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
    },
    ref,
  ) {
    const chipRef = useRef<HTMLSpanElement>(null);
    const { lit, on, pinnedSource, hoverPreview } = useTraceAppearance({ traceKey });

    useImperativeHandle(ref, () => ({
      getRightAnchor: () =>
        chipRef.current?.querySelector<HTMLElement>('[data-flow-anchor="right"]') ?? null,
      getLeftAnchor: () =>
        chipRef.current?.querySelector<HTMLElement>('[data-flow-anchor="left"]') ?? null,
      getChipElement: () => chipRef.current,
    }));

    const isDefinition = symbolRole === "definition" || !!localDefId;
    const showIncoming = on && !isDefinition;
    const showOutgoing = on && isDefinition;

    return (
      <ConnectorChip
        ref={chipRef}
        variant="inline"
        kind={semantic}
        label={text}
        active={on}
        showLeftSocket={showIncoming}
        showRightSocket={showOutgoing}
        shimmerDelay={shimmerDelay}
        role={role}
        tabIndex={tabIndex}
        data-symbol-name={text}
        data-symbol-role={symbolRole}
        data-trace-key={traceKey}
        {...(localDefId ? { "data-local-def-id": localDefId } : {})}
        {...(localTargetId ? { "data-local-target-id": localTargetId } : {})}
        className={cn(
          interactive && "cursor-pointer",
          lit && "token-chip-lit",
          on && pinnedSource && "token-chip-source",
          on && hoverPreview && "token-chip-hover-preview",
        )}
        textClassName="token-chip-text"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onKeyDown={onKeyDown}
      />
    );
  },
);
