import * as React from "react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

/**
 * A guide's caption and the person's say over it, after ADE's guide bar: what this step
 * says, how far along it is, and back, next (or skip, when the step waits for something real),
 * pause or resume, and stop. It only draws; the caller owns the guide.
 */
type GuideBarStatus = "running" | "paused" | "done"

function GuideBar({
  title,
  say,
  step,
  steps,
  status,
  waiting,
  hint,
  onBack,
  onNext,
  onPause,
  onResume,
  onStop,
  className,
  ...props
}: Omit<React.ComponentProps<"section">, "title"> & {
  title: React.ReactNode
  say: React.ReactNode
  /** This step, from 1. */
  step: number
  steps: number
  status: GuideBarStatus
  /** What the step waits for, when it is something to do rather than Next. */
  waiting?: React.ReactNode
  hint?: React.ReactNode
  onBack?: () => void
  onNext?: () => void
  onPause?: () => void
  onResume?: () => void
  onStop?: () => void
}) {
  const last = step >= steps
  return (
    <section
      data-slot="guide-bar"
      data-status={status}
      aria-label="Guide"
      className={cn(
        "flex w-full max-w-xl flex-col gap-2.5 rounded-xl bg-popover p-3.5 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10",
        className
      )}
      {...props}
    >
      <header className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {status === "done" ? "finished" : `step ${step} of ${steps}${status === "paused" ? " · paused" : ""}`}
        </span>
      </header>
      <Progress value={status === "done" ? 100 : ((step - 1) / Math.max(1, steps)) * 100} aria-label="How far along" />
      {status !== "done" && (
        <p className="leading-relaxed" aria-live="polite">
          {say}
        </p>
      )}
      {status === "running" && waiting && <p className="text-xs text-muted-foreground">{waiting}</p>}
      {hint && <p className="text-xs text-warning">{hint}</p>}
      <footer className="flex flex-wrap items-center gap-1.5">
        {status === "done" ? (
          <Button size="sm" className="ml-auto" onClick={onStop}>
            Close
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" disabled={step <= 1 || !onBack} onClick={onBack}>
              Back
            </Button>
            {status === "paused" ? (
              <Button variant="outline" size="sm" onClick={onResume}>
                Resume
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={onPause}>
                Pause
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onStop}>
              Stop
            </Button>
            {status === "running" && (
              <Button size="sm" className="ml-auto" variant={waiting ? "outline" : "default"} onClick={onNext}>
                {waiting ? "Skip" : last ? "Finish" : "Next"}
              </Button>
            )}
          </>
        )}
      </footer>
    </section>
  )
}

export { GuideBar, type GuideBarStatus }
