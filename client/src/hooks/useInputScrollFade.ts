import { useCallback, useLayoutEffect, useState, type RefObject } from "react";

export type InputScrollFade = {
  left: boolean;
  right: boolean;
};

export function useInputScrollFade(
  ref: RefObject<HTMLInputElement | null>,
  value: string,
): InputScrollFade {
  const [fade, setFade] = useState<InputScrollFade>({ left: false, right: false });

  const syncFade = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 1;
    setFade({
      left: overflow && el.scrollLeft > 1,
      right: overflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    });
  }, [ref]);

  useLayoutEffect(() => {
    syncFade();
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(syncFade);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, syncFade, value]);

  return { ...fade, syncFade };
}

export function inputScrollFadeMaskClass(fade: InputScrollFade): string | undefined {
  if (fade.left && fade.right) return "explorer-path-input-mask-both";
  if (fade.left) return "explorer-path-input-mask-left";
  if (fade.right) return "explorer-path-input-mask-right";
  return undefined;
}
