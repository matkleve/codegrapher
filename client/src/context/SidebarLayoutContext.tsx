import { createContext, useContext, type ReactNode } from "react";
import { useResizableSidebar, type ResizableSidebarState } from "@/hooks/useResizableSidebar";

const SidebarLayoutContext = createContext<ResizableSidebarState | null>(null);

export function SidebarLayoutProvider({ children }: { children: ReactNode }) {
  const layout = useResizableSidebar();
  return (
    <SidebarLayoutContext.Provider value={layout}>{children}</SidebarLayoutContext.Provider>
  );
}

export function useSidebarLayout(): ResizableSidebarState {
  const layout = useContext(SidebarLayoutContext);
  if (!layout) {
    throw new Error("useSidebarLayout must be used within SidebarLayoutProvider");
  }
  return layout;
}
