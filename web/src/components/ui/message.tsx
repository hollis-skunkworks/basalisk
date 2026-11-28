import * as React from "react"
import { cn } from "cn"

/**
 * One message, after AI Elements' Message: the person's on the right in a bubble, the
 * agent's across the width. MessageNotice is a line from the application (stopped, an error).
 */
function Message({ className, from, ...props }: React.ComponentProps<"div"> & { from: "user" | "assistant" }) {
  return (
    <div
      data-slot="message"
      data-from={from}
      className={cn("group/message flex w-full min-w-0", from === "user" ? "justify-end" : "justify-start", className)}
      {...props}
    />
  )
}

function MessageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="message-content"
      className={cn(
        "flex min-w-0 max-w-full flex-col gap-2 overflow-hidden text-[13px] leading-relaxed wrap-anywhere text-foreground",
        "group-data-[from=assistant]/message:w-full group-data-[from=assistant]/message:rounded-md group-data-[from=assistant]/message:border group-data-[from=assistant]/message:border-border/80 group-data-[from=assistant]/message:bg-card/75 group-data-[from=assistant]/message:px-3.5 group-data-[from=assistant]/message:py-2.5",
        "group-data-[from=user]/message:max-w-[85%] group-data-[from=user]/message:rounded-[6px_6px_2px_6px] group-data-[from=user]/message:border group-data-[from=user]/message:border-primary/30 group-data-[from=user]/message:bg-accent/70 group-data-[from=user]/message:px-3 group-data-[from=user]/message:py-1.5 group-data-[from=user]/message:whitespace-pre-wrap group-data-[from=user]/message:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function MessageNotice({ className, tone = "quiet", ...props }: React.ComponentProps<"p"> & { tone?: "quiet" | "error" }) {
  return (
    <p
      data-slot="message-notice"
      data-tone={tone}
      className={cn("text-xs", tone === "error" ? "text-destructive" : "text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Message, MessageContent, MessageNotice }
