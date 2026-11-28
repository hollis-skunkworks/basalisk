"use client"

import { ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon, SparklesIcon } from "lucide-react"
import * as React from "react"

import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardFrame } from "@/components/ui/card-frame"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

/**
 * A generated surface: one of three reviewed patterns (an approval, a form, a list with
 * detail) that something other than the app's own code asked to show. It is drawn with the
 * app's components, so it looks like the rest of the app, and every string in it is drawn
 * as text. It only draws: what an action does, whether it is allowed and what came of it
 * are the host's, and arrive here as `phase` and `status`. Surface's own.
 */

type GenuiPattern =
  | {
      kind: "approval"
      title: string
      summary?: string
      changes: { label: string; before: string; after: string }[]
      choices: { label: string; risk?: string }[]
    }
  | {
      kind: "form"
      title: string
      fields: {
        key: string
        label: string
        type: "text" | "textarea" | "checkbox" | "integer"
        required: boolean
        help?: string
        min?: number
        max?: number
        maxLength?: number
      }[]
      draft?: Record<string, unknown>
      submitLabel: string
    }
  | {
      kind: "list_detail"
      title: string
      items: { id: string; title: string; summary?: string }[]
      selectedId?: string
      detail?: { title: string; body: string }
    }

/** Where the surface's action stands. "ready" takes input; "terminal" is over. */
type GenuiPhase = "ready" | "busy" | "pending" | "confirmation" | "unknown" | "terminal" | "stale"

interface GenuiSurfaceProps {
  pattern: GenuiPattern
  /** The state the surface itself was sent in. Anything but "ready" takes no input. */
  view?: "ready" | "loading" | "empty" | "error" | "stale" | "conflict" | "expired"
  phase: GenuiPhase
  /** The outcome's status as the host gave it ("ok", "refused", "conflict"), once there is one. */
  status?: string
  /** A sentence from the host or the controller about an uncertain result. */
  message?: string
  /** What the host asks the person to confirm, when the phase is "confirmation". */
  confirmation?: string
  /** The person may confirm (the host offers a confirmation step). */
  canConfirm?: boolean
  /** Checks a form's values: an error sentence per field key that is wrong. */
  validate?: (draft: Record<string, unknown>) => Record<string, string>
  /** A choice was taken: its index, and the form's values for a form. */
  onChoose: (index: number, draft?: Record<string, unknown>) => void
  onConfirm?: () => void
  /** Ask the host what became of the action. It only reads. */
  onCheck?: () => void
  /** A list item was picked; an empty id goes back to the list. */
  onSelect?: (id: string) => void
  className?: string
}

const STATUS: Record<string, { label: string; tone: "secondary" | "outline" | "destructive" }> = {
  ok: { label: "Done", tone: "secondary" },
  accepted: { label: "Accepted", tone: "secondary" },
  needs_confirmation: { label: "Needs confirming", tone: "outline" },
  refused: { label: "Refused", tone: "destructive" },
  conflict: { label: "Already answered", tone: "outline" },
  stale: { label: "Out of date", tone: "outline" },
  canceled: { label: "Canceled", tone: "outline" },
  expired: { label: "Expired", tone: "outline" },
  superseded: { label: "Replaced", tone: "outline" },
  failed: { label: "Failed", tone: "destructive" },
}

const VIEW: Record<string, string> = {
  loading: "Loading…",
  empty: "Nothing here.",
  error: "This could not be loaded.",
  stale: "This is out of date. Ask for it again.",
  conflict: "This was changed elsewhere.",
  expired: "This has expired.",
}

function GenuiSurface({
  pattern,
  view = "ready",
  phase,
  status,
  message,
  confirmation,
  canConfirm,
  validate,
  onChoose,
  onConfirm,
  onCheck,
  onSelect,
  className,
}: GenuiSurfaceProps) {
  const uid = React.useId()
  const open = phase === "ready" && view === "ready"
  const working = phase === "busy"
  const known = status ? (STATUS[status] ?? { label: status, tone: "outline" as const }) : undefined
  const [draft, setDraft] = React.useState<Record<string, unknown>>(() => (pattern.kind === "form" ? { ...pattern.draft } : {}))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const footer = (
    <div className="flex flex-col gap-2">
      {view !== "ready" && view !== "empty" && (
        <p role="status" className="text-xs text-muted-foreground">
          {VIEW[view]}
        </p>
      )}
      {phase === "confirmation" && (
        <div role="alert" className="flex flex-col gap-2 rounded-md border border-warning/50 p-2 text-xs">
          <span>{confirmation ?? "Confirm this to go ahead."}</span>
          <div className="flex justify-end">
            <Button size="sm" variant="destructive" disabled={!canConfirm} onClick={onConfirm}>
              Confirm
            </Button>
          </div>
        </div>
      )}
      {(phase === "unknown" || phase === "pending" || phase === "stale") && (
        <div role="status" className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{message ?? (phase === "pending" ? "The host is working on it." : phase === "stale" ? "This is out of date." : "The result is not known yet.")}</span>
          {onCheck && phase !== "stale" && (
            <Button variant="outline" size="xs" onClick={onCheck}>
              Check status
            </Button>
          )}
        </div>
      )}
      {pattern.kind === "approval" && phase !== "terminal" && (
        <div className="flex flex-wrap justify-end gap-2">
          {pattern.choices.map((c, i) => (
            <Button
              // biome-ignore lint/suspicious/noArrayIndexKey: a surface's choices are fixed and answered by index
              key={i}
              size="sm"
              variant={c.risk === "high" ? "destructive" : i === 0 ? "default" : "outline"}
              disabled={!open}
              onClick={() => onChoose(i)}
            >
              {working && i === 0 && <Spinner />}
              {c.label}
            </Button>
          ))}
        </div>
      )}
      {pattern.kind === "form" && phase !== "terminal" && (
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!open}
            onClick={() => {
              const found = validate?.(draft) ?? {}
              setErrors(found)
              const first = Object.keys(found)[0]
              if (first) document.getElementById(`${uid}-${first}`)?.focus()
              else onChoose(0, draft)
            }}
          >
            {working && <Spinner />}
            {pattern.submitLabel}
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <CardFrame
      data-slot="genui-surface"
      data-pattern={pattern.kind}
      title={pattern.title}
      icon={<SparklesIcon />}
      meta={known ? <Badge variant={known.tone}>{known.label}</Badge> : undefined}
      footer={pattern.kind === "list_detail" && view === "ready" ? undefined : footer}
      className={className}
    >
      {pattern.kind === "approval" && (
        <>
          {pattern.summary && <p className="text-sm whitespace-pre-wrap">{pattern.summary}</p>}
          {pattern.changes.length > 0 && (
            <dl className="flex flex-col gap-1.5 rounded-md border p-2 text-xs">
              {pattern.changes.map((c) => (
                <div key={c.label} className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">{c.label}</dt>
                  <dd className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono">
                    <span className="text-muted-foreground line-through">{c.before}</span>
                    <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
                    <span>{c.after}</span>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
      {pattern.kind === "form" && phase !== "terminal" && (
        <FieldGroup className="gap-3">
          {pattern.fields.map((f) => {
            const id = `${uid}-${f.key}`
            const error = errors[f.key]
            const change = (value: unknown) => {
              setDraft((d) => {
                const next = { ...d }
                if (value === undefined) delete next[f.key]
                else next[f.key] = value
                return next
              })
              if (error) setErrors(({ [f.key]: _, ...rest }) => rest)
            }
            const text = draft[f.key] === undefined ? "" : String(draft[f.key])
            return (
              <Field key={f.key} orientation={f.type === "checkbox" ? "horizontal" : "vertical"} data-invalid={!!error}>
                <FieldLabel htmlFor={id}>
                  {f.label}
                  {f.required && <span className="text-muted-foreground"> (required)</span>}
                </FieldLabel>
                {f.type === "checkbox" ? (
                  <Switch id={id} checked={draft[f.key] === true} disabled={!open} onCheckedChange={(on) => change(on)} />
                ) : f.type === "textarea" ? (
                  <Textarea id={id} rows={3} value={text} disabled={!open} aria-invalid={!!error} maxLength={f.maxLength} onChange={(e) => change(e.target.value === "" ? undefined : e.target.value)} />
                ) : f.type === "integer" ? (
                  <Input
                    id={id}
                    type="number"
                    step={1}
                    min={f.min}
                    max={f.max}
                    value={text}
                    disabled={!open}
                    aria-invalid={!!error}
                    onChange={(e) => change(e.target.value === "" ? undefined : Number(e.target.value))}
                  />
                ) : (
                  <Input id={id} value={text} disabled={!open} aria-invalid={!!error} maxLength={f.maxLength} onChange={(e) => change(e.target.value === "" ? undefined : e.target.value)} />
                )}
                {f.help && f.type !== "checkbox" && <FieldDescription>{f.help}</FieldDescription>}
                {error && <FieldError>{error}</FieldError>}
              </Field>
            )
          })}
        </FieldGroup>
      )}
      {pattern.kind === "list_detail" &&
        (pattern.detail && pattern.selectedId ? (
          <div className="flex flex-col gap-2">
            <Button variant="ghost" size="xs" className="self-start" disabled={!onSelect} onClick={() => onSelect?.("")}>
              <ArrowLeftIcon /> All
            </Button>
            <h4 className="text-sm font-medium">{pattern.detail.title}</h4>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{pattern.detail.body}</p>
          </div>
        ) : pattern.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{VIEW.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {pattern.items.map((item) => (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={cn("h-auto w-full justify-between gap-2 px-2 py-1.5 text-left whitespace-normal")}
                  disabled={!onSelect || working}
                  onClick={() => onSelect?.(item.id)}
                >
                  <span className="flex min-w-0 flex-col">
                    <span>{item.title}</span>
                    {item.summary && <span className="text-xs font-normal text-muted-foreground">{item.summary}</span>}
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        ))}
    </CardFrame>
  )
}

export { GenuiSurface }
export type { GenuiPattern, GenuiPhase, GenuiSurfaceProps }
