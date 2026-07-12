import type {
  DragEventHandler,
  FocusEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
} from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  INTERACTIVE_ROW_DOUBLE,
  INTERACTIVE_ROW_LEFT,
  INTERACTIVE_ROW_LEGEND_LEFT,
  INTERACTIVE_ROW_PASSIVE_TOGGLE_LEFT,
} from "@/lib/controlTokens";
import { TOKEN_EDGE_STROKE, type SemanticTokenKind } from "@/lib/tokenColors";
import { cn } from "@/lib/utils";

export type ListRowVariant =
  | "menu"
  | "explorerSection"
  | "explorerFolder"
  | "explorerFile"
  | "graphChrome";

export type InteractiveListRowProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Visual outline badge (Jump, Load, …) — row click handles the action */
  actionLabel?: string;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
  onMouseEnter?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
  onMouseMove?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
  onFocus?: FocusEventHandler<HTMLButtonElement | HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLButtonElement | HTMLDivElement>;
  className?: string;
  /** `comfortable` = two-line menu; `compact` | `plain` = 24px row; `legend` = taller toggle row */
  density?: "comfortable" | "compact" | "plain" | "legend";
  /** Surface preset — explorer sidebar, class-node section chrome, etc. */
  variant?: ListRowVariant;
  /** Highlight when a connection kind is live on the canvas (legend) */
  emphasis?: "default" | "live";
  /** `passive` = grey resting surface (hidden/disabled items) */
  tone?: "default" | "passive";
  /** `muted` = grey label only; row keeps normal chrome + brand hover */
  contentTone?: "default" | "muted";
  /** Explorer file rows: ink when file is already on the canvas */
  inGraph?: boolean;
  /** Explorer file paths */
  mono?: boolean;
  disabled?: boolean;
  /** `div` supports drag (file tree); default `button` */
  as?: "button" | "div";
  /** `false` = size to content instead of filling the row (e.g. a pill next to a flex-1 sibling) */
  fullWidth?: boolean;
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
  density?: "comfortable" | "compact" | "plain" | "legend";
  tone?: "default" | "passive";
  contentTone?: "default" | "muted";
  mono?: boolean;
}) {
  const monoClass = mono ? "font-mono" : undefined;

  if (density === "plain" || density === "compact" || density === "legend") {
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
  fullWidth: boolean,
): string {
  if (density === "comfortable") return INTERACTIVE_ROW_DOUBLE;
  if (density === "legend") {
    return fullWidth
      ? INTERACTIVE_ROW_LEGEND_LEFT
      : INTERACTIVE_ROW_LEGEND_LEFT.replace("w-full", "w-auto");
  }
  const base = cn(INTERACTIVE_ROW_LEFT, "control-row-compact");
  return fullWidth ? base : base.replace("w-full", "w-auto");
}

function variantClass(
  variant: ListRowVariant,
  inGraph: boolean,
): string | undefined {
  switch (variant) {
    case "explorerSection":
      return cn("list-row-explorer", "list-row-explorer--section");
    case "explorerFolder":
      return cn("list-row-explorer", "list-row-explorer--folder");
    case "explorerFile":
      return cn(
        "list-row-explorer",
        "list-row-explorer--file",
        inGraph && "list-row-explorer--in-graph",
      );
    case "graphChrome":
      return "list-row-graph-chrome";
    default:
      return undefined;
  }
}

export function InteractiveListRow({
  title,
  subtitle,
  leading,
  trailing,
  actionLabel,
  onClick,
  onMouseEnter,
  onMouseMove,
  onFocus,
  onPointerDown,
  className,
  density = "comfortable",
  variant = "menu",
  emphasis = "default",
  tone = "default",
  contentTone = "default",
  inGraph = false,
  mono = false,
  disabled = false,
  as = "button",
  fullWidth = true,
  draggable = false,
  onDragStart,
  "aria-pressed": ariaPressed,
  "aria-expanded": ariaExpanded,
}: InteractiveListRowProps) {
  const rowClass =
    tone === "passive"
      ? cn(
          INTERACTIVE_ROW_PASSIVE_TOGGLE_LEFT,
          density === "legend" && "control-row-legend",
        )
      : compactRowClass(density, fullWidth);

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
    variantClass(variant, inGraph),
    emphasis === "live" && "list-row-emphasis-live",
    "text-foreground",
    disabled && "pointer-events-none cursor-not-allowed opacity-50",
    className,
  );

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
        onMouseEnter={onMouseEnter}
        onMouseMove={onMouseMove}
        onFocus={onFocus}
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
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onFocus={onFocus}
      onPointerDown={onPointerDown}
      disabled={disabled}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
    >
      {rowBody}
    </button>
  );
}
