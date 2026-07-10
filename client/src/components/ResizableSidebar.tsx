import { PanelLeftOpen } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SidebarLayoutProvider, useSidebarLayout } from "@/context/SidebarLayoutContext";
import { SIDEBAR_COLLAPSED_WIDTH } from "@/lib/sidebarLayout";
import { cn } from "@/lib/utils";

function ResizableSidebarInner({ children }: { children: ReactNode }) {
  const {
    width,
    collapsed,
    isResizing,
    toggleCollapsed,
    onResizeMouseDown,
    onResizeDoubleClick,
  } = useSidebarLayout();

  return (
    <div
      className={cn(
        "relative flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground",
        !isResizing && "transition-[width] duration-200 ease-out",
        isResizing && "sidebar-resizing",
      )}
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : width }}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-2 p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            title="Sidebar einblenden"
            aria-label="Sidebar einblenden"
            className="size-[var(--control-height-lg)] shrink-0"
          >
            <PanelLeftOpen data-icon="inline-start" />
          </Button>
        </div>
      ) : (
        <>
          {children}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Sidebar-Breite anpassen"
            className={cn("sidebar-resize-handle", isResizing && "sidebar-resize-handle--active")}
            onMouseDown={onResizeMouseDown}
            onDoubleClick={onResizeDoubleClick}
          />
        </>
      )}
    </div>
  );
}

export function ResizableSidebar({ children }: { children: ReactNode }) {
  return (
    <SidebarLayoutProvider>
      <ResizableSidebarInner>{children}</ResizableSidebarInner>
    </SidebarLayoutProvider>
  );
}
