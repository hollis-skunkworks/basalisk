import * as React from "react"
import { ArrowDownIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"

/**
 * A conversation's frame, after AI Elements' Conversation: a region that holds a scrolling
 * viewport and, over it, a button back to the end. It draws; keeping to the end is the
 * caller's (put a ref on ConversationViewport and ConversationContent).
 */
function Conversation({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="conversation" className={cn("relative min-h-0 flex-1 overflow-hidden", className)} {...props} />
}

function ConversationViewport({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="conversation-viewport"
      role="log"
      className={cn("absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain", className)}
      {...props}
    />
  )
}

function ConversationContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="conversation-content" className={cn("flex min-w-0 max-w-full flex-col gap-4 p-4", className)} {...props} />
}

function ConversationEmptyState({
  className,
  icon,
  title,
  description,
  children,
  ...props
}: React.ComponentProps<"div"> & { icon?: React.ReactNode; title?: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div
      data-slot="conversation-empty-state"
      className={cn("flex size-full flex-col items-center justify-center gap-3 p-8 text-center", className)}
      {...props}
    >
      {children ?? (
        <>
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <div className="space-y-1">
            {title && <h3 className="text-sm font-medium">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </>
      )}
    </div>
  )
}

function ConversationScrollButton({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="conversation-scroll-button"
      variant="outline"
      size="icon-sm"
      aria-label="Scroll to the latest"
      className={cn("absolute bottom-3 left-1/2 -translate-x-1/2 rounded-sm shadow-sm", className)}
      {...props}
    >
      <ArrowDownIcon />
    </Button>
  )
}

export { Conversation, ConversationViewport, ConversationContent, ConversationEmptyState, ConversationScrollButton }
