import { useEffect } from "react";

/** Hover load menus dismiss on scroll so they do not stick to the viewport. */
export function useHoverMenuScrollDismiss(
  variant: "hover" | "context",
  onClose: () => void,
): void {
  useEffect(() => {
    if (variant !== "hover") return;

    const onScroll = () => onClose();
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [onClose, variant]);
}
