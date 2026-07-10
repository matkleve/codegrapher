import { useCallback, type ComponentProps, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { INTERACTIVE_SURFACE } from "@/lib/controlTokens";
import { cn } from "@/lib/utils";

type GraphMapControlButtonProps = ComponentProps<typeof Button> & {
  flashKey: string;
  activeFlashKey: string | null;
  onFlash: (key: string) => void;
};

export function GraphMapControlButton({
  flashKey,
  activeFlashKey,
  onFlash,
  className,
  onClick,
  ...props
}: GraphMapControlButtonProps) {
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
        INTERACTIVE_SURFACE,
        "graph-map-control-btn",
        activeFlashKey === flashKey && "graph-map-control-btn--flash",
        className,
      )}
      onClick={handleClick}
      {...props}
    />
  );
}
