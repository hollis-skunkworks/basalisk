import { CircleCheckIcon, CircleXIcon } from "lucide-react"

import { CardFrame } from "@/components/ui/card-frame"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"

/** How far long work has got. With no value it only says the work is going. Surface's own. */
interface CardProgressProps {
  title?: string
  label?: string
  value?: number
  max?: number
  status?: "running" | "done" | "failed"
  detail?: string
  className?: string
}

function CardProgress({ title, label, value, max = 100, status = "running", detail, className }: CardProgressProps) {
  const known = typeof value === "number" && max > 0
  const percent = known ? Math.round((Math.min(Math.max(value, 0), max) / max) * 100) : null
  return (
    <CardFrame
      data-slot="card-progress"
      title={title ?? label ?? "Working"}
      icon={status === "done" ? <CircleCheckIcon className="text-success" /> : status === "failed" ? <CircleXIcon className="text-destructive" /> : <Spinner />}
      tone={status === "failed" ? "danger" : "default"}
      meta={percent !== null ? <span className="text-xs text-muted-foreground tabular-nums">{percent}%</span> : undefined}
      className={className}
    >
      {title && label && <p className="text-sm">{label}</p>}
      {percent !== null && (
        <Progress value={percent} aria-label={label ?? title ?? "Progress"} />
      )}
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </CardFrame>
  )
}

export { CardProgress }
export type { CardProgressProps }
