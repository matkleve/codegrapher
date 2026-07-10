import { forwardRef, useRef, useImperativeHandle } from "react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { useTraceAppearance } from "@/hooks/useTraceAppearance";
import { TOKEN_ANCHOR, type SemanticTokenKind } from "@/lib/tokenColors";
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
    const leftRef = useRef<HTMLSpanElement>(null);
    const rightRef = useRef<HTMLSpanElement>(null);
    const { lit, on, isCtrlPreviewMode, pinnedSource, hoverPreview } = useTraceAppearance({ traceKey });

    useImperativeHandle(ref, () => ({
      getRightAnchor: () => rightRef.current,
      getLeftAnchor: () => leftRef.current,
      getChipElement: () => chipRef.current,
    }));

    const anchorColor = TOKEN_ANCHOR[semantic];
    const endpoint = on;
    const isDefinition = symbolRole === "definition" || !!localDefId;
    const showIncoming = endpoint && !isDefinition;
    const showOutgoing = endpoint && isDefinition;

    return (
      <span
        ref={chipRef}
        role={role}
        tabIndex={tabIndex}
        data-symbol-name={text}
        data-symbol-role={symbolRole}
        data-trace-key={traceKey}
        data-token-kind={semantic}
        {...(localDefId ? { "data-local-def-id": localDefId } : {})}
        {...(localTargetId ? { "data-local-target-id": localTargetId } : {})}
        style={{ "--shimmer-delay": shimmerDelay } as React.CSSProperties}
        className={cn(
          "token-chip",
          interactive && "cursor-pointer",
          interactive && isCtrlPreviewMode && "token-interactive",
          lit && "token-chip-lit",
          endpoint && "token-chip-on",
          endpoint && pinnedSource && "token-chip-source",
          endpoint && hoverPreview && "token-chip-hover-preview",
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        <FlowAnchor
          ref={leftRef}
          side="left"
          colorClass={anchorColor}
          visible={showIncoming}
          highlighted={showIncoming}
          size="chip"
        />
        <span className="token-chip-text token-shimmer-target relative z-[1]" data-text={text}>
          {text}
        </span>
        <FlowAnchor
          ref={rightRef}
          side="right"
          colorClass={anchorColor}
          visible={showOutgoing}
          highlighted={showOutgoing}
          size="chip"
        />
      </span>
    );
  },
);
