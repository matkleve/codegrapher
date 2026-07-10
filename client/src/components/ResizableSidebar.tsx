import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
    collapseWarning,
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
        collapseWarning && "sidebar-collapse-warning",
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
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col",
              collapseWarning && "sidebar-collapse-warning__content",
            )}
          >
            {children}
          </div>
          {collapseWarning ? (
            <div
              className="sidebar-collapse-warning__overlay"
              aria-hidden
            >
              <PanelLeftClose data-icon className="size-5 shrink-0" />
              <span className="sidebar-collapse-warning__label">Loslassen zum Einklappen</span>
            </div>
          ) : null}
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
