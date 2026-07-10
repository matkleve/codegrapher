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
    const { lit, on, isCtrlPreviewMode } = useTraceAppearance({ traceKey });

    useImperativeHandle(ref, () => ({
      getRightAnchor: () => rightRef.current,
      getLeftAnchor: () => leftRef.current,
      getChipElement: () => chipRef.current,
    }));

    const anchorColor = TOKEN_ANCHOR[semantic];
    const endpoint = on;

    return (
      <span
        ref={chipRef}
        role={role}
        tabIndex={tabIndex}
        data-symbol-name={text}
        data-symbol-role={symbolRole}
        data-trace-key={traceKey}
        data-token-kind={semantic}
        style={{ "--shimmer-delay": shimmerDelay } as React.CSSProperties}
        className={cn(
          "token-chip relative inline-flex items-center overflow-visible rounded-[5px] px-1 py-0 text-[11px] align-baseline leading-none",
          interactive && "cursor-pointer",
          interactive && isCtrlPreviewMode && "token-interactive",
          lit && "token-chip-lit",
          endpoint && "token-chip-on",
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
          visible={endpoint}
          highlighted={endpoint}
          size="chip"
        />
        <span className="token-chip-text relative z-[1]">{text}</span>
        <FlowAnchor
          ref={rightRef}
          side="right"
          colorClass={anchorColor}
          visible={endpoint}
          highlighted={endpoint}
          size="chip"
        />
      </span>
    );
  },
);
