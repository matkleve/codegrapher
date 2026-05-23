import { forwardRef, useRef, useImperativeHandle } from "react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { TOKEN_ANCHOR, TOKEN_BG, TOKEN_TEXT, type SemanticTokenKind } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

export type TokenChipHandle = {
  getRightAnchor: () => HTMLElement | null;
  getLeftAnchor: () => HTMLElement | null;
};

type TokenChipProps = {
  text: string;
  semantic: SemanticTokenKind;
  active: boolean;
  interactive: boolean;
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
      active,
      interactive,
      onMouseEnter,
      onMouseLeave,
      onClick,
      onKeyDown,
      tabIndex,
      role,
    },
    ref,
  ) {
    const leftRef = useRef<HTMLSpanElement>(null);
    const rightRef = useRef<HTMLSpanElement>(null);

    useImperativeHandle(ref, () => ({
      getRightAnchor: () => rightRef.current,
      getLeftAnchor: () => leftRef.current,
    }));

    const anchorColor = TOKEN_ANCHOR[semantic];

    return (
      <span
        role={role}
        tabIndex={tabIndex}
        className={cn(
          "relative inline-flex items-center overflow-visible rounded-[3px] px-1 py-0 text-[11px] align-baseline leading-none transition-colors duration-100",
          TOKEN_TEXT[semantic],
          active && TOKEN_BG[semantic],
          interactive && "cursor-pointer",
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
          visible={active}
          highlighted={active}
          size="chip"
        />
        {text}
        <FlowAnchor
          ref={rightRef}
          side="right"
          colorClass={anchorColor}
          visible={active}
          highlighted={active}
          size="chip"
        />
      </span>
    );
  },
);
