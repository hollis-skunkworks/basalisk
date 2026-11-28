import { PuzzleIcon } from "lucide-react"

import { CardFrame } from "@/components/ui/card-frame"

/**
 * What is drawn for a card this app has no renderer for, or whose renderer threw: it says
 * so, and shows what the card holds, instead of drawing nothing. Surface's own.
 */
interface CardMissProps {
  kind: string
  version?: string
  /** Why there is no card: the kind is unknown, the version is, or drawing it failed. */
  reason: "unknown-kind" | "version-skew" | "failed"
  title?: string
  /** The card's content, shown as it came. */
  payload?: unknown
  detail?: string
  className?: string
}

const WHY = {
  "unknown-kind": "This app has no way to draw this kind of card.",
  "version-skew": "This card is a version this app does not draw.",
  failed: "This card could not be drawn.",
}

function CardMiss({ kind, version, reason, title, payload, detail, className }: CardMissProps) {
  return (
    <CardFrame
      data-slot="card-miss"
      title={title ?? kind}
      icon={<PuzzleIcon />}
      tone="warning"
      meta={<span className="font-mono text-xs text-muted-foreground">{version ? `${kind}@${version}` : kind}</span>}
      className={className}
    >
      <p className="text-sm text-muted-foreground">
        {WHY[reason]}
        {detail ? ` ${detail}` : ""}
      </p>
      {payload !== undefined && (
        <pre className="max-h-40 overflow-auto rounded-md bg-muted p-2 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
          {typeof payload === "string" ? payload : JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </CardFrame>
  )
}

export { CardMiss }
export type { CardMissProps }
