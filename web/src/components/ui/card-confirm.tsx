"use client"

import { CircleHelpIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { type AnswerableCardProps, CardBody, CardFoot, CardFrame, CardStatus, useCardRespond } from "@/components/ui/card-frame"
import { Spinner } from "@/components/ui/spinner"

/** A yes or no: go ahead, or don't. Surface's own. */
interface CardConfirmProps extends AnswerableCardProps {
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Going ahead destroys something: the confirm button says so. */
  danger?: boolean
}

function CardConfirm({ title, body, confirmLabel = "Confirm", cancelLabel = "Cancel", danger, allowOther = true, className, ...a }: CardConfirmProps) {
  const { disabled, working, respond } = useCardRespond(a)
  return (
    <CardFrame
      data-slot="card-confirm"
      title={title ?? "Confirm"}
      icon={<CircleHelpIcon />}
      tone={danger ? "danger" : "default"}
      meta={<CardStatus state={a.state} />}
      className={className}
      footer={
        <CardFoot {...a} allowOther={allowOther} receipt={a.receipt ?? (a.state === "submitted" ? confirmLabel : undefined)}>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => void respond({ status: "canceled" })}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "destructive" : "default"} size="sm" disabled={disabled} onClick={() => void respond({ status: "submitted" })}>
            {working && <Spinner />}
            {confirmLabel}
          </Button>
        </CardFoot>
      }
    >
      {body ? <CardBody className="text-foreground">{body}</CardBody> : null}
    </CardFrame>
  )
}

export { CardConfirm }
export type { CardConfirmProps }
