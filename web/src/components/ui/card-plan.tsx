import { CheckIcon, CircleDashedIcon, ListTodoIcon, MinusIcon } from "lucide-react"

import { cn } from "cn"
import { CardFrame } from "@/components/ui/card-frame"
import { Spinner } from "@/components/ui/spinner"

/** The steps of a piece of work, and where it has got to. Surface's own. */
interface CardPlanStep {
  id: string
  title: string
  status?: "pending" | "active" | "done" | "skipped"
  detail?: string
}

interface CardPlanProps {
  title?: string
  steps: CardPlanStep[]
  className?: string
}

function CardPlan({ title, steps, className }: CardPlanProps) {
  const done = steps.filter((s) => s.status === "done").length
  return (
    <CardFrame
      data-slot="card-plan"
      title={title ?? "Plan"}
      icon={<ListTodoIcon />}
      meta={<span className="text-xs text-muted-foreground tabular-nums">{done} of {steps.length}</span>}
      className={className}
    >
      <ol className="flex flex-col gap-1.5">
        {steps.map((s) => {
          const status = s.status ?? "pending"
          return (
            <li key={s.id} data-status={status} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground">
                {status === "done" ? <CheckIcon className="size-4 text-success" /> : status === "active" ? <Spinner className="size-3.5" /> : status === "skipped" ? <MinusIcon className="size-4" /> : <CircleDashedIcon className="size-4" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className={cn(status === "done" && "text-muted-foreground", status === "skipped" && "text-muted-foreground line-through", status === "active" && "font-medium")}>{s.title}</span>
                {s.detail && <span className="text-xs text-muted-foreground">{s.detail}</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </CardFrame>
  )
}

export { CardPlan }
export type { CardPlanProps, CardPlanStep }
