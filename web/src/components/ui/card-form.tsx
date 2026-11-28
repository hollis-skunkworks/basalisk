"use client"

import { ClipboardListIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { type AnswerableCardProps, CardBody, CardFoot, CardFrame, CardStatus, useCardDraft, useCardRespond } from "@/components/ui/card-frame"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

/**
 * A few fields to fill in. The fields are given already worked out (which control each
 * one is, what it allows); the card draws them, keeps what is typed, and hands the values
 * to `validate` before it reports them. Surface's own.
 */
interface CardFormField {
  key: string
  /** Which control draws it. "fallback" is a text box for a field the form could not type. */
  kind: "text" | "textarea" | "number" | "integer" | "boolean" | "enum" | "multi" | "date" | "secret" | "fallback"
  title: string
  description?: string
  required?: boolean
  readOnly?: boolean
  options?: readonly (string | number)[]
  default?: unknown
  /** Why this field cannot be honoured. A form with one is not submittable. */
  problem?: string
}

interface CardFormProps extends AnswerableCardProps {
  body?: string
  fields: readonly CardFormField[]
  /** Problems with the form as a whole. Any makes it unsubmittable, and they are shown. */
  issues?: readonly string[]
  /** Values to start from, by field key. A `draft` (the person's own, kept by the host) wins. */
  values?: Record<string, unknown>
  /** Checks the values: an error sentence per field key that is wrong. */
  validate?: (values: Record<string, unknown>) => Record<string, string>
  submitLabel?: string
}

function CardForm({ title, body, fields, issues = [], values: initial, validate, submitLabel = "Submit", allowOther = true, draft, onDraft, className, ...a }: CardFormProps) {
  const { disabled, working, respond } = useCardRespond(a)
  const [values, setValues] = React.useState<Record<string, unknown>>(() => {
    const start: Record<string, unknown> = {}
    for (const f of fields)
      start[f.key] = draft?.[f.key] ?? initial?.[f.key] ?? f.default ?? (f.kind === "boolean" ? false : f.kind === "multi" ? [] : "")
    return start
  })
  useCardDraft(values, onDraft)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const uid = React.useId()
  const set = (key: string, value: unknown) => {
    setValues((v) => ({ ...v, [key]: value }))
    if (errors[key]) setErrors(({ [key]: _, ...rest }) => rest)
  }
  const blocked = issues.length > 0 || fields.some((f) => f.problem)
  const send = () => {
    const found = validate?.(values) ?? {}
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.getElementById(`${uid}-${Object.keys(found)[0]}`)?.focus()
      return
    }
    void respond({ status: "submitted", data: values })
  }
  const open = a.state === "open" || a.state === "pending"
  return (
    <CardFrame
      data-slot="card-form"
      title={title ?? "A few details"}
      icon={<ClipboardListIcon />}
      meta={<CardStatus state={a.state} />}
      className={className}
      footer={
        <CardFoot {...a} allowOther={allowOther} draft={draft} onDraft={onDraft}>
          <Button variant="outline" size="sm" disabled={disabled} onClick={() => void respond({ status: "canceled" })}>
            Cancel
          </Button>
          <Button size="sm" disabled={disabled || blocked} onClick={send}>
            {working && <Spinner />}
            {submitLabel}
          </Button>
        </CardFoot>
      }
    >
      <CardBody>{body}</CardBody>
      {issues.map((i) => (
        <p key={i} role="alert" className="text-xs text-destructive">
          {i}
        </p>
      ))}
      {open && (
        <FieldGroup className="gap-3">
          {fields.map((f) => {
            const id = `${uid}-${f.key}`
            const off = disabled || f.readOnly
            const error = errors[f.key] ?? f.problem
            const text = typeof values[f.key] === "string" || typeof values[f.key] === "number" ? String(values[f.key]) : ""
            const inline = f.kind === "boolean"
            return (
              <Field key={f.key} orientation={inline ? "horizontal" : "vertical"} data-invalid={!!error}>
                <FieldLabel htmlFor={id}>
                  {f.title}
                  {f.required && <span className="text-muted-foreground"> (required)</span>}
                </FieldLabel>
                {f.kind === "boolean" ? (
                  <Switch id={id} checked={values[f.key] === true} disabled={off} onCheckedChange={(on) => set(f.key, on)} />
                ) : f.kind === "enum" ? (
                  <Select value={text} disabled={off} onValueChange={(v) => set(f.key, typeof f.options?.[0] === "number" ? Number(v) : v)}>
                    <SelectTrigger id={id} aria-invalid={!!error}>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options?.map((o) => (
                        <SelectItem key={String(o)} value={String(o)}>
                          {String(o)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.kind === "multi" ? (
                  <div className="flex flex-col gap-1.5">
                    {f.options?.map((o) => {
                      const list = Array.isArray(values[f.key]) ? (values[f.key] as unknown[]) : []
                      return (
                        <label key={String(o)} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={list.includes(o)}
                            disabled={off}
                            onCheckedChange={(on) => set(f.key, on ? [...list, o] : list.filter((x) => x !== o))}
                          />
                          {String(o)}
                        </label>
                      )
                    })}
                  </div>
                ) : f.kind === "textarea" || f.kind === "fallback" ? (
                  <Textarea id={id} rows={3} value={text} disabled={off} aria-invalid={!!error} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <Input
                    id={id}
                    type={f.kind === "number" || f.kind === "integer" ? "number" : f.kind === "date" ? "date" : f.kind === "secret" ? "password" : "text"}
                    autoComplete={f.kind === "secret" ? "off" : undefined}
                    value={text}
                    disabled={off}
                    aria-invalid={!!error}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                {f.description && !inline && <FieldDescription>{f.description}</FieldDescription>}
                {error && <FieldError>{error}</FieldError>}
              </Field>
            )
          })}
        </FieldGroup>
      )}
    </CardFrame>
  )
}

export { CardForm }
export type { CardFormField, CardFormProps }
