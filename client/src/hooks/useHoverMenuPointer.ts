import { useEffect, useState } from "react";

export const HOVER_MENU_CURSOR_PAD = 14;

/** Hover load menus track the pointer; dismiss on scroll so they do not stick to the viewport. */
export function useHoverMenuPointer(
  variant: "hover" | "context",
  anchor: { x: number; y: number },
  menuKey: string,
  onClose: () => void,
): { x: number; y: number } {
  const [pointer, setPointer] = useState(anchor);

  useEffect(() => {
    setPointer(anchor);
  }, [anchor.x, anchor.y, menuKey]);

  useEffect(() => {
    if (variant !== "hover") return;

    const onMove = (e: MouseEvent) => {
      setPointer({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [menuKey, variant]);

  useEffect(() => {
    if (variant !== "hover") return;

    const onScroll = () => onClose();
    document.addEventListener("scroll", onScroll, true);
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [onClose, variant]);

  return variant === "hover" ? pointer : anchor;
}
