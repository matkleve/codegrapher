import { useCallback } from "react";
import { useJumpTooltip } from "@/context/JumpTooltipContext";

export function useJumpTooltipAction() {
  const { wireJumpRef } = useJumpTooltip();

  return useCallback(
    (wireId: string, wireEnd: "from" | "to") => {
      wireJumpRef.current?.(wireId, wireEnd);
    },
    [wireJumpRef],
  );
}
