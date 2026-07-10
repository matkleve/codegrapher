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
  isCtrlActive: boolean;
};

const CtrlKeyContext = createContext<CtrlKeyContextValue>({
  isCtrlActive: false,
});

export function CtrlKeyProvider({ children }: { children: ReactNode }) {
  const [physicalHeld, setPhysicalHeld] = useState(false);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Control") setPhysicalHeld(true);
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Control") setPhysicalHeld(false);
  }, []);

  const onBlur = useCallback(() => {
    setPhysicalHeld(false);
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

  const value = useMemo(() => ({ isCtrlActive: physicalHeld }), [physicalHeld]);

  return <CtrlKeyContext.Provider value={value}>{children}</CtrlKeyContext.Provider>;
}

export function useCtrlKey(): CtrlKeyContextValue {
  return useContext(CtrlKeyContext);
}
