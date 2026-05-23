import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Shared hover/focus: yellow primary border, tinted bg, primary text & icons. */
const interactiveStates =
  "transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/40 [&_svg]:transition-colors [&_svg]:duration-150"

const buttonVariants = cva(
  cn(
    "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
          "hover:border-primary hover:bg-[var(--surface-hover)] hover:text-primary",
          "hover:[&_svg]:text-primary",
          "dark:border-border dark:bg-secondary dark:text-secondary-foreground",
          "dark:hover:border-primary dark:hover:bg-[var(--surface-hover)] dark:hover:text-primary",
          "dark:hover:[&_svg]:text-primary",
          "aria-expanded:border-primary aria-expanded:bg-[var(--surface-hover)] aria-expanded:text-primary",
        ),
        secondary: cn(
          "border-border bg-secondary text-secondary-foreground",
          "hover:border-primary hover:bg-[var(--surface-hover)] hover:text-primary",
          "hover:[&_svg]:text-primary",
          "aria-expanded:border-primary aria-expanded:bg-[var(--surface-hover)] aria-expanded:text-primary",
        ),
        ghost: cn(
          "border-transparent bg-transparent text-foreground",
          "hover:border-primary hover:bg-[var(--surface-hover)] hover:text-primary",
          "hover:[&_svg]:text-primary",
          "dark:hover:bg-[var(--surface-hover)]",
          "aria-expanded:border-primary aria-expanded:bg-[var(--surface-hover)] aria-expanded:text-primary",
        ),
        destructive:
          "border-transparent bg-destructive/10 text-destructive hover:border-destructive/50 hover:bg-destructive/20 hover:text-destructive focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "border-transparent text-primary underline-offset-4 hover:border-transparent hover:bg-transparent hover:text-primary hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
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
