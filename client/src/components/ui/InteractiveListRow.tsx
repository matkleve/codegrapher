import type {
  DragEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
} from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  INTERACTIVE_ROW_DOUBLE,
  INTERACTIVE_ROW_LEFT,
  INTERACTIVE_ROW_NEUTRAL_LEFT,
  INTERACTIVE_ROW_PASSIVE_LEFT,
  INTERACTIVE_ROW_PASSIVE_TOGGLE_LEFT,
  INTERACTIVE_ROW_STATIC_LEFT,
} from "@/lib/controlTokens";
import { TOKEN_EDGE_STROKE, type SemanticTokenKind } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

export type InteractiveListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Visual outline badge (Jump, Load, …) — row click handles the action */
  actionLabel?: string;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement | HTMLDivElement>;
  className?: string;
  /** `comfortable` = two-line menu row; `compact` | `plain` = single-line row height */
  density?: "comfortable" | "compact" | "plain";
  /** Muted hover, no button — legend rows, labels */
  interactive?: boolean;
  /** `passive` = grey resting surface (hidden/disabled items) — row chrome only */
  tone?: "default" | "passive";
  /** `muted` = grey label only; row keeps normal chrome + brand hover */
  contentTone?: "default" | "muted";
  /** `neutral` = grey hover (legend toggles); default brand hover for menus */
  hoverStyle?: "brand" | "neutral";
  /** Explorer file paths */
  mono?: boolean;
  disabled?: boolean;
  /** `div` supports drag (file tree); default `button` */
  as?: "button" | "div";
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
};

export function SemanticConnectionDot({
  kind,
  className,
}: {
  kind: SemanticTokenKind;
  className?: string;
}) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={{ background: TOKEN_EDGE_STROKE[kind] }}
      aria-hidden
    />
  );
}

export function InteractiveListRowText({
  title,
  subtitle,
  align = "left",
  density = "comfortable",
  tone = "default",
  contentTone = "default",
  mono = false,
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "right";
  density?: "comfortable" | "compact" | "plain";
  tone?: "default" | "passive";
  contentTone?: "default" | "muted";
  mono?: boolean;
}) {
  const monoClass = mono ? "font-mono" : undefined;

  if (density === "plain" || density === "compact") {
    return (
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-left",
          contentTone === "muted" || tone === "passive"
            ? "control-row-text-secondary"
            : "control-row-text-primary",
          monoClass,
          align === "right" && "text-right",
        )}
      >
        {title}
        {density === "compact" && subtitle ? (
          <span className="control-row-text-secondary"> · {subtitle}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "min-w-0 flex-1",
        align === "right" ? "text-right" : "text-left",
        monoClass,
      )}
    >
      <span className="control-row-text-title block truncate">{title}</span>
      {subtitle ? (
        <span className="control-row-text-subtitle block truncate">{subtitle}</span>
      ) : null}
    </span>
  );
}

function compactRowClass(
  density: InteractiveListRowProps["density"],
  hoverStyle: InteractiveListRowProps["hoverStyle"],
): string {
  if (density === "comfortable") return INTERACTIVE_ROW_DOUBLE;
  if (hoverStyle === "neutral") return INTERACTIVE_ROW_NEUTRAL_LEFT;
  return cn(INTERACTIVE_ROW_LEFT, "control-row-compact");
}

export function InteractiveListRow({
  title,
  subtitle,
  leading,
  trailing,
  actionLabel,
  onClick,
  onPointerDown,
  className,
  density = "comfortable",
  interactive = true,
  tone = "default",
  contentTone = "default",
  hoverStyle = "brand",
  mono = false,
  disabled = false,
  as = "button",
  draggable = false,
  onDragStart,
  "aria-pressed": ariaPressed,
  "aria-expanded": ariaExpanded,
}: InteractiveListRowProps) {
  const rowClass = interactive
    ? tone === "passive"
      ? INTERACTIVE_ROW_PASSIVE_TOGGLE_LEFT
      : compactRowClass(density, hoverStyle)
    : tone === "passive"
      ? cn(INTERACTIVE_ROW_PASSIVE_LEFT, "cursor-default")
      : cn(
          INTERACTIVE_ROW_STATIC_LEFT,
          density !== "comfortable" && "control-row-compact",
        );

  const trailingNode =
    trailing ??
    (actionLabel ? (
      <span
        className={cn(
          buttonVariants({ variant: "outline", size: "xs" }),
          "pointer-events-none shrink-0 font-medium",
        )}
      >
        {actionLabel}
      </span>
    ) : null);

  const rowBody = (
    <>
      {leading ? <span className="flex shrink-0 items-center gap-2">{leading}</span> : null}
      <InteractiveListRowText
        title={title}
        subtitle={subtitle}
        density={density}
        tone={tone}
        contentTone={contentTone}
        mono={mono}
      />
      {trailingNode ? (
        <span className="ml-1 flex shrink-0 items-center">{trailingNode}</span>
      ) : null}
    </>
  );

  const sharedClass = cn(
    rowClass,
    "text-foreground",
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
    className,
  );

  if (!interactive) {
    return <div className={sharedClass}>{rowBody}</div>;
  }

  if (as === "div") {
    const onKeyDown: KeyboardEventHandler<HTMLDivElement> = (e) => {
      if (disabled || !onClick) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
      }
    };

    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(sharedClass, draggable && "active:cursor-grabbing")}
        onClick={disabled ? undefined : onClick}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        draggable={draggable}
        onDragStart={onDragStart}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-disabled={disabled || undefined}
      >
        {rowBody}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={sharedClass}
      onClick={disabled ? undefined : onClick}
      onPointerDown={onPointerDown}
      disabled={disabled}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
    >
      {rowBody}
    </button>
  );
}
