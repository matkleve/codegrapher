import { forwardRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { FlowAnchor } from "@/components/code/FlowAnchor";
import { TOKEN_ANCHOR, type SemanticTokenKind } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

export type ConnectorChipVariant = "inline" | "load";

export type ConnectorChipProps = {
  label: string;
  kind: SemanticTokenKind;
  variant?: ConnectorChipVariant;
  /** Lit endpoint — `token-chip-on` */
  active?: boolean;
  showLeftSocket?: boolean;
  showRightSocket?: boolean;
  className?: string;
  textClassName?: string;
  title?: string;
  role?: string;
  tabIndex?: number;
  shimmerDelay?: string;
  onPointerDown?: (e: PointerEvent<HTMLSpanElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLSpanElement>) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onClick?: (e: MouseEvent<HTMLSpanElement>) => void;
} & Record<`data-${string}`, string | undefined>;

export const ConnectorChip = forwardRef<HTMLSpanElement, ConnectorChipProps>(
  function ConnectorChip(
    {
      label,
      kind,
      variant = "inline",
      active = false,
      showLeftSocket = false,
      showRightSocket = false,
      className,
      textClassName,
      title,
      role,
      tabIndex,
      shimmerDelay = "0s",
      onPointerDown,
      onKeyDown,
      onMouseEnter,
      onMouseLeave,
      onFocus,
      onBlur,
      onClick,
      ...dataProps
    },
    ref,
  ) {
    const anchorColor = TOKEN_ANCHOR[kind];
    const isLoad = variant === "load";

    return (
      <span
        ref={ref}
        role={role}
        tabIndex={tabIndex}
        title={title}
        data-token-kind={kind}
        style={{ "--shimmer-delay": shimmerDelay } as CSSProperties}
        className={cn(
          "token-chip connector-chip",
          isLoad ? "connector-chip--load" : "connector-chip--inline",
          active && !isLoad && "token-chip-on",
          className,
        )}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
        {...dataProps}
      >
        <FlowAnchor
          side="left"
          colorClass={anchorColor}
          visible={showLeftSocket}
          highlighted={showLeftSocket}
          size="chip"
        />
        <span
          className={cn(
            "connector-chip-text token-shimmer-target relative z-[1]",
            textClassName,
          )}
          data-text={label}
        >
          {label}
        </span>
        <FlowAnchor
          side="right"
          colorClass={anchorColor}
          visible={showRightSocket}
          highlighted={showRightSocket}
          size="chip"
        />
      </span>
    );
  },
);
