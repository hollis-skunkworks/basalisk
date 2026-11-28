/**
 * Web links in a terminal: http(s) addresses, linked whole however they wrap. xterm's soft wrap
 * (a line that ran past the edge) and a program's hard wrap (real newlines at the edge, as
 * CLIs print long login URLs) are both joined: a line that fills to its last column with URL
 * characters continues on the next line when that one starts with URL characters. Clicking
 * opens only http and https, in a new tab, with no opener and no referrer.
 */
import type { IBufferCell, ILink, ILinkProvider } from "@xterm/xterm"

/** What a link provider needs of a terminal's buffer (xterm's, or a test's). */
export interface LinkBuffer {
  cols: number
  /** The line at a 0-based buffer index, or undefined past the ends. */
  line(y: number): LinkLine | undefined
}

export interface LinkLine {
  isWrapped: boolean
  getCell(x: number): Pick<IBufferCell, "getChars" | "getWidth"> | undefined
}

/** One line as text, with the column of each character. */
interface Row {
  text: string
  col: number[]
  wrapped: boolean
  /** The last column holds a URL character: the line may continue on the next one. */
  full: boolean
}

const URL_CHAR = /[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]/
const WEB = /https?:\/\/[^\s"'<>`]+/g
/** How far a link is followed up and down. */
const MAX_ROWS = 40

function rowOf(line: LinkLine, cols: number): Row {
  let text = ""
  const col: number[] = []
  let last = ""
  for (let x = 0; x < cols; x++) {
    const cell = line.getCell(x)
    if (!cell || cell.getWidth() === 0) continue // the right half of a wide character
    const chars = cell.getChars() || " "
    text += chars
    for (let i = 0; i < chars.length; i++) col.push(x)
    if (x === cols - 1) last = chars
  }
  // Trailing blanks are kept: across a soft wrap they separate words, and a URL stops at them.
  return { text, col, wrapped: line.isWrapped, full: URL_CHAR.test(last) }
}

/** Whether line y continues line y-1 as one run of text. */
function continues(prev: Row, cur: Row): boolean {
  if (cur.wrapped) return true
  return prev.full && prev.text.length > 0 && URL_CHAR.test(prev.text[prev.text.length - 1]) && URL_CHAR.test(cur.text[0] ?? " ")
}

/** Trailing punctuation that closes a sentence, not the URL; a ")" only when unbalanced. */
function trimEnd(url: string): string {
  let u = url
  for (;;) {
    const c = u[u.length - 1]
    if (".,;:!?'\"]}".includes(c)) u = u.slice(0, -1)
    else if (c === ")" && (u.match(/\(/g)?.length ?? 0) < (u.match(/\)/g)?.length ?? 0)) u = u.slice(0, -1)
    else return u
  }
}

/** Whether a string is an http(s) URL a browser can open. */
export function isWebURL(s: string): boolean {
  try {
    const u = new URL(s)
    return (u.protocol === "http:" || u.protocol === "https:") && u.host !== ""
  } catch {
    return false
  }
}

export interface WebLink {
  url: string
  /** 1-based, inclusive, as xterm's IBufferRange. */
  range: { start: { x: number; y: number }; end: { x: number; y: number } }
}

/** The web links on buffer line y (1-based), followed across soft and hard wraps. */
export function webLinksAt(buf: LinkBuffer, y: number): WebLink[] {
  const at = y - 1
  const rows = new Map<number, Row>()
  const row = (i: number) => {
    let r = rows.get(i)
    if (r === undefined) {
      const l = buf.line(i)
      if (!l) return undefined
      r = rowOf(l, buf.cols)
      rows.set(i, r)
    }
    return r
  }
  const here = row(at)
  if (!here) return []
  let top = at
  while (at - top < MAX_ROWS) {
    const prev = row(top - 1)
    const cur = row(top) as Row
    if (!prev || !continues(prev, cur)) break
    top--
  }
  let bottom = at
  while (bottom - at < MAX_ROWS) {
    const next = row(bottom + 1)
    if (!next || !continues(row(bottom) as Row, next)) break
    bottom++
  }
  // The run as one string, with each character's line and column.
  let text = ""
  const pos: { y: number; x: number }[] = []
  for (let i = top; i <= bottom; i++) {
    const r = row(i) as Row
    text += r.text
    for (let j = 0; j < r.text.length; j++) pos.push({ y: i, x: r.col[j] })
  }
  const out: WebLink[] = []
  for (const m of text.matchAll(WEB)) {
    const url = trimEnd(m[0])
    if (!isWebURL(url)) continue
    const start = pos[m.index]
    const end = pos[m.index + url.length - 1]
    if (start.y > at || end.y < at) continue // not on this line
    out.push({ url, range: { start: { x: start.x + 1, y: start.y + 1 }, end: { x: end.x + 1, y: end.y + 1 } } })
  }
  return out
}

/** Open a web link: http(s) only, in a new tab, with no opener and no referrer. */
export function openWebLink(url: string, open: (url: string, target: string, features: string) => unknown = window.open.bind(window)): boolean {
  if (!isWebURL(url)) return false
  open(url, "_blank", "noopener,noreferrer")
  return true
}

/** xterm link provider over a terminal's active buffer. */
export function webLinkProvider(term: {
  cols: number
  buffer: { active: { getLine(y: number): LinkLine | undefined } }
}): ILinkProvider {
  return {
    provideLinks(y, callback) {
      const buf: LinkBuffer = { cols: term.cols, line: (i) => term.buffer.active.getLine(i) }
      const links: ILink[] = webLinksAt(buf, y).map((l) => ({
        range: l.range,
        text: l.url,
        activate: (_e, text) => {
          openWebLink(text)
        },
      }))
      callback(links.length ? links : undefined)
    },
  }
}
