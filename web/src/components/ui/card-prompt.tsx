"use client"

import { MessageCircleQuestionIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { type AnswerableCardProps, CardBody, CardFoot, CardFrame, CardStatus, useCardDraft, useCardRespond } from "@/components/ui/card-frame"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"

/** One question answered in the person's own words. Surface's own. */
interface CardPromptProps extends AnswerableCardProps {
  question: string
  body?: string
  placeholder?: string
  multiline?: boolean
}

function CardPrompt({ title, question, body, placeholder, multiline, draft, onDraft, className, ...a }: CardPromptProps) {
  const { disabled, working, respond } = useCardRespond(a)
  const [text, setText] = React.useState(() => (typeof draft?.text === "string" ? draft.text : ""))
  useCardDraft({ text }, onDraft)
  const id = React.useId()
  const send = () => {
    if (text.trim()) void respond({ status: "submitted", answers: [{ questionId: "answer", value: text.trim() }] })
  }
  return (
    <CardFrame
      data-slot="card-prompt"
      title={title ?? "A question"}
      icon={<MessageCircleQuestionIcon />}
      meta={<CardStatus state={a.state} />}
      className={className}
      footer={
        <CardFoot {...a}>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => void respond({ status: "canceled" })}>
            Skip
          </Button>
          <Button size="sm" disabled={disabled || !text.trim()} onClick={send}>
            {working && <Spinner />}
            Answer
          </Button>
        </CardFoot>
      }
    >
      <CardBody>{body}</CardBody>
      <label htmlFor={id} className="text-sm font-medium">
        {question}
      </label>
      {a.state === "open" || a.state === "pending" ? (
        multiline ? (
          <Textarea id={id} rows={3} value={text} placeholder={placeholder} disabled={disabled} onChange={(e) => setText(e.target.value)} />
        ) : (
          <Input
            id={id}
            value={text}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send()
            }}
          />
        )
      ) : null}
    </CardFrame>
  )
}

export { CardPrompt }
export type { CardPromptProps }
