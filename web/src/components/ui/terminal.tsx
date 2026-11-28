"use client"

import "@xterm/xterm/css/xterm.css"
import { FitAddon } from "@xterm/addon-fit"
import { WebglAddon } from "@xterm/addon-webgl"
import { type ILinkProvider, type ITheme, Terminal as XTerm } from "@xterm/xterm"
import * as React from "react"

import { cn } from "cn"

import { webLinkProvider } from "./terminal.links"

/**
 * A terminal: xterm.js on a session's socket. Binary frames are raw bytes both ways; text frames
 * are JSON control messages (resize out; state and exit in). It reconnects by itself, and every
 * attach starts with a replay of recent output. Its colours are the theme's palette (the
 * terminal's sixteen are the palette's), read where it is drawn, and it follows a palette change.
 * Surface's own.
 */
interface TerminalProps {
  /** The session's WebSocket URL (ws: or wss:). */
  socketUrl: string
  /** In front: it takes the focus and refits. */
  active?: boolean
  fontSize?: number
  /** The shell ended (code -1: the session is gone). */
  onExit?: (code: number) => void
  /**
   * Link providers for text in the terminal (xterm's ILinkProvider), each made for this
   * terminal: an app's references, say. Web addresses are linked already, whole across soft and
   * hard wraps, and open in a new tab (http and https only). Keep the array
   * stable (a module-level constant): it is read once, when the terminal is made.
   */
  linkProviders?: ((term: XTerm) => ILinkProvider)[]
  className?: string
}

/** A CSS colour (a custom property may be a color-mix) as the browser resolves it, inside el. */
function resolve(el: HTMLElement, name: string, fallback: string): string {
  const probe = document.createElement("span")
  probe.style.color = `var(${name}, ${fallback})`
  probe.style.display = "none"
  el.appendChild(probe)
  const c = getComputedStyle(probe).color
  probe.remove()
  return c || fallback
}

function themeOf(el: HTMLElement): ITheme {
  const c = (n: string, f = "#888888") => resolve(el, n, f)
  const [red, green, yellow, blue, magenta, cyan] = ["--p-red", "--p-green", "--p-yellow", "--p-blue", "--p-magenta", "--p-cyan"].map((n) => c(n))
  return {
    background: c("--p-bg", "#000000"),
    foreground: c("--p-fg", "#ffffff"),
    cursor: c("--p-accent"),
    cursorAccent: c("--p-bg", "#000000"),
    selectionBackground: c("--selection"),
    black: c("--secondary"),
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white: c("--p-fg"),
    brightBlack: c("--muted-foreground"),
    brightRed: red,
    brightGreen: green,
    brightYellow: yellow,
    brightBlue: blue,
    brightMagenta: magenta,
    brightCyan: cyan,
    brightWhite: c("--p-fg"),
  }
}

function Terminal({ socketUrl, active = true, fontSize = 13, onExit, linkProviders, className }: TerminalProps) {
  const host = React.useRef<HTMLDivElement>(null)
  const term = React.useRef<XTerm | null>(null)
  const fit = React.useRef<FitAddon | null>(null)
  const exitRef = React.useRef(onExit)
  exitRef.current = onExit

  // biome-ignore lint/correctness/useExhaustiveDependencies: one terminal per socket; font size is applied below
  React.useEffect(() => {
    const el = host.current
    if (!el) return
    const font = getComputedStyle(el).getPropertyValue("--type-mono").trim() || "ui-monospace, Menlo, monospace"
    const t = new XTerm({
      cursorBlink: true,
      cursorStyle: "bar",
      fontFamily: font,
      fontSize,
      lineHeight: 1.15,
      scrollback: 20000,
      allowProposedApi: true,
      macOptionClickForcesSelection: true,
      theme: themeOf(el),
    })
    const f = new FitAddon()
    t.loadAddon(f)
    // Web links first: a program's hard-wrapped URL is linked whole (terminal.links.ts).
    const providers = [webLinkProvider(t), ...(linkProviders ?? []).map((make) => make(t))].map((p) => t.registerLinkProvider(p))
    t.open(el)
    try {
      const gl = new WebglAddon()
      gl.onContextLoss(() => gl.dispose())
      t.loadAddon(gl)
    } catch {
      // No WebGL: the DOM renderer draws it.
    }
    term.current = t
    fit.current = f

    let ws: WebSocket | null = null
    let closed = false
    let exited = false
    let retry = 0
    // Consecutive sockets that closed before the session said it was open: refused (another
    // origin, no such module) rather than dropped. After a few, it stops trying.
    let refused = 0
    let timer = 0
    const encoder = new TextEncoder()
    const send = (data: string | Uint8Array) => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(data)
    }
    const sendSize = () => send(JSON.stringify({ type: "resize", cols: t.cols, rows: t.rows }))
    const refit = () => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) {
        try {
          f.fit()
        } catch {
          // Not ready yet; the next resize refits.
        }
      }
    }
    const connect = () => {
      if (closed || exited) return
      ws = new WebSocket(socketUrl)
      ws.binaryType = "arraybuffer"
      let fresh = true
      let opened = false
      ws.onopen = () => {
        opened = true
        refit()
        sendSize()
      }
      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") {
          if (fresh) {
            t.reset() // what comes first is the replay: from a clean screen
            fresh = false
          }
          t.write(new Uint8Array(ev.data as ArrayBuffer))
          return
        }
        try {
          const msg = JSON.parse(ev.data) as { type: string; code?: number }
          if (msg.type === "state") {
            fresh = false
            retry = 0
            refused = 0
          }
          if (msg.type === "exit") {
            exited = true
            exitRef.current?.(msg.code ?? 0)
          }
        } catch {
          // Not a control message this knows.
        }
      }
      ws.onclose = (ev) => {
        if (ev.code === 1008 && !exited) {
          // The server no longer has this session.
          exited = true
          exitRef.current?.(-1)
          return
        }
        if (closed || exited) return
        if (!opened || fresh) refused += 1
        if (refused >= 5) {
          exited = true
          exitRef.current?.(-1)
          return
        }
        retry = Math.min(retry + 1, 6)
        timer = window.setTimeout(connect, 250 * 2 ** (retry - 1))
      }
    }
    connect()

    const onData = t.onData((d) => send(encoder.encode(d)))
    const onBinary = t.onBinary((d) => send(Uint8Array.from(d, (c) => c.charCodeAt(0))))
    const onResize = t.onResize(sendSize)
    const sized = new ResizeObserver(() => refit())
    sized.observe(el)
    // The palette changes on the page's root (applyPalette): follow it.
    const recolor = new MutationObserver(() => {
      t.options.theme = themeOf(el)
    })
    recolor.observe(document.documentElement, { attributes: true, attributeFilter: ["data-palette", "style", "class", "data-type"] })

    return () => {
      closed = true
      window.clearTimeout(timer)
      sized.disconnect()
      recolor.disconnect()
      onData.dispose()
      for (const p of providers) p.dispose()
      onBinary.dispose()
      onResize.dispose()
      ws?.close()
      t.dispose()
      term.current = null
      fit.current = null
    }
  }, [socketUrl])

  React.useEffect(() => {
    const t = term.current
    if (!t) return
    t.options.fontSize = fontSize
    try {
      fit.current?.fit()
    } catch {
      // Not ready.
    }
  }, [fontSize])

  React.useEffect(() => {
    if (!active) return
    const id = window.setTimeout(() => {
      try {
        fit.current?.fit()
      } catch {
        // Not ready.
      }
      term.current?.focus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [active])

  return (
    <div
      data-slot="terminal"
      className={cn("size-full min-h-0 overflow-hidden bg-[var(--p-bg)] p-2", className)}
    >
      <div ref={host} className="size-full" />
    </div>
  )
}

export { Terminal }
export type { TerminalProps }
