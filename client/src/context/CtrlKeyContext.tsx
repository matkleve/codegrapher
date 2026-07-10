import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const CTRL_PREVIEW_CLASS = "graph-ctrl-preview";

type CtrlKeyContextValue = {
  isCtrlActive: boolean;
};

const CtrlKeyContext = createContext<CtrlKeyContextValue>({
  isCtrlActive: false,
});

function setCtrlPreviewDom(active: boolean): void {
  document.documentElement.classList.toggle(CTRL_PREVIEW_CLASS, active);
}

export function CtrlKeyProvider({ children }: { children: ReactNode }) {
  const [physicalHeld, setPhysicalHeld] = useState(false);

  // Single source of truth for the DOM class — every state transition below
  // goes through setPhysicalHeld, never setCtrlPreviewDom directly, so the
  // two can't drift apart.
  useEffect(() => {
    setCtrlPreviewDom(physicalHeld);
  }, [physicalHeld]);

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Control" || e.repeat) return;
    setPhysicalHeld(true);
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Control") return;
    setPhysicalHeld(false);
  }, []);

  const onBlur = useCallback(() => {
    setPhysicalHeld(false);
  }, []);

  // Keydown/keyup only fire on state transitions: if focus is lost while
  // Ctrl is held (alt-tab, devtools, browser chrome) and the key is still
  // down when focus returns, no new keydown ever arrives, so `blur` above
  // would leave us permanently believing Ctrl is up. Pointer events always
  // carry the live modifier state, so resync from them on every move —
  // this heals the desync within one mouse movement instead of requiring a
  // fresh release+press.
  const onPointerMove = useCallback((e: PointerEvent) => {
    setPhysicalHeld((prev) => (prev === e.ctrlKey ? prev : e.ctrlKey));
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointermove", onPointerMove);
      setCtrlPreviewDom(false);
    };
  }, [onBlur, onKeyDown, onKeyUp, onPointerMove]);

  const value = useMemo(() => ({ isCtrlActive: physicalHeld }), [physicalHeld]);

  return <CtrlKeyContext.Provider value={value}>{children}</CtrlKeyContext.Provider>;
}

export function useCtrlKey(): CtrlKeyContextValue {
  return useContext(CtrlKeyContext);
}
