import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardBody, CardFrame, type CardState } from "@/components/ui/card-frame"

/**
 * A notice: something the person should know, with nothing to answer. tone "error" is a
 * failure, with the detail (a message, a trace) kept behind the body. Surface's own.
 */
interface CardNoticeProps {
  title?: string
  body?: string
  tone?: "info" | "success" | "warning" | "error"
  /** The raw detail of a failure, shown as preformatted text. */
  detail?: string
  state?: CardState
  /** Shown as a dismiss button while the card is open. */
  onDismiss?: () => void
  className?: string
}

const ICONS = { info: InfoIcon, success: CircleCheckIcon, warning: TriangleAlertIcon, error: CircleAlertIcon }
const FRAME = { info: "default", success: "success", warning: "warning", error: "danger" } as const

function CardNotice({ title, body, tone = "info", detail, state = "open", onDismiss, className }: CardNoticeProps) {
  const Icon = ICONS[tone]
  return (
    <CardFrame
      data-slot="card-notice"
      title={title ?? (tone === "error" ? "Something failed" : "Notice")}
      icon={<Icon className={tone === "error" ? "text-destructive" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : undefined} />}
      tone={FRAME[tone]}
      meta={
        state === "open" && onDismiss ? (
          <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={onDismiss}>
            <XIcon />
          </Button>
        ) : undefined
      }
      className={className}
    >
      {(body || detail) && (
        <>
          <CardBody className="text-foreground">{body}</CardBody>
          {detail && (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
              {detail}
            </pre>
          )}
        </>
      )}
    </CardFrame>
  )
}

export { CardNotice }
export type { CardNoticeProps }
