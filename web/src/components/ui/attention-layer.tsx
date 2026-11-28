import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"

/**
 * Who is pointing at what, drawn over the whole window: rings, a spotlight that dims around
 * what it shows, arrows, and a note. After ADE's attention layer. It only draws: the caller
 * finds where things are (viewport pixels) and passes them in, again whenever they move. It
 * takes no input, so it never covers a control; the one exception is a note's dismiss button.
 */
type Rect = { x: number; y: number; w: number; h: number }

type AttentionMark = {
  /** Stable across redraws. */
  id: string
  actor: "agent" | "user"
  style: "highlight" | "spotlight" | "arrow" | "select"
  rects: Rect[]
  /** For an arrow: where it starts. */
  from?: Rect | null
  /** A few words shown beside the first rect. */
  note?: string
  /** Who the note is from: "Agent", "You". */
  by?: string
}

const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** Where an arrow from a to b meets b's edge, so its head is not buried in what it points at. */
function edge(a: { x: number; y: number }, r: Rect) {
  const b = mid(r)
  const dx = a.x - b.x
  const dy = a.y - b.y
  if (!dx && !dy) return b
  const sx = dx ? r.w / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY
  const sy = dy ? r.h / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY
  const s = Math.min(sx, sy, 1)
  return { x: b.x + dx * s, y: b.y + dy * s }
}

function AttentionLayer({
  marks,
  area,
  onDismiss,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  marks: AttentionMark[]
  /** What a spotlight dims (the window's content area); the whole viewport when absent. */
  area?: Rect | null
  /** Given: a note can be closed (the one control the layer has). */
  onDismiss?: (id: string) => void
}) {
  const id = React.useId()
  const [size, setSize] = React.useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  React.useEffect(() => {
    const on = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])
  const shown = marks.filter((m) => m.rects.length)
  if (!shown.length) return null
  const { w, h } = size
  const spot = shown.find((m) => m.style === "spotlight")
  const dim = area ?? { x: 0, y: 0, w, h }
  return (
    <div
      data-slot="attention-layer"
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 z-50", className)}
      {...props}
    >
      <svg className="absolute inset-0" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="presentation">
        <defs>
          <marker id={`${id}-head`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-info" />
          </marker>
          {spot && (
            <mask id={`${id}-spot`}>
              <rect x={dim.x} y={dim.y} width={dim.w} height={dim.h} fill="white" />
              {spot.rects.map((r, i) => (
                <rect key={i} x={r.x - 6} y={r.y - 6} width={r.w + 12} height={r.h + 12} rx="8" fill="black" />
              ))}
            </mask>
          )}
        </defs>
        {spot && (
          <rect
            className="fill-background/75 transition-opacity"
            x={dim.x}
            y={dim.y}
            width={dim.w}
            height={dim.h}
            mask={`url(#${id}-spot)`}
          />
        )}
        {shown.flatMap((m) =>
          m.style === "arrow" && m.from
            ? m.rects.map((r, i) => {
                const a = mid(m.from as Rect)
                const b = edge(a, r)
                return (
                  <line
                    key={`${m.id}:${i}`}
                    className="stroke-info"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    markerEnd={`url(#${id}-head)`}
                  />
                )
              })
            : []
        )}
      </svg>
      {shown.flatMap((m) =>
        m.rects.map((r, i) => (
          <div
            key={`${m.id}:${i}`}
            data-actor={m.actor}
            data-style={m.style}
            className={cn(
              "absolute rounded-md ring-2 ring-offset-2 ring-offset-background transition-all duration-200",
              m.actor === "agent" ? "ring-info" : "ring-primary",
              m.style === "highlight" && "bg-info/10 motion-safe:animate-pulse",
              m.style === "select" && "bg-primary/5"
            )}
            style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
          />
        ))
      )}
      {shown
        .filter((m) => m.note)
        .map((m) => {
          const r = m.rects[0] as Rect
          const below = r.y + r.h + 56 < h
          return (
            <div
              key={`${m.id}:note`}
              className="pointer-events-auto absolute flex max-w-72 items-start gap-1 rounded-md bg-popover py-2 pr-1 pl-3 text-xs text-popover-foreground shadow-md ring-1 ring-info"
              style={{
                left: Math.max(8, Math.min(w - 296, r.x)),
                top: below ? r.y + r.h + 10 : Math.max(8, r.y - 48),
              }}
            >
              <p className="min-w-0 flex-1 py-0.5">
                {m.by && <span className="mr-1 font-semibold text-info">{m.by}</span>}
                {m.note}
              </p>
              {onDismiss && (
                <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => onDismiss(m.id)}>
                  <XIcon />
                </Button>
              )}
            </div>
          )
        })}
    </div>
  )
}

export { AttentionLayer, type AttentionMark, type Rect }
