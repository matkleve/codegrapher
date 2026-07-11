import type { ReactNode } from "react";
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
  onClick?: () => void;
  className?: string;
  /** `comfortable` = two-line menu row; `compact` = single-line explorer density; `plain` = simple label */
  density?: "comfortable" | "compact" | "plain";
  /** Muted hover, no button — legend rows, labels */
  interactive?: boolean;
  /** `passive` = grey resting surface (hidden/disabled items) — row chrome only */
  tone?: "default" | "passive";
  /** `muted` = grey label only; row keeps normal chrome + brand hover */
  contentTone?: "default" | "muted";
  /** `neutral` = grey hover (legend toggles); default brand hover for menus */
  hoverStyle?: "brand" | "neutral";
  "aria-pressed"?: boolean;
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
}: {
  title: string;
  subtitle?: string;
  align?: "left" | "right";
  density?: "comfortable" | "compact" | "plain";
  tone?: "default" | "passive";
  contentTone?: "default" | "muted";
}) {
  if (density === "plain") {
    return (
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-left text-xs",
          contentTone === "muted"
            ? "font-normal text-muted-foreground"
            : "font-medium text-foreground",
          tone === "passive" && contentTone !== "muted" && "text-muted-foreground",
        )}
      >
        {title}
      </span>
    );
  }

  if (density === "compact") {
    return (
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-left text-xs text-foreground",
          align === "right" && "text-right",
        )}
      >
        {title}
        {subtitle ? (
          <span className="text-muted-foreground"> · {subtitle}</span>
        ) : null}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "min-w-0 flex-1",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <span className="control-row-text-title block truncate text-foreground">
        {title}
      </span>
      {subtitle ? (
        <span className="control-row-text-subtitle block truncate">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}

export function InteractiveListRow({
  title,
  subtitle,
  leading,
  trailing,
  actionLabel,
  onClick,
  className,
  density = "comfortable",
  interactive = true,
  tone = "default",
  contentTone = "default",
  hoverStyle = "brand",
  "aria-pressed": ariaPressed,
}: InteractiveListRowProps) {
  const rowClass = interactive
    ? tone === "passive"
      ? INTERACTIVE_ROW_PASSIVE_TOGGLE_LEFT
      : density === "comfortable"
        ? INTERACTIVE_ROW_DOUBLE
        : hoverStyle === "neutral"
          ? INTERACTIVE_ROW_NEUTRAL_LEFT
          : cn(INTERACTIVE_ROW_LEFT, density === "compact" && "control-row-compact")
    : tone === "passive"
      ? cn(INTERACTIVE_ROW_PASSIVE_LEFT, "cursor-default")
      : cn(
          INTERACTIVE_ROW_STATIC_LEFT,
          density !== "plain" && density === "compact" && "control-row-compact",
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
      />
      {trailingNode ? (
        <span className="ml-1 flex shrink-0 items-center">{trailingNode}</span>
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div className={cn(rowClass, "text-foreground", className)}>{rowBody}</div>
    );
  }

  return (
    <button
      type="button"
      className={cn(rowClass, "text-foreground", className)}
      onClick={onClick}
      aria-pressed={ariaPressed}
    >
      {rowBody}
    </button>
  );
}
