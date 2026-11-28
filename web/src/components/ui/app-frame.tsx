import * as React from "react"
import { cn } from "cn"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

/**
 * An app's frame: a bar across the top, a rail down the left, a side panel on the right,
 * and the content in the middle. Each region is optional. The bar shows when it is given;
 * the rail and the side panel are sidebars and stay hidden until the app opens them
 * (`showRail`, `showSide`), so a new app starts with the content alone and a button to open
 * what it needs. The side panel can be dragged wider or narrower. Layout
 * only: what goes in each region is the app's.
 */
function AppFrame({
  bar,
  rail,
  side,
  showBar = true,
  showRail = false,
  showSide = false,
  sideSize = 420,
  sideMinSize = 280,
  sideMaxSize = "60%",
  onSideResize,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  bar?: React.ReactNode
  rail?: React.ReactNode
  side?: React.ReactNode
  showBar?: boolean
  showRail?: boolean
  showSide?: boolean
  /** The side panel's width when it opens, in pixels. */
  sideSize?: number
  sideMinSize?: number | string
  sideMaxSize?: number | string
  /** The side panel's width, in pixels, as the person drags it. */
  onSideResize?: (px: number) => void
  children?: React.ReactNode
}) {
  const withSide = showSide && side !== undefined && side !== null
  return (
    <div data-slot="app-frame" className={cn("flex h-full min-h-0 flex-col bg-background text-foreground", className)} {...props}>
      {showBar && bar !== undefined && bar !== null && (
        <header
          data-slot="app-frame-bar"
          className="flex h-8 shrink-0 items-center justify-between gap-3 border-b border-border bg-desk/90 px-2.5 font-mono text-xs text-muted-foreground select-none"
        >
          {bar}
        </header>
      )}
      <div className="flex min-h-0 flex-1">
        {showRail && rail !== undefined && rail !== null && (
          <nav data-slot="app-frame-rail" className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border py-2">
            {rail}
          </nav>
        )}
        <ResizablePanelGroup orientation="horizontal" className="min-w-0 flex-1">
          <ResizablePanel id="content" minSize={240}>
            <main data-slot="app-frame-content" className="relative size-full min-h-0 min-w-0 overflow-hidden">
              {children}
            </main>
          </ResizablePanel>
          {withSide && (
            <>
              <ResizableHandle />
              <ResizablePanel
                id="side"
                defaultSize={sideSize}
                minSize={sideMinSize}
                maxSize={sideMaxSize}
                groupResizeBehavior="preserve-pixel-size"
                onResize={(size) => onSideResize?.(Math.round(size.inPixels))}
              >
                <aside data-slot="app-frame-side" className="flex size-full min-h-0 flex-col overflow-hidden bg-background">
                  {side}
                </aside>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

export { AppFrame }
