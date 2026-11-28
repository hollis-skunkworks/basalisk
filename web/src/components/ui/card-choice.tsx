"use client"

import { CheckIcon, ListChecksIcon } from "lucide-react"
import * as React from "react"

import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { type AnswerableCardProps, CardBody, CardFoot, CardFrame, CardStatus, useCardDraft, useCardRespond } from "@/components/ui/card-frame"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

/** Pick one of a few options, or several, or write another. Surface's own. */
interface CardChoiceOption {
  id: string
  label: string
  description?: string
}

interface CardChoiceProps extends AnswerableCardProps {
  question: string
  body?: string
  options: CardChoiceOption[]
  /** More than one may be picked. */
  multiple?: boolean
  /** The person may write an answer that is not on the list. */
  allowOther?: boolean
}

function CardChoice({ title, question, body, options, multiple, allowOther = true, draft, onDraft, className, ...a }: CardChoiceProps) {
  const { disabled, working, respond } = useCardRespond(a)
  const [picked, setPicked] = React.useState<string[]>(() =>
    Array.isArray(draft?.picked) ? draft.picked.filter((x): x is string => typeof x === "string") : [],
  )
  const [other, setOther] = React.useState(() => (typeof draft?.other === "string" ? draft.other : ""))
  useCardDraft({ picked, other }, onDraft)
  const toggle = (id: string) =>
    setPicked((was) => (multiple ? (was.includes(id) ? was.filter((x) => x !== id) : [...was, id]) : was.includes(id) ? [] : [id]))
  const otherOn = picked.includes("other")
  const ready = picked.length > 0 && (!otherOn || other.trim() !== "")
  const send = () =>
    void respond({
      status: "submitted",
      answers: [{ questionId: "choice", value: multiple ? picked : picked[0], ...(otherOn ? { note: other.trim() } : {}) }],
    })
  const open = a.state === "open" || a.state === "pending"
  const hasOther = options.some((o) => o.id === "other")
  const all = allowOther && !hasOther ? [...options, { id: "other", label: "Other: tell the agent…" }] : options
  return (
    <CardFrame
      data-slot="card-choice"
      title={title ?? "A choice"}
      icon={<ListChecksIcon />}
      meta={<CardStatus state={a.state} />}
      className={className}
      footer={
        <CardFoot {...a}>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => void respond({ status: "canceled" })}>
            Skip
          </Button>
          <Button size="sm" disabled={disabled || !ready} onClick={send}>
            {working && <Spinner />}
            {multiple ? "Choose these" : "Choose"}
          </Button>
        </CardFoot>
      }
    >
      <CardBody>{body}</CardBody>
      <p className="text-[13px] font-medium leading-snug text-foreground">{question}</p>
      {open && (
        <fieldset className="flex flex-col gap-1.5" aria-label={question}>
          {all.map((o, idx) => {
            const on = picked.includes(o.id)
            const keyLetter = o.id === "other" ? "…" : String.fromCharCode(65 + (idx % 26))
            return (
              <Button
                key={o.id}
                variant="outline"
                role={multiple ? "checkbox" : "radio"}
                aria-checked={on}
                disabled={disabled}
                className={cn(
                  "group/choice h-auto justify-start gap-2.5 rounded-sm border-border/80 bg-muted/25 px-3 py-2 text-left whitespace-normal transition-colors hover:border-primary/45 hover:bg-accent/35",
                  on && "border-primary/70 bg-primary/12 text-foreground shadow-2xs hover:border-primary/80 hover:bg-primary/15",
                )}
                onClick={() => toggle(o.id)}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 font-mono text-[10px] font-semibold text-muted-foreground transition-colors group-hover/choice:border-primary/50 group-hover/choice:text-foreground",
                    multiple && "rounded-[4px]",
                    on && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {on ? <CheckIcon className="size-3" /> : keyLetter}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-xs font-medium leading-snug text-foreground">{o.label}</span>
                  {o.description && (
                    <span className="text-[11px] font-normal leading-relaxed text-muted-foreground">{o.description}</span>
                  )}
                </span>
              </Button>
            )
          })}
          {otherOn && (
            <Input
              autoFocus
              value={other}
              placeholder="Tell the agent…"
              disabled={disabled}
              aria-label="Other: tell the agent"
              onChange={(e) => setOther(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && ready) send()
              }}
            />
          )}
        </fieldset>
      )}
    </CardFrame>
  )
}

export { CardChoice }
export type { CardChoiceOption, CardChoiceProps }
