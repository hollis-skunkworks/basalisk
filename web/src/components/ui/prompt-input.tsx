import * as React from "react"
import { ArrowUpIcon, Loader2Icon, SquareIcon } from "lucide-react"
import { cn } from "cn"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group"

/**
 * Where a message is written, after AI Elements' PromptInput: a form around an InputGroup,
 * a textarea that grows with its text (Enter sends, Shift+Enter breaks the line), and a
 * footer with the send button, which is a stop button while the agent answers.
 */
function PromptInput({ className, children, ...props }: React.ComponentProps<"form">) {
  return (
    <form data-slot="prompt-input" className={cn("w-full", className)} {...props}>
      <InputGroup className="h-auto items-end gap-1.5 rounded-md border-border bg-card/90 px-2.5 py-1.5 has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:items-stretch has-[>[data-align=block-end]]:px-0 has-[>[data-align=block-end]]:py-0 has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:items-stretch has-[>[data-align=block-start]]:px-0 has-[>[data-align=block-start]]:py-0 has-[textarea:enabled]:has-disabled:bg-card/90 has-[textarea:enabled]:has-disabled:opacity-100 dark:has-[textarea:enabled]:has-disabled:bg-card/90">
        {children}
      </InputGroup>
    </form>
  )
}

function PromptInputTextarea({ className, onKeyDown, ...props }: React.ComponentProps<typeof InputGroupTextarea>) {
  return (
    <InputGroupTextarea
      data-prompt-input-textarea=""
      className={cn(
        "field-sizing-content max-h-40 min-h-6.5 px-0 py-0.5 text-[13px] leading-snug group-has-[>[data-align=block-end]]/input-group:min-h-10 group-has-[>[data-align=block-end]]/input-group:px-2.5 group-has-[>[data-align=block-end]]/input-group:pt-2",
        className,
      )}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented) return
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault()
          e.currentTarget.form?.requestSubmit()
        }
      }}
      {...props}
    />
  )
}

function PromptInputFooter({ className, ...props }: React.ComponentProps<typeof InputGroupAddon>) {
  return <InputGroupAddon align="block-end" className={cn("justify-between gap-2 px-2.5 pb-1.5 pt-1", className)} {...props} />
}

function PromptInputSubmit({
  status = "ready",
  onStop,
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof InputGroupButton>, "type" | "children"> & {
  status?: "ready" | "sending" | "streaming"
  onStop?: () => void
}) {
  const streaming = status === "streaming"
  const sending = status === "sending"
  return (
    <InputGroupButton
      data-slot="prompt-input-submit"
      variant={streaming ? "destructive" : "default"}
      size="icon-xs"
      className={cn("ml-auto size-6.5 shrink-0 rounded-sm", className)}
      aria-label={sending ? "Sending message" : streaming ? "Stop" : "Send"}
      {...props}
      disabled={disabled || sending}
      aria-busy={sending || undefined}
      type={streaming || sending ? "button" : "submit"}
      onClick={streaming ? onStop : props.onClick}
    >
      {sending ? <Loader2Icon className="animate-spin motion-reduce:animate-none" /> : streaming ? <SquareIcon className="fill-current" /> : <ArrowUpIcon />}
    </InputGroupButton>
  )
}

export { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit }
