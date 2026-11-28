import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/**
 * A reference inline in text: an icon and a short label, set like a word in the sentence.
 * What it says and what happens on hover or click are the caller's (Surface's page core,
 * web/src/cite); the chip only draws the state it is given. Pass it as a hover card's trigger.
 */
const citeChipVariants = cva(
  "mx-px inline-flex max-w-full translate-y-[-0.5px] cursor-pointer items-center gap-1 rounded-sm border border-border bg-accent px-1.5 py-0 align-baseline font-mono text-[0.86em] leading-[1.5] font-normal whitespace-nowrap text-foreground transition-colors outline-none hover:border-primary focus-visible:border-primary [&>svg]:size-3 [&>svg]:shrink-0 [&>svg]:text-primary data-[kind=path]:bg-transparent data-[kind=path]:text-foreground/85 data-[kind=url]:border-transparent data-[kind=url]:bg-transparent data-[kind=url]:p-0 data-[kind=url]:font-sans data-[kind=url]:whitespace-normal data-[kind=url]:break-all data-[kind=url]:text-primary data-[kind=url]:hover:underline data-[kind=url]:[&>svg]:hidden",
  {
    variants: {
      state: {
        idle: "border-border bg-accent text-foreground hover:border-primary",
        loading: "border-border bg-accent/60 text-muted-foreground hover:border-primary",
        found: "border-border bg-accent text-foreground hover:border-primary",
        "not-found": "border-dashed border-border bg-transparent text-muted-foreground line-through decoration-muted-foreground/60 hover:border-muted-foreground",
        error: "border-destructive/40 bg-destructive/10 text-foreground hover:border-destructive",
        unsupported: "border-border bg-transparent text-foreground/85 hover:border-primary",
      },
      mono: {
        true: "font-mono text-[0.86em]",
        false: "font-mono text-[0.86em]",
      },
    },
    defaultVariants: { state: "idle", mono: true },
  }
)

type CiteChipState = NonNullable<VariantProps<typeof citeChipVariants>["state"]>

function CiteChip({
  className,
  state = "idle",
  mono = false,
  icon,
  label,
  ...props
}: Omit<React.ComponentProps<"button">, "children"> &
  VariantProps<typeof citeChipVariants> & {
    /** A lucide icon element, drawn small before the label. */
    icon?: React.ReactNode
    label: string
  }) {
  return (
    <button
      type="button"
      data-slot="cite-chip"
      data-state={state}
      className={cn(citeChipVariants({ state, mono }), className)}
      {...props}
    >
      {icon}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}

export { CiteChip, citeChipVariants, type CiteChipState }
