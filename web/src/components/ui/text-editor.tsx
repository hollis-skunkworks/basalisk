import * as React from "react"

import { cn } from "cn"

/**
 * A plain writing surface: a textarea with no frame, in the monospace face, that fills
 * the room it is given. For editing a document's source (a note, a draft), where the
 * bordered Textarea of a form would be wrong. Surface's own; not from shadcn.
 *
 * With `markdown`, the keys of a Markdown editor: ⌘B and ⌘I wrap the selection in ** and _
 * (or unwrap it), ⌘K makes it a link with "url" selected to type over, Enter in a list item
 * starts the next one (an empty item ends the list), Tab and ⇧Tab indent and outdent the
 * selected lines. Edits go through the browser's insertText, so ⌘Z still undoes them, and
 * onChange sees them like typing. The element says which chords it keeps
 * (`data-keys-own`), so the page's own shortcuts (⌘K, the palette) give way inside it.
 */

/** Replaces [start, end) with text, then selects [a, b), keeping undo. */
function replace(el: HTMLTextAreaElement, start: number, end: number, text: string, a: number, b: number) {
  el.focus()
  el.setSelectionRange(start, end)
  // insertText is deprecated but is still the only way to edit a textarea with undo kept.
  const ok = document.execCommand?.("insertText", false, text)
  if (!ok) {
    el.setRangeText(text, start, end, "end")
    el.dispatchEvent(new Event("input", { bubbles: true }))
  }
  el.setSelectionRange(a, b)
}

/** Wrap the selection in marks, or unwrap it if it already is. */
function wrap(el: HTMLTextAreaElement, mark: string) {
  const { selectionStart: s, selectionEnd: e, value } = el
  const sel = value.slice(s, e)
  const n = mark.length
  if (value.slice(s - n, s) === mark && value.slice(e, e + n) === mark) {
    replace(el, s - n, e + n, sel, s - n, e - n)
    return
  }
  if (sel.startsWith(mark) && sel.endsWith(mark) && sel.length >= 2 * n) {
    const inner = sel.slice(n, -n)
    replace(el, s, e, inner, s, s + inner.length)
    return
  }
  replace(el, s, e, `${mark}${sel}${mark}`, s + n, s + n + sel.length)
}

/** [selection](url) with "url" selected. */
function link(el: HTMLTextAreaElement) {
  const { selectionStart: s, selectionEnd: e, value } = el
  const text = value.slice(s, e) || "link"
  const at = s + text.length + 3
  replace(el, s, e, `[${text}](url)`, at, at + 3)
}

const LIST = /^(\s*)([-*+]|\d+[.)])(\s+)(\[[ xX]\]\s+)?/

function lineAt(value: string, pos: number) {
  const start = value.lastIndexOf("\n", pos - 1) + 1
  const endIdx = value.indexOf("\n", pos)
  const end = endIdx < 0 ? value.length : endIdx
  return { start, end, text: value.slice(start, end) }
}

/** Enter in a list item: the next item, or the end of the list on an empty one. True if handled. */
function continueList(el: HTMLTextAreaElement): boolean {
  const { selectionStart: s, selectionEnd: e, value } = el
  if (s !== e) return false
  const line = lineAt(value, s)
  const m = LIST.exec(line.text)
  if (!m || s < line.start + m[0].length) return false
  if (line.text.slice(m[0].length).trim() === "" && s === line.end) {
    replace(el, line.start, line.end, "", line.start, line.start)
    return true
  }
  const [, indent, marker, gap, box] = m
  const num = /^\d+/.exec(marker)
  const next = num ? `${Number(num[0]) + 1}${marker.slice(num[0].length)}` : marker
  const insert = `\n${indent}${next}${gap}${box ? "[ ] " : ""}`
  replace(el, s, s, insert, s + insert.length, s + insert.length)
  return true
}

/** Indent or outdent the selected lines by two spaces; in a plain line, Tab inserts two spaces. */
function indent(el: HTMLTextAreaElement, out: boolean) {
  const { selectionStart: s, selectionEnd: e, value } = el
  const first = lineAt(value, s)
  const multi = value.slice(s, e).includes("\n")
  if (!out && !multi && !LIST.test(first.text)) {
    replace(el, s, e, "  ", s + 2, s + 2)
    return
  }
  const last = lineAt(value, Math.max(s, e - (e > s && value[e - 1] === "\n" ? 1 : 0)))
  const block = value.slice(first.start, last.end)
  let removedFirst = 0
  const changed = block.split("\n").map((l, i) => {
    if (!out) return `  ${l}`
    const cut = l.startsWith("  ") ? 2 : l.startsWith(" ") || l.startsWith("\t") ? 1 : 0
    if (i === 0) removedFirst = cut
    return l.slice(cut)
  })
  const text = changed.join("\n")
  const delta = text.length - block.length
  const a = out ? Math.max(first.start, s - removedFirst) : s + 2
  replace(el, first.start, last.end, text, a, Math.max(a, e + delta))
}

/** The Markdown keys; true if the event was one of them. */
function markdownKey(el: HTMLTextAreaElement, e: React.KeyboardEvent<HTMLTextAreaElement>): boolean {
  if (e.nativeEvent.isComposing) return false
  const mod = e.metaKey || e.ctrlKey
  if (mod && !e.altKey && !e.shiftKey) {
    const k = e.key.toLowerCase()
    if (k === "b") wrap(el, "**")
    else if (k === "i") wrap(el, "_")
    else if (k === "k") link(el)
    else return false
    return true
  }
  if (e.key === "Enter" && !mod && !e.altKey && !e.shiftKey) return continueList(el)
  if (e.key === "Tab" && !mod && !e.altKey) {
    indent(el, e.shiftKey)
    return true
  }
  return false
}

function TextEditor({
  className,
  markdown = false,
  onKeyDown,
  ...props
}: React.ComponentProps<"textarea"> & {
  /** The keys of a Markdown editor: ⌘B, ⌘I, ⌘K, list continuation, Tab and ⇧Tab. */
  markdown?: boolean
}) {
  return (
    <textarea
      data-slot="text-editor"
      data-keys-own={markdown ? "cmd+b cmd+i cmd+k ctrl+b ctrl+i ctrl+k" : undefined}
      className={cn(
        "block size-full min-h-0 resize-none border-0 bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (!markdown || e.defaultPrevented) return
        if (markdownKey(e.currentTarget, e)) e.preventDefault()
      }}
      {...props}
    />
  )
}

export { TextEditor }
