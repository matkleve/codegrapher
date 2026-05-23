import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CtrlKeyContextValue = {
  isCtrlHeld: boolean;
};

const CtrlKeyContext = createContext<CtrlKeyContextValue>({ isCtrlHeld: false });

export function CtrlKeyProvider({ children }: { children: ReactNode }) {
  const [isCtrlHeld, setIsCtrlHeld] = useState(false);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Control") setIsCtrlHeld(true);
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Control") setIsCtrlHeld(false);
  }, []);

  const onBlur = useCallback(() => {
    setIsCtrlHeld(false);
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [onBlur, onKeyDown, onKeyUp]);

  const value = useMemo(() => ({ isCtrlHeld }), [isCtrlHeld]);

  return <CtrlKeyContext.Provider value={value}>{children}</CtrlKeyContext.Provider>;
}

export function useCtrlKey(): CtrlKeyContextValue {
  return useContext(CtrlKeyContext);
}
