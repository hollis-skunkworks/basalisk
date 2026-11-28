import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import ReactMarkdown, { type Components, type Options } from "react-markdown"
import rehypeHighlight, { type Options as HighlightOptions } from "rehype-highlight"
import remarkGfm from "remark-gfm"
import bash from "highlight.js/lib/languages/bash"
import css from "highlight.js/lib/languages/css"
import diff from "highlight.js/lib/languages/diff"
import go from "highlight.js/lib/languages/go"
import ini from "highlight.js/lib/languages/ini"
import javascript from "highlight.js/lib/languages/javascript"
import json from "highlight.js/lib/languages/json"
import markdownLang from "highlight.js/lib/languages/markdown"
import php from "highlight.js/lib/languages/php"
import python from "highlight.js/lib/languages/python"
import rust from "highlight.js/lib/languages/rust"
import sql from "highlight.js/lib/languages/sql"
import typescript from "highlight.js/lib/languages/typescript"
import xml from "highlight.js/lib/languages/xml"
import yaml from "highlight.js/lib/languages/yaml"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import "./markdown.css"

/**
 * Markdown, set in the theme: the one renderer for text in a Surface app, from a chat answer to
 * a note. Surface's own, after the pattern of AI Elements' Response: the text is cut into blocks
 * and each block is drawn once, so while a message streams only its last block is parsed again.
 * With `streaming`, a last block that is half written (an open `code` span, an open **bold**) is
 * closed for drawing, and its code is coloured once the block is finished.
 *
 * What it draws: GitHub-flavoured Markdown (tables, task lists, ~~strikethrough~~, autolinks),
 * fenced code coloured by highlight.js (go, ts/js, bash, python, rust, sql, json, yaml, css,
 * html, diff, ini/toml, php, markdown) with a copy button, ids on headings (GitHub's slugs,
 * so `#anchor` links scroll inside the text) and, with `images`, images. `size="document"` is
 * the larger setting for a page of text (a note, an article); the default suits chat and cards.
 *
 * Text is data: raw HTML in the source is shown as text, never rendered, and react-markdown's
 * URL check stays on (no `javascript:` links).
 *
 * Extending it, without editing this file:
 *
 * - `remarkPlugins` and `rehypePlugins` (each a unified `PluggableList`) run after the defaults
 *   (remark-gfm; rehype-highlight).
 * - `components` (`Partial<Components>`, react-markdown's map of tag to component) is merged over
 *   the defaults, so an `a` of your own replaces the default link and nothing else.
 * - `MarkdownExtensions` is a React context with the same three fields. Provide it once and every
 *   Markdown below it uses them: `<MarkdownExtensions value={{ rehypePlugins: [cite], components:
 *   { a: CiteLink } }}>`. Order: the defaults, then the nearest provider's, then the props'.
 *
 * Every plugin list and component map should keep its identity between renders (a module-level
 * constant or a `useMemo`): a new one each render draws every block again.
 */

type PluggableList = NonNullable<Options["remarkPlugins"]>

/** What a page can add to every Markdown below it, and what one Markdown can add by props. */
interface MarkdownExtensionsValue {
  /** Remark plugins, run after the defaults (remark-gfm). */
  remarkPlugins?: PluggableList
  /** Rehype plugins, run after the defaults (rehype-highlight). */
  rehypePlugins?: PluggableList
  /** Components by tag, merged over the defaults. */
  components?: Partial<Components>
}

/** Plugins and components for every Markdown below the provider; the nearest provider wins. */
const MarkdownExtensions = React.createContext<MarkdownExtensionsValue>({})
MarkdownExtensions.displayName = "MarkdownExtensions"

/** A heading in the drawn text: its id (the anchor), its level and its text. */
interface MarkdownHeading {
  id: string
  level: number
  text: string
}

const highlight: HighlightOptions = {
  detect: false,
  languages: { bash, css, diff, go, ini, javascript, json, markdown: markdownLang, php, python, rust, sql, typescript, xml, yaml },
  aliases: { bash: ["console", "shell", "shellsession"], ini: ["toml"], xml: ["html", "svg"], typescript: ["tsx"], javascript: ["jsx"] },
}
const defaultRemark: PluggableList = [remarkGfm]
const defaultRehype: PluggableList = [[rehypeHighlight, highlight]]

/** The text of a hast node, for the language of a code block. */
type HastNode = { type: string; tagName?: string; properties?: Record<string, unknown>; children?: HastNode[] }
function codeLanguage(pre: HastNode | undefined): string {
  const code = pre?.children?.find((c) => c.type === "element" && c.tagName === "code")
  const cls = code?.properties?.className
  const list = Array.isArray(cls) ? cls.map(String) : typeof cls === "string" ? cls.split(" ") : []
  return list.find((c) => c.startsWith("language-"))?.slice("language-".length) ?? ""
}

function CopyButton({ text }: { text: () => string }) {
  const [done, setDone] = React.useState(false)
  React.useEffect(() => {
    if (!done) return
    const t = window.setTimeout(() => setDone(false), 1400)
    return () => window.clearTimeout(t)
  }, [done])
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={done ? "Copied" : "Copy the code"}
      title={done ? "Copied" : "Copy"}
      onClick={() => {
        void navigator.clipboard?.writeText(text()).then(() => setDone(true), () => {})
      }}
    >
      {done ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}

function CodeBlock({ node, className, ...p }: React.ComponentProps<"pre"> & { node?: unknown }) {
  const ref = React.useRef<HTMLPreElement>(null)
  const lang = codeLanguage(node as HastNode | undefined)
  return (
    <div data-slot="markdown-code" className="group/code relative my-2.5 overflow-hidden rounded-md border border-border/90 bg-desk/75 first:mt-0 last:mb-0">
      <div className="flex items-center justify-between border-b border-border/60 bg-card/70 px-2.5 py-1">
        <span className="font-mono text-[10.5px] font-medium tracking-wider text-chart-2 uppercase">
          {lang || "code"}
        </span>
        <CopyButton text={() => ref.current?.textContent ?? ""} />
      </div>
      <pre
        ref={ref}
        className={cn(
          "overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground",
          className,
        )}
        {...p}
      />
    </div>
  )
}

/* Sizes: the default (chat, cards) and, inside data-size="document", a page of text. */
const defaults: Components = {
  h1: ({ node: _n, className, ...p }) => (
    <h1 className={cn("mt-4 mb-2 border-b border-primary/25 pb-1 text-base font-semibold tracking-tight text-primary first:mt-0 group-data-[size=document]/md:mb-3 group-data-[size=document]/md:text-2xl", className)} {...p} />
  ),
  h2: ({ node: _n, className, ...p }) => (
    <h2 className={cn("mt-4 mb-1.5 flex items-center gap-2 border-b border-border/70 pb-1 text-sm font-semibold text-foreground first:mt-0 group-data-[size=document]/md:text-xl", className)} {...p} />
  ),
  h3: ({ node: _n, className, ...p }) => (
    <h3 className={cn("mt-3.5 mb-1 text-sm font-semibold text-chart-2 first:mt-0 group-data-[size=document]/md:text-lg", className)} {...p} />
  ),
  h4: ({ node: _n, className, ...p }) => (
    <h4 className={cn("mt-3 mb-1 font-mono text-xs font-semibold tracking-wider text-primary/90 uppercase first:mt-0 group-data-[size=document]/md:text-sm", className)} {...p} />
  ),
  h5: ({ node: _n, className, ...p }) => <h5 className={cn("mt-2.5 mb-1 text-xs font-semibold text-foreground first:mt-0", className)} {...p} />,
  h6: ({ node: _n, className, ...p }) => (
    <h6 className={cn("mt-2.5 mb-1 font-mono text-xs font-semibold text-muted-foreground uppercase first:mt-0", className)} {...p} />
  ),
  p: ({ node: _n, className, ...p }) => (
    <p className={cn("my-2 leading-relaxed text-foreground/95 first:mt-0 last:mb-0 group-data-[size=document]/md:my-3 group-data-[size=document]/md:leading-7", className)} {...p} />
  ),
  strong: ({ node: _n, className, ...p }) => (
    <strong className={cn("font-semibold text-foreground", className)} {...p} />
  ),
  em: ({ node: _n, className, ...p }) => (
    <em className={cn("text-chart-2/90 italic", className)} {...p} />
  ),
  ul: ({ node: _n, className, ...p }) => <ul className={cn("my-2 list-disc pl-5 first:mt-0 last:mb-0", className)} {...p} />,
  ol: ({ node: _n, className, ...p }) => <ol className={cn("my-2 list-decimal pl-5 first:mt-0 last:mb-0", className)} {...p} />,
  li: ({ node: _n, className, ...p }) => <li className={cn("my-0.5 leading-relaxed marker:font-mono marker:text-primary", className)} {...p} />,
  // The link's look is in markdown.css, so an `a` of a caller's own keeps it.
  a: ({ node: _n, href, ...p }) => (
    <a
      href={href}
      {...(href?.startsWith("#") ? {} : { target: "_blank", rel: "noreferrer noopener" })}
      {...p}
    />
  ),
  blockquote: ({ node: _n, className, ...p }) => (
    <blockquote className={cn("my-2.5 rounded-r-sm border-l-2 border-primary bg-accent/25 py-1.5 pr-3 pl-3 text-foreground/90 first:mt-0 last:mb-0", className)} {...p} />
  ),
  pre: CodeBlock,
  code: ({ node: _n, className, ...p }) => (
    <code
      className={cn(
        "rounded-sm border border-border/70 bg-muted/90 px-1.5 py-0.5 font-mono text-[0.84em] text-chart-2 in-[pre]:rounded-none in-[pre]:border-0 in-[pre]:bg-transparent in-[pre]:p-0 in-[pre]:text-xs in-[pre]:text-foreground",
        className,
      )}
      {...p}
    />
  ),
  table: ({ node: _n, className, ...p }) => (
    <div className="my-2.5 overflow-x-auto rounded-md border border-border first:mt-0 last:mb-0">
      <table className={cn("w-full border-collapse text-xs group-data-[size=document]/md:text-sm", className)} {...p} />
    </div>
  ),
  thead: ({ node: _n, className, ...p }) => <thead className={cn("border-b border-border bg-muted/80", className)} {...p} />,
  th: ({ node: _n, className, ...p }) => (
    <th className={cn("px-2.5 py-1.5 text-left font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase [&[align=center]]:text-center [&[align=right]]:text-right", className)} {...p} />
  ),
  td: ({ node: _n, className, ...p }) => (
    <td className={cn("border-t border-border/60 px-2.5 py-1.5 align-top [&[align=center]]:text-center [&[align=right]]:text-right", className)} {...p} />
  ),
  hr: ({ node: _n, className, ...p }) => <hr className={cn("my-3.5 border-border/80", className)} {...p} />,
  del: ({ node: _n, className, ...p }) => <del className={cn("text-muted-foreground", className)} {...p} />,
  // An image is a link to it, not a request for it: a remote image loads from its sender's
  // server the moment the text is shown (a read receipt, the reader's address). images opts in.
  img: ({ node: _n, src, alt }) => (
    <a className="text-primary underline underline-offset-2" href={typeof src === "string" ? src : undefined} target="_blank" rel="noreferrer noopener">
      image: {alt || "untitled"}
    </a>
  ),
}

/** With images: drawn, for text whose images are known to be safe to fetch. */
const withImages: Components = {
  ...defaults,
  img: ({ node: _n, className, alt, ...p }) => <img className={cn("my-2 inline-block max-w-full rounded-md", className)} alt={alt ?? ""} loading="lazy" {...p} />,
}

const fenceRe = /^\s*(```|~~~)/

/** Cut Markdown into top-level blocks at blank lines, never inside a fence or a list item's continuation. */
function splitBlocks(markdown: string): string[] {
  const blocks: string[] = []
  let current: string[] = []
  let fence = ""
  let gap = false
  for (const line of markdown.split("\n")) {
    const f = fenceRe.exec(line)
    if (!fence && line.trim() === "") {
      gap = current.length > 0
      if (gap) current.push(line)
      continue
    }
    if (!fence && gap && !/^[ \t]/.test(line)) {
      while (current.length && current[current.length - 1].trim() === "") current.pop()
      blocks.push(current.join("\n"))
      current = []
    }
    gap = false
    if (f) fence = fence ? (f[1] === fence ? "" : fence) : f[1]
    current.push(line)
  }
  while (current.length && current[current.length - 1].trim() === "") current.pop()
  if (current.length) blocks.push(current.join("\n"))
  return blocks
}

/** Close what a half-written block leaves open, so it draws as it will once finished. */
function closeOpen(block: string): string {
  if (fenceRe.test(block)) return block
  let out = block
  if ((out.match(/`/g)?.length ?? 0) % 2) out += "`"
  if ((out.match(/\*\*/g)?.length ?? 0) % 2) out += "**"
  return out
}

/** GitHub's heading slug: lower case, punctuation dropped, spaces to dashes, repeats numbered. */
function slug(text: string, seen: Map<string, number>): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, "")
      .replace(/\s/g, "-") || "section"
  const n = seen.get(base) ?? 0
  seen.set(base, n + 1)
  return n ? `${base}-${n}` : base
}

interface Render {
  remarkPlugins: PluggableList
  rehypePlugins: PluggableList
  plainRehype: PluggableList
  components: Components
}

const Block = React.memo(function Block({ text, render, colour }: { text: string; render: Render; colour: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={render.remarkPlugins}
      rehypePlugins={colour ? render.rehypePlugins : render.plainRehype}
      components={render.components}
    >
      {text}
    </ReactMarkdown>
  )
})

function Markdown({
  children,
  streaming = false,
  images = false,
  size = "default",
  remarkPlugins,
  rehypePlugins,
  components,
  onHeadings,
  className,
  onClick,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> &
  MarkdownExtensionsValue & {
    children: string
    /** The text is still arriving: close a half-written last block, and colour its code once it is done. */
    streaming?: boolean
    /** Draw images (fetching them). Off: each image is a link, so showing text never fetches. */
    images?: boolean
    /** "document" for a page of text (larger headings, looser lines); the default suits chat and cards. */
    size?: "default" | "document"
    /** Called with the headings (id, level, text) after they change; for an outline. */
    onHeadings?: (headings: MarkdownHeading[]) => void
  }) {
  const ext = React.useContext(MarkdownExtensions)
  const render = React.useMemo<Render>(() => {
    const tail = [...(ext.rehypePlugins ?? []), ...(rehypePlugins ?? [])]
    return {
      remarkPlugins: [...defaultRemark, ...(ext.remarkPlugins ?? []), ...(remarkPlugins ?? [])],
      rehypePlugins: [...defaultRehype, ...tail],
      plainRehype: tail,
      components: { ...(images ? withImages : defaults), ...ext.components, ...components },
    }
  }, [ext, remarkPlugins, rehypePlugins, components, images])
  const blocks = React.useMemo(() => splitBlocks(children), [children])

  // Ids on the headings, set on the drawn page (React does not own the attribute), numbered
  // across blocks so a repeated heading gets "-1" as on GitHub.
  const root = React.useRef<HTMLDivElement>(null)
  const lastHeadings = React.useRef("")
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs whenever the drawn blocks change
  React.useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const seen = new Map<string, number>()
    const list = [...el.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")].map((h) => {
      const text = h.textContent ?? ""
      const id = slug(text, seen)
      if (h.id !== id) h.id = id
      return { id, level: Number(h.tagName[1]), text }
    })
    if (onHeadings) {
      const key = JSON.stringify(list)
      if (key !== lastHeadings.current) {
        lastHeadings.current = key
        onHeadings(list)
      }
    }
  }, [blocks, render, onHeadings])

  return (
    <div
      ref={root}
      data-slot="markdown"
      data-size={size}
      className={cn(
        "group/md min-w-0 text-sm break-words data-[size=document]:text-[0.9375rem] data-[size=document]:leading-7",
        className,
      )}
      onClick={(e) => {
        onClick?.(e)
        // An #anchor scrolls to its heading inside this text instead of changing the page's address.
        const a = (e.target as Element).closest?.("a[href^='#']")
        if (e.defaultPrevented || !a || !root.current?.contains(a)) return
        let id = a.getAttribute("href")?.slice(1) ?? ""
        try {
          id = decodeURIComponent(id)
        } catch {
          // As written.
        }
        const to = root.current.querySelector(`[id="${CSS.escape(id)}"]`)
        if (to) {
          e.preventDefault()
          to.scrollIntoView({ block: "start", behavior: "smooth" })
        }
      }}
      {...props}
    >
      {blocks.map((b, i) => {
        const last = i === blocks.length - 1
        return <Block key={i} render={render} colour={!(streaming && last)} text={streaming && last ? closeOpen(b) : b} />
      })}
    </div>
  )
}

export { Markdown, MarkdownExtensions, type MarkdownExtensionsValue, type MarkdownHeading }
