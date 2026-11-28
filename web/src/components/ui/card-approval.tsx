"use client"

import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  Columns2Icon,
  GitCompareArrowsIcon,
  InfoIcon,
  NetworkIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldIcon,
  XCircleIcon,
} from "lucide-react"
import * as React from "react"

import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  type AnswerableCardProps,
  CardBody,
  CardFoot,
  CardFrame,
  CardStatus,
  useCardRespond,
} from "@/components/ui/card-frame"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

/**
 * A request to approve something consequential: what will change, how risky it is, who
 * asked, plus visual comparison of Current State (Now) vs Proposed State (After) across
 * settings, configs, or architecture graphs, with highlighted changes and callouts for
 * concerns, warnings, security, or informational notes.
 */
interface CardApprovalChange {
  id?: string
  label: string
  path?: string
  op?: "added" | "removed" | "modified"
  before?: string
  after?: string
  impact?: string
}

interface CardApprovalCallout {
  id?: string
  tone?: "concern" | "warning" | "info" | "security"
  title: string
  detail?: string
  target?: string
}

interface CardApprovalArchNode {
  id: string
  label: string
  kind?: string
  subtitle?: string
  status?: "unchanged" | "added" | "modified" | "removed"
}

interface CardApprovalArchEdge {
  from: string
  to: string
  label?: string
  status?: "unchanged" | "added" | "modified" | "removed"
}

interface CardApprovalArchitectureSnapshot {
  nodes: CardApprovalArchNode[]
  edges?: CardApprovalArchEdge[]
}

/** What was decided, for the receipt of an answered card. */
type CardApprovalDecision = "approved" | "declined" | { approved: number; of: number }

interface CardApprovalProps extends AnswerableCardProps {
  summary?: string
  risk?: string
  changes?: CardApprovalChange[]
  callouts?: CardApprovalCallout[]
  viewMode?: "diff" | "side-by-side" | "settings" | "config" | "architecture"
  beforeSnapshot?: Record<string, unknown> | CardApprovalArchitectureSnapshot | string
  afterSnapshot?: Record<string, unknown> | CardApprovalArchitectureSnapshot | string
  requestedBy?: string
  /** A phrase a high-risk approval asks the person to type at the confirm step. */
  phrase?: string
  /** Each change is approved or declined on its own (only with two or more changes). */
  perChange?: boolean
  /** What was decided; drawn as the receipt once the card is answered. */
  decision?: CardApprovalDecision
  approveLabel?: string
  rejectLabel?: string
}

type Level = "low" | "medium" | "high"

const RISK: Record<
  Level,
  {
    label: string
    icon: typeof ShieldIcon
    iconClass: string
    badge: string
    edge: string
    tone: "default" | "warning" | "danger"
  }
> = {
  low: {
    label: "Low risk",
    icon: ShieldCheckIcon,
    iconClass: "text-muted-foreground",
    badge: "border-border text-muted-foreground",
    edge: "before:bg-border",
    tone: "default",
  },
  medium: {
    label: "Medium risk",
    icon: ShieldIcon,
    iconClass: "text-warning",
    badge: "border-warning/40 bg-warning/10 text-warning",
    edge: "before:bg-warning",
    tone: "warning",
  },
  high: {
    label: "High risk",
    icon: ShieldAlertIcon,
    iconClass: "text-destructive",
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
    edge: "before:bg-destructive",
    tone: "danger",
  },
}

const CALLOUT_STYLE: Record<
  NonNullable<CardApprovalCallout["tone"]>,
  {
    icon: typeof InfoIcon
    border: string
    bg: string
    titleColor: string
    badge: string
    label: string
  }
> = {
  concern: {
    icon: ShieldAlertIcon,
    border: "border-destructive/45",
    bg: "bg-destructive/10",
    titleColor: "text-destructive",
    badge: "border-destructive/40 bg-destructive/15 text-destructive",
    label: "CONCERN",
  },
  security: {
    icon: ShieldAlertIcon,
    border: "border-destructive/50",
    bg: "bg-destructive/10",
    titleColor: "text-destructive",
    badge: "border-destructive/40 bg-destructive/15 text-destructive",
    label: "SECURITY",
  },
  warning: {
    icon: AlertTriangleIcon,
    border: "border-warning/45",
    bg: "bg-warning/10",
    titleColor: "text-warning",
    badge: "border-warning/40 bg-warning/15 text-warning",
    label: "WARNING",
  },
  info: {
    icon: InfoIcon,
    border: "border-primary/40",
    bg: "bg-primary/10",
    titleColor: "text-primary",
    badge: "border-primary/40 bg-primary/15 text-primary",
    label: "INFO",
  },
}

function inferOp(c: CardApprovalChange): "added" | "removed" | "modified" {
  if (c.op) return c.op
  if (c.before === undefined && c.after !== undefined) return "added"
  if (c.before !== undefined && c.after === undefined) return "removed"
  return "modified"
}

function isArchSnapshot(v: unknown): v is CardApprovalArchitectureSnapshot {
  return Boolean(v && typeof v === "object" && Array.isArray((v as CardApprovalArchitectureSnapshot).nodes))
}

/** A value is short when it fits on a line beside its label. */
const isShort = (v?: string) => v === undefined || (v.length <= 64 && !v.includes("\n"))

function ChangeShort({ change }: { change: CardApprovalChange }) {
  return (
    <dd className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-xs">
      {change.before !== undefined && (
        <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-muted-foreground line-through decoration-destructive/60">
          {change.before}
        </span>
      )}
      {change.before !== undefined && change.after !== undefined && (
        <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" />
      )}
      {change.after !== undefined && (
        <span className="rounded border border-success/30 bg-success/10 px-1.5 py-0.5 text-foreground">
          {change.after}
        </span>
      )}
    </dd>
  )
}

/** A long value: before and after stacked as blocks, clipped until opened. */
function ChangeLong({ change }: { change: CardApprovalChange }) {
  const [open, setOpen] = React.useState(false)
  const block = "max-w-full whitespace-pre-wrap break-words rounded-sm border-l-2 px-2 py-1 font-mono text-xs"
  return (
    <dd className="flex min-w-0 flex-col gap-1">
      <div
        className={cn(
          "flex flex-col gap-1",
          !open && "max-h-28 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]",
        )}
      >
        {change.before !== undefined && (
          <div className={cn(block, "border-destructive/50 bg-destructive/5 text-muted-foreground")}>
            <span className="sr-only">Before: </span>
            {change.before}
          </div>
        )}
        {change.after !== undefined && (
          <div className={cn(block, "border-success/60 bg-success/5 text-foreground")}>
            <span className="sr-only">After: </span>
            {change.after}
          </div>
        )}
      </div>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => setOpen(!open)}
        className="h-5 gap-1 self-start px-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ChevronDownIcon className={cn("size-3 transition-transform", open && "rotate-180")} />
        {open ? "Show less" : "Show all"}
      </Button>
    </dd>
  )
}

/** Side-by-Side (NOW vs AFTER) visual comparison of changes & snapshots. */
function SideBySideComparison({
  changes,
  beforeSnapshot,
  afterSnapshot,
}: {
  changes: CardApprovalChange[]
  beforeSnapshot?: Record<string, unknown> | CardApprovalArchitectureSnapshot | string
  afterSnapshot?: Record<string, unknown> | CardApprovalArchitectureSnapshot | string
}) {
  // Synthesize rows from changes or object snapshots
  const rows = React.useMemo(() => {
    if (changes.length > 0) {
      return changes.map((c, idx) => ({
        slot: c.id ?? `${c.label}-${idx}`,
        label: c.path || c.label,
        before: c.before,
        after: c.after,
        op: inferOp(c),
        impact: c.impact,
      }))
    }
    const bObj =
      beforeSnapshot && typeof beforeSnapshot === "object" && !isArchSnapshot(beforeSnapshot) ? beforeSnapshot : {}
    const aObj =
      afterSnapshot && typeof afterSnapshot === "object" && !isArchSnapshot(afterSnapshot) ? afterSnapshot : {}
    const keys = [...new Set([...Object.keys(bObj), ...Object.keys(aObj)])]
    return keys.map((k) => {
      const bv = bObj[k] !== undefined ? (typeof bObj[k] === "string" ? bObj[k] : JSON.stringify(bObj[k])) : undefined
      const av = aObj[k] !== undefined ? (typeof aObj[k] === "string" ? aObj[k] : JSON.stringify(aObj[k])) : undefined
      const op: "added" | "removed" | "modified" =
        bv === undefined ? "added" : av === undefined ? "removed" : "modified"
      return { slot: k, label: k, before: bv, after: av, op, impact: undefined }
    })
  }, [changes, beforeSnapshot, afterSnapshot])

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {/* Left: NOW (Current State) */}
      <div className="flex min-w-0 flex-col overflow-hidden rounded-md border border-border/80 bg-muted/20">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-2.5 py-1.5">
          <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Now · Current State
          </span>
          <Badge variant="outline" className="h-4 px-1.5 font-mono text-[9px] text-muted-foreground">
            baseline
          </Badge>
        </div>
        <div className="flex flex-col divide-y divide-border/50 p-2 font-mono text-xs">
          {rows.map((r) => (
            <div key={`now-${r.slot}`} className="flex flex-col gap-0.5 py-1.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] text-muted-foreground">{r.label}</span>
                {r.op === "removed" && (
                  <Badge
                    variant="outline"
                    className="h-4 border-destructive/40 bg-destructive/10 px-1 font-mono text-[9px] text-destructive"
                  >
                    removed
                  </Badge>
                )}
              </div>
              {r.before !== undefined ? (
                <div
                  className={cn(
                    "break-words whitespace-pre-wrap rounded px-1.5 py-0.5 text-xs",
                    r.op === "removed" || r.op === "modified"
                      ? "border-l-2 border-destructive/60 bg-destructive/10 text-muted-foreground line-through decoration-destructive/50"
                      : "text-foreground",
                  )}
                >
                  {r.before}
                </div>
              ) : (
                <span className="text-[11px] italic text-muted-foreground/60">(not set)</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: AFTER (Proposed State) */}
      <div className="flex min-w-0 flex-col overflow-hidden rounded-md border border-primary/40 bg-primary/5">
        <div className="flex items-center justify-between border-b border-primary/30 bg-primary/10 px-2.5 py-1.5">
          <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
            After · Proposed Change
          </span>
          <Badge variant="outline" className="h-4 border-primary/40 bg-primary/15 px-1.5 font-mono text-[9px] text-primary">
            proposed
          </Badge>
        </div>
        <div className="flex flex-col divide-y divide-border/50 p-2 font-mono text-xs">
          {rows.map((r) => (
            <div key={`after-${r.slot}`} className="flex flex-col gap-0.5 py-1.5 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11px] text-foreground">{r.label}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-4 px-1 font-mono text-[9px]",
                    r.op === "added"
                      ? "border-success/40 bg-success/15 text-success"
                      : r.op === "removed"
                        ? "border-destructive/40 bg-destructive/15 text-destructive"
                        : "border-primary/40 bg-primary/15 text-primary",
                  )}
                >
                  {r.op}
                </Badge>
              </div>
              {r.after !== undefined ? (
                <div className="break-words whitespace-pre-wrap rounded border-l-2 border-success/70 bg-success/10 px-1.5 py-0.5 text-xs font-medium text-foreground">
                  {r.after}
                </div>
              ) : (
                <span className="text-[11px] italic text-destructive/80">(deleted)</span>
              )}
              {r.impact && <span className="mt-0.5 font-sans text-[10.5px] text-warning">↳ Impact: {r.impact}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Visual Architecture Topology Diff (when beforeSnapshot / afterSnapshot represent architecture graphs). */
function ArchitectureDiffComparison({
  beforeArch,
  afterArch,
}: {
  beforeArch?: CardApprovalArchitectureSnapshot
  afterArch?: CardApprovalArchitectureSnapshot
}) {
  const beforeNodes = beforeArch?.nodes ?? []
  const afterNodes = afterArch?.nodes ?? []
  const beforeIds = new Set(beforeNodes.map((n) => n.id))
  const afterIds = new Set(afterNodes.map((n) => n.id))

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-md border border-border/80 bg-muted/20 p-2.5">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Current Architecture ({beforeNodes.length} nodes)
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {beforeNodes.map((n) => {
            const removed = !afterIds.has(n.id) || n.status === "removed"
            return (
              <div
                key={`b-node-${n.id}`}
                className={cn(
                  "flex items-center justify-between rounded border px-2.5 py-1.5 text-xs",
                  removed
                    ? "border-dashed border-destructive/50 bg-destructive/10 text-muted-foreground line-through"
                    : "border-border/70 bg-card/60 text-foreground",
                )}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{n.label}</span>
                  {n.subtitle && <span className="truncate font-mono text-[10px] text-muted-foreground">{n.subtitle}</span>}
                </div>
                <Badge variant="outline" className="font-mono text-[9px]">
                  {removed ? "removing" : (n.kind ?? "node")}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-primary/40 bg-primary/5 p-2.5">
        <div className="flex items-center justify-between border-b border-primary/30 pb-1.5">
          <span className="font-mono text-[10px] font-bold tracking-wider text-primary uppercase">
            Proposed Architecture ({afterNodes.length} nodes)
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {afterNodes.map((n) => {
            const added = !beforeIds.has(n.id) || n.status === "added"
            const modified = n.status === "modified"
            return (
              <div
                key={`a-node-${n.id}`}
                className={cn(
                  "flex items-center justify-between rounded border px-2.5 py-1.5 text-xs",
                  added
                    ? "border-success/50 bg-success/10 text-foreground"
                    : modified
                      ? "border-warning/50 bg-warning/10 text-foreground"
                      : "border-border/70 bg-card/60 text-foreground",
                )}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{n.label}</span>
                  {n.subtitle && <span className="truncate font-mono text-[10px] text-muted-foreground">{n.subtitle}</span>}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-[9px]",
                    added
                      ? "border-success/40 bg-success/15 text-success"
                      : modified
                        ? "border-warning/40 bg-warning/15 text-warning"
                        : "",
                  )}
                >
                  {added ? "+ added" : modified ? "~ modified" : (n.kind ?? "node")}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** The receipt of an answered approval: approved, declined, or some of several. */
function DecisionReceipt({ decision }: { decision: CardApprovalDecision }) {
  if (typeof decision === "object") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        <CheckCircle2Icon className="size-3.5 text-success" />
        Approved {decision.approved} of {decision.of}
      </span>
    )
  }
  return decision === "approved" ? (
    <span className="inline-flex items-center gap-1 font-medium text-success">
      <CheckCircle2Icon className="size-3.5" />
      Approved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-medium text-destructive">
      <XCircleIcon className="size-3.5" />
      Declined
    </span>
  )
}

function CardApproval({
  title,
  summary,
  risk = "low",
  changes = [],
  callouts = [],
  viewMode,
  beforeSnapshot,
  afterSnapshot,
  requestedBy,
  phrase,
  perChange = false,
  decision,
  approveLabel = "Approve",
  rejectLabel = "Decline",
  allowOther = true,
  className,
  receipt,
  ...a
}: CardApprovalProps) {
  const { disabled, working, respond } = useCardRespond(a)
  const level: Level = risk === "low" || risk === "medium" ? risk : "high"
  const r = RISK[level]
  const split = perChange && changes.length > 1
  const [included, setIncluded] = React.useState<boolean[]>(() => changes.map(() => true))
  const count = included.filter(Boolean).length
  const [confirming, setConfirming] = React.useState(false)
  const [typed, setTyped] = React.useState("")

  const hasArchSnapshots = isArchSnapshot(beforeSnapshot) || isArchSnapshot(afterSnapshot) || viewMode === "architecture"
  const hasSnapshotsOrMulti = Boolean(beforeSnapshot || afterSnapshot || viewMode || changes.length > 0)
  const [activeTab, setActiveTab] = React.useState<"diff" | "side-by-side" | "architecture">(() => {
    if (hasArchSnapshots) return "architecture"
    if (viewMode === "side-by-side" || viewMode === "settings" || viewMode === "config" || beforeSnapshot || afterSnapshot)
      return "side-by-side"
    return "diff"
  })

  const open = a.state === "open" || a.state === "pending"
  const typedOk = !phrase || typed.trim().toLowerCase() === phrase.toLowerCase()

  const decide = (action: "approve" | "reject") => {
    if (!split || action === "reject") {
      void respond({ status: "submitted", decisions: [{ itemId: "approval", action }] })
      return
    }
    void respond({
      status: "submitted",
      decisions: changes.map((c, i) => ({
        itemId: `change:${i}`,
        action: included[i] ? "approve" : "reject",
        note: c.label,
      })),
    })
  }
  const approveText = split && count < changes.length ? `${approveLabel} ${count} of ${changes.length}` : approveLabel

  return (
    <CardFrame
      data-slot="card-approval"
      data-risk={level}
      title={title ?? "Approval needed"}
      icon={<r.icon className={r.iconClass} />}
      tone={open ? r.tone : "default"}
      meta={
        <>
          <Badge variant="outline" className={cn("gap-1", r.badge)}>
            {r.label}
          </Badge>
          <CardStatus state={a.state} />
        </>
      }
      className={cn(
        "relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-1",
        open ? r.edge : "before:bg-transparent",
        !open && "opacity-80",
        className,
      )}
      footer={
        <CardFoot {...a} allowOther={allowOther} receipt={decision ? <DecisionReceipt decision={decision} /> : receipt}>
          {confirming ? (
            <div
              className="flex w-full flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2"
              role="alertdialog"
              aria-label="Confirm a high-risk approval"
            >
              <p className="text-xs text-foreground">
                <span className="font-medium text-destructive">High risk.</span> This cannot be taken back from here.
                Approve {split ? `${count} of ${changes.length} changes` : "it"}?
              </p>
              {phrase && (
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <span>
                    Type <span className="font-mono text-foreground">{phrase}</span> to confirm.
                  </span>
                  <Input
                    value={typed}
                    disabled={disabled}
                    autoComplete="off"
                    onChange={(e) => setTyped(e.target.value)}
                  />
                </label>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" disabled={disabled} onClick={() => setConfirming(false)}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={disabled || !typedOk || count === 0}
                  onClick={() => decide("approve")}
                >
                  {working && <Spinner />}
                  Confirm approval
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button variant="outline" size="sm" disabled={disabled} onClick={() => decide("reject")}>
                {rejectLabel}
              </Button>
              <Button
                variant={level === "high" ? "destructive" : "default"}
                size="sm"
                disabled={disabled || count === 0}
                onClick={() => (level === "high" ? setConfirming(true) : decide("approve"))}
              >
                {working && <Spinner />}
                {level === "high" ? `${approveText}…` : approveText}
              </Button>
            </>
          )}
        </CardFoot>
      }
    >
      {summary && <CardBody className="text-foreground">{summary}</CardBody>}

      {/* Highlighted Callouts for Concerns, Warnings, Security, and Info */}
      {callouts.length > 0 && (
        <div className="flex flex-col gap-1.5" data-slot="card-approval-callouts">
          {callouts.map((co, idx) => {
            const toneKey = co.tone ?? "info"
            const st = CALLOUT_STYLE[toneKey] ?? CALLOUT_STYLE.info
            const IconComp = st.icon
            return (
              <div
                key={co.id ?? `${co.title}-${idx}`}
                className={cn("flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs", st.border, st.bg)}
              >
                <IconComp className={cn("mt-0.5 size-3.5 shrink-0", st.titleColor)} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={cn("h-4 px-1 font-mono text-[9px]", st.badge)}>
                      {st.label}
                    </Badge>
                    <span className={cn("font-semibold", st.titleColor)}>{co.title}</span>
                    {co.target && (
                      <Badge variant="outline" className="ml-auto h-4 px-1.5 font-mono text-[9px] text-muted-foreground">
                        {co.target}
                      </Badge>
                    )}
                  </div>
                  {co.detail && <p className="text-foreground/90 leading-relaxed">{co.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* View Mode Switcher when snapshots or changes exist */}
      {hasSnapshotsOrMulti && (changes.length > 0 || beforeSnapshot || afterSnapshot) && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Change Comparison ({changes.length || "snapshot"})
            </span>
            <div className="flex items-center gap-1 rounded-sm border border-border/70 bg-muted/30 p-0.5">
              <Button
                size="xs"
                variant={activeTab === "diff" ? "secondary" : "ghost"}
                className="h-5 gap-1 px-1.5 font-mono text-[10px]"
                onClick={() => setActiveTab("diff")}
              >
                <GitCompareArrowsIcon className="size-3" />
                Diff
              </Button>
              <Button
                size="xs"
                variant={activeTab === "side-by-side" ? "secondary" : "ghost"}
                className="h-5 gap-1 px-1.5 font-mono text-[10px]"
                onClick={() => setActiveTab("side-by-side")}
              >
                <Columns2Icon className="size-3" />
                Now vs After
              </Button>
              {hasArchSnapshots && (
                <Button
                  size="xs"
                  variant={activeTab === "architecture" ? "secondary" : "ghost"}
                  className="h-5 gap-1 px-1.5 font-mono text-[10px]"
                  onClick={() => setActiveTab("architecture")}
                >
                  <NetworkIcon className="size-3" />
                  Topology
                </Button>
              )}
            </div>
          </div>

          {activeTab === "architecture" && hasArchSnapshots ? (
            <ArchitectureDiffComparison
              beforeArch={isArchSnapshot(beforeSnapshot) ? beforeSnapshot : undefined}
              afterArch={isArchSnapshot(afterSnapshot) ? afterSnapshot : undefined}
            />
          ) : activeTab === "side-by-side" ? (
            <SideBySideComparison
              changes={changes}
              beforeSnapshot={beforeSnapshot}
              afterSnapshot={afterSnapshot}
            />
          ) : changes.length > 0 ? (
            <dl className="flex flex-col divide-y rounded-md border text-xs">
              {changes.map((c, i) => {
                const op = inferOp(c)
                return (
                  <div
                    key={c.id ?? `${c.label}-${i}`}
                    className={cn("flex flex-col gap-1 px-2.5 py-2", split && !included[i] && "opacity-50")}
                  >
                    <dt className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 px-1 font-mono text-[9px]",
                            op === "added"
                              ? "border-success/40 bg-success/10 text-success"
                              : op === "removed"
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : "border-primary/40 bg-primary/10 text-primary",
                          )}
                        >
                          {op}
                        </Badge>
                        <span className="font-medium text-foreground">{c.label}</span>
                        {c.path && <span className="font-mono text-[10.5px] text-muted-foreground">({c.path})</span>}
                      </div>
                      {split && open && (
                        <label className="flex items-center gap-1.5 text-xs">
                          <input
                            type="checkbox"
                            className="size-3.5 accent-primary"
                            checked={included[i]}
                            disabled={disabled || confirming}
                            onChange={(e) => setIncluded(included.map((v, j) => (j === i ? e.target.checked : v)))}
                          />
                          {included[i] ? "Approve" : "Decline"}
                        </label>
                      )}
                    </dt>
                    {isShort(c.before) && isShort(c.after) ? <ChangeShort change={c} /> : <ChangeLong change={c} />}
                    {c.impact && <p className="text-[11px] text-warning">↳ Impact: {c.impact}</p>}
                  </div>
                )
              })}
            </dl>
          ) : (
            <SideBySideComparison
              changes={changes}
              beforeSnapshot={beforeSnapshot}
              afterSnapshot={afterSnapshot}
            />
          )}
        </div>
      )}

      {requestedBy && <p className="text-xs text-muted-foreground">Asked by {requestedBy}</p>}
    </CardFrame>
  )
}

export { CardApproval }
export type {
  CardApprovalArchEdge,
  CardApprovalArchitectureSnapshot,
  CardApprovalArchNode,
  CardApprovalCallout,
  CardApprovalChange,
  CardApprovalDecision,
  CardApprovalProps,
}
