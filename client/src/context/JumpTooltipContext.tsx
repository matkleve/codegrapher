import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { SemanticTokenKind } from "@/lib/tokenColors";

export type JumpTooltipState = {
  token: string;
  kind: SemanticTokenKind;
  x: number;
  y: number;
} | null;

type JumpTooltipContextValue = {
  jumpTooltip: JumpTooltipState;
  setJumpTooltip: Dispatch<SetStateAction<JumpTooltipState>>;
};

const JumpTooltipContext = createContext<JumpTooltipContextValue | null>(null);

let clearJumpTooltipExternal: (() => void) | null = null;

/** Called from trace teardown without subscribing to tooltip context. */
export function clearJumpTooltip(): void {
  clearJumpTooltipExternal?.();
}

export function JumpTooltipProvider({ children }: { children: ReactNode }) {
  const [jumpTooltip, setJumpTooltip] = useState<JumpTooltipState>(null);

  useEffect(() => {
    clearJumpTooltipExternal = () => setJumpTooltip(null);
    return () => {
      clearJumpTooltipExternal = null;
    };
  }, []);

  const value = useMemo(
    () => ({ jumpTooltip, setJumpTooltip }),
    [jumpTooltip],
  );

  return (
    <JumpTooltipContext.Provider value={value}>
      {children}
    </JumpTooltipContext.Provider>
  );
}

export function useJumpTooltip(): JumpTooltipContextValue {
  const ctx = useContext(JumpTooltipContext);
  if (!ctx) {
    throw new Error("useJumpTooltip must be used within JumpTooltipProvider");
  }
  return ctx;
}
