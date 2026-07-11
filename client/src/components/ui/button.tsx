import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { INTERACTIVE_SURFACE } from "@/lib/controlTokens"
import { cn } from "@/lib/utils"

const interactiveStates =
  "transition-[background-color,border-color,color,box-shadow] duration-[var(--motion-hover-surface)] ease-[var(--ease)] focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-[color,stroke] [&_svg]:duration-[var(--motion-hover-color)] [&_svg]:ease-[var(--ease)]"

const buttonVariants = cva(
  cn(
    "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border bg-clip-padding font-medium whitespace-nowrap outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    "h-[var(--control-height-md)] gap-[var(--control-gap-md)] px-[var(--control-padding-x-md)] text-[length:var(--font-size-sm)]",
    "[&_svg:not([class*='size-'])]:size-[var(--icon-size-md)]",
    interactiveStates,
  ),
  {
    variants: {
      variant: {
        default: cn(
          "border-primary/50 bg-primary text-primary-foreground",
          "hover:border-primary hover:bg-[color-mix(in_oklch,var(--primary)_90%,white)] hover:text-primary-foreground",
          "hover:[&_svg]:text-primary-foreground",
        ),
        outline: cn(
          "border-border bg-background text-foreground",
          INTERACTIVE_SURFACE,
          "dark:border-border dark:bg-secondary dark:text-secondary-foreground",
        ),
        secondary: cn(
          "border-border bg-secondary text-secondary-foreground",
          INTERACTIVE_SURFACE,
        ),
        ghost: cn(
          "border-transparent bg-transparent text-foreground",
          INTERACTIVE_SURFACE,
        ),
        destructive:
          "border-transparent bg-destructive/10 text-destructive hover:border-destructive/50 hover:bg-destructive/20 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "border-transparent text-primary underline-offset-4 hover:border-transparent hover:bg-transparent hover:text-primary hover:underline",
      },
      size: {
        default:
          "has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: cn(
          "h-[var(--control-height-sm)] gap-1 rounded-[min(var(--radius-md),0.625rem)] px-[var(--control-padding-x-sm)] text-[length:var(--font-size-xs)] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
          "[&_svg:not([class*='size-'])]:size-[var(--icon-size-xs)]",
        ),
        sm: cn(
          "h-[var(--control-height-sm)] gap-1 rounded-[min(var(--radius-md),0.75rem)] px-[var(--control-padding-x-sm)] text-[length:var(--font-size-xs)] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
          "[&_svg:not([class*='size-'])]:size-[var(--icon-size-sm)]",
        ),
        lg: cn(
          "h-[var(--control-height-lg)] has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        ),
        icon: "size-[var(--control-height-md)]",
        "icon-xs": cn(
          "size-[var(--control-height-sm)] rounded-[min(var(--radius-md),0.625rem)] in-data-[slot=button-group]:rounded-lg",
          "[&_svg:not([class*='size-'])]:size-[var(--icon-size-xs)]",
        ),
        "icon-sm": cn(
          "size-[var(--control-height-sm)] rounded-[min(var(--radius-md),0.75rem)] in-data-[slot=button-group]:rounded-lg",
          "[&_svg:not([class*='size-'])]:size-[var(--icon-size-sm)]",
        ),
        "icon-lg": "size-[var(--control-height-lg)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
