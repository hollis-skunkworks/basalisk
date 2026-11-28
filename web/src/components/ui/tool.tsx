import * as React from "react"
import { CheckIcon, ChevronDownIcon, WrenchIcon, XIcon } from "lucide-react"
import { cn } from "cn"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Spinner } from "@/components/ui/spinner"

/**
 * A plain row for a tool the agent called, after AI Elements' Tool: what it called and how
 * it went, folded; open, the input and what came back. Richer cards for particular tools
 * (an approval, a plan, progress) are their own components.
 */
type ToolStatus = "running" | "done" | "error"

function Tool({ className, ...props }: React.ComponentProps<typeof Collapsible>) {
  return <Collapsible data-slot="tool" className={cn("w-full rounded-md border border-border", className)} {...props} />
}

function ToolHeader({
  className,
  title,
  status,
  ...props
}: Omit<React.ComponentProps<typeof CollapsibleTrigger>, "title"> & { title: React.ReactNode; status: ToolStatus }) {
  return (
    <CollapsibleTrigger
      data-slot="tool-header"
      className={cn(
        "group/tool flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      {...props}
    >
      <WrenchIcon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate font-mono">{title}</span>
      {status === "running" && <Spinner className="size-3.5 text-muted-foreground" />}
      {status === "done" && <CheckIcon aria-label="Done" className="size-3.5 text-success" />}
      {status === "error" && <XIcon aria-label="Failed" className="size-3.5 text-destructive" />}
      <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/tool:rotate-180" />
    </CollapsibleTrigger>
  )
}

function ToolContent({ className, ...props }: React.ComponentProps<typeof CollapsibleContent>) {
  return (
    <CollapsibleContent
      data-slot="tool-content"
      className={cn("flex flex-col gap-2 border-t border-border px-2.5 py-2 text-xs", className)}
      {...props}
    />
  )
}

function ToolSection({ label, children, error = false }: { label: string; children: React.ReactNode; error?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="font-medium text-muted-foreground">{label}</span>
      <pre
        className={cn(
          "max-h-64 overflow-auto rounded-sm bg-muted p-2 font-mono text-xs break-words whitespace-pre-wrap",
          error && "text-destructive"
        )}
      >
        {children}
      </pre>
    </div>
  )
}

function ToolInput({ input }: { input: unknown }) {
  if (input === undefined || input === null) return null
  return <ToolSection label="Input">{typeof input === "string" ? input : JSON.stringify(input, null, 2)}</ToolSection>
}

function ToolOutput({ output, error = false }: { output?: string; error?: boolean }) {
  if (!output) return null
  return (
    <ToolSection label={error ? "Error" : "Result"} error={error}>
      {output}
    </ToolSection>
  )
}

export { Tool, ToolHeader, ToolContent, ToolInput, ToolOutput, type ToolStatus }
