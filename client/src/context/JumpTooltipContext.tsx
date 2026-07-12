import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { SemanticTokenKind } from "@/lib/tokenColors";

export type JumpWireEnd = "from" | "to";

export type JumpChoice = {
  label: string;
  kind: SemanticTokenKind;
  wireEnd: JumpWireEnd;
};

export type JumpTooltipState = {
  wireId: string;
  x: number;
  y: number;
  mode: "single" | "choice";
  single?: JumpChoice;
  choices?: JumpChoice[];
} | null;

type JumpTooltipContextValue = {
  jumpTooltip: JumpTooltipState;
  setJumpTooltip: Dispatch<SetStateAction<JumpTooltipState>>;
  hoveredWireId: string | null;
  setHoveredWireId: Dispatch<SetStateAction<string | null>>;
  wireJumpRef: MutableRefObject<((wireId: string, end: JumpWireEnd) => void) | null>;
};

const JumpTooltipContext = createContext<JumpTooltipContextValue | null>(null);

let clearJumpTooltipExternal: (() => void) | null = null;

/** Called from trace teardown without subscribing to tooltip context. */
export function clearJumpTooltip(): void {
  clearJumpTooltipExternal?.();
}

export function JumpTooltipProvider({ children }: { children: ReactNode }) {
  const [jumpTooltip, setJumpTooltip] = useState<JumpTooltipState>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const wireJumpRef = useRef<((wireId: string, end: JumpWireEnd) => void) | null>(null);

  useEffect(() => {
    clearJumpTooltipExternal = () => {
      setJumpTooltip(null);
      setHoveredWireId(null);
    };
    return () => {
      clearJumpTooltipExternal = null;
    };
  }, []);

  const value = useMemo(
    () => ({ jumpTooltip, setJumpTooltip, hoveredWireId, setHoveredWireId, wireJumpRef }),
    [jumpTooltip, hoveredWireId],
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
