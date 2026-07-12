import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type GraphMapControlButtonProps = ComponentProps<typeof Button> & {
  flashKey: string;
  activeFlashKey: string | null;
  onFlash: (key: string) => void;
};

function hideIconFromAssistiveTech(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    return cloneElement(child as ReactElement<{ "aria-hidden"?: boolean }>, {
      "aria-hidden": true,
    });
  });
}

export function GraphMapControlButton({
  flashKey,
  activeFlashKey,
  onFlash,
  className,
  onClick,
  title,
  "aria-label": ariaLabelProp,
  children,
  ...props
}: GraphMapControlButtonProps) {
  const ariaLabel = ariaLabelProp ?? title;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onFlash(flashKey);
      onClick?.(event);
    },
    [flashKey, onClick, onFlash],
  );

  return (
    <Button
      type="button"
      size="icon"
      className={cn(
        "graph-map-control-btn",
        activeFlashKey === flashKey && "graph-map-control-btn--flash",
        className,
      )}
      title={title}
      aria-label={ariaLabel}
      onClick={handleClick}
      {...props}
    >
      {hideIconFromAssistiveTech(children)}
    </Button>
  );
}
