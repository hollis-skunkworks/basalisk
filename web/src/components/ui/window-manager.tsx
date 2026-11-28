"use client"

import "flexlayout-react/style/light.css"
import "./window-manager.css"

import {
  type Action,
  Actions,
  type IJsonModel,
  type IJsonRowNode,
  type IJsonTabSetNode,
  Layout,
  Model,
  type TabNode,
  TabSetNode,
} from "flexlayout-react"
import { ArrowDownLeftIcon, Maximize2Icon, Minimize2Icon, PictureInPicture2Icon, XIcon } from "lucide-react"
import * as React from "react"

import { cn } from "cn"
import { Button } from "@/components/ui/button"

/**
 * A desk of windows: tiled side by side and one above another, tabbed together in a
 * stack, or floating over the rest. The owner drags a window by its tab to move, split,
 * tab or float it, and drags the gaps to resize. Surface's own; the dragging and docking
 * are flexlayout-react's.
 *
 * The arrangement is a plain tree the caller owns (`tree`). The component draws it and
 * reports the tree back through `onArrange` when the owner changes it; a new `tree`
 * coming down is applied without disturbing what is inside the windows. So the tree can
 * live on a server, be saved and restored, and be changed by something other than the
 * pointer.
 */

/** A row of nodes or a stack of windows. The root row runs left to right; a row inside a
 * row turns the other way. */
interface WindowNode {
  type: "row" | "stack"
  /** Names a stack. */
  id?: string
  /** The node's share of its row, relative to its siblings. */
  weight?: number
  children?: WindowNode[]
  /** A stack's windows, in tab order, and the index of the one showing. */
  wins?: string[]
  selected?: number
  /** The stack covers the rest of the tiling. */
  maximized?: boolean
}

/** Windows floating over the tiling, with a small tree of their own. */
interface WindowFloat {
  id: string
  rect: { x: number; y: number; w: number; h: number }
  root: WindowNode
}

/** The whole arrangement. Floats are in stacking order: the last is in front. */
interface WindowTree {
  root: WindowNode
  floats?: WindowFloat[]
}

interface WindowInfo {
  id: string
  title: string
  icon?: React.ReactNode
  /** Holds unsaved work: shown as a dot before the title. */
  dirty?: boolean
  /** Drawn after the title: a small mark (who opened it, that it waits). */
  badge?: React.ReactNode
  /** Buttons for this window, drawn before its close button. */
  actions?: React.ReactNode
}

interface WindowManagerProps {
  tree: WindowTree
  windows: WindowInfo[]
  /** The window that has the focus. */
  focus?: string
  /** The owner rearranged the desk or moved the focus. While the promise it returns is
   * pending, a `tree` coming down is held back, so an answer to an older change never
   * undoes a newer one. */
  onArrange: (tree: WindowTree, focus: string | undefined, grabbed?: string) => void | Promise<unknown>
  /** The owner asked to close a window. The window stays until `tree` drops it. */
  onClose: (id: string) => void
  /** Draws a window's body. */
  children: (id: string) => React.ReactNode
  /** Shown where the tiling is when no window is tiled. */
  empty?: React.ReactNode
  className?: string
}

const GLOBAL: IJsonModel["global"] = {
  tabEnableClose: false,
  tabEnableRename: false,
  tabEnablePopout: false,
  tabEnableFloat: true,
  tabEnableFloatIcon: false,
  tabSetEnableMaximize: false,
  tabSetEnableSingleTabStretch: true,
  tabSetEnableActiveIcon: false,
  tabSetMinWidth: 220,
  tabSetMinHeight: 120,
}

type FlexNode = IJsonRowNode | IJsonTabSetNode
const isTabset = (n: FlexNode): n is IJsonTabSetNode => n.type === "tabset"

function toFlexNode(n: WindowNode, titles: Map<string, string>, focus: string | undefined): FlexNode {
  if (n.type === "stack") {
    const wins = n.wins ?? []
    return {
      type: "tabset",
      id: n.id,
      weight: n.weight || 100,
      selected: Math.min(n.selected ?? 0, Math.max(0, wins.length - 1)),
      ...(n.maximized ? { maximized: true } : {}),
      ...(focus && wins.includes(focus) ? { active: true } : {}),
      children: wins.map((id) => ({ type: "tab", id, name: titles.get(id) ?? id, component: "window" })),
    }
  }
  return {
    type: "row",
    weight: n.weight || 100,
    children: (n.children ?? []).map((c) => toFlexNode(c, titles, focus)),
  }
}

function toFlex(tree: WindowTree, windows: WindowInfo[], focus: string | undefined): IJsonModel {
  const titles = new Map(windows.map((w) => [w.id, w.title]))
  const subLayouts: NonNullable<IJsonModel["subLayouts"]> = {}
  for (const f of tree.floats ?? []) {
    subLayouts[f.id] = {
      type: "float",
      rect: { x: f.rect.x, y: f.rect.y, width: f.rect.w, height: f.rect.h },
      // A float holds a row; a bare stack is wrapped in one.
      layout: toFlexNode(f.root.type === "row" ? f.root : { type: "row", children: [f.root] }, titles, focus) as IJsonRowNode,
    }
  }
  return { global: GLOBAL, layout: toFlexNode(tree.root, titles, focus) as IJsonRowNode, subLayouts }
}

function fromFlexNode(n: FlexNode): WindowNode | null {
  if (isTabset(n)) {
    const wins = (n.children ?? []).flatMap((t) => (t.type === "tab" && t.id ? [t.id] : []))
    if (wins.length === 0) return null
    return {
      type: "stack",
      id: n.id,
      weight: n.weight ?? 100,
      wins,
      selected: Math.min(Math.max(n.selected ?? 0, 0), wins.length - 1),
      ...(n.maximized ? { maximized: true } : {}),
    }
  }
  const children = (n.children ?? []).flatMap((c) => {
    const out = fromFlexNode(c as FlexNode)
    return out ? [out] : []
  })
  if (children.length === 0) return null
  return { type: "row", weight: n.weight ?? 100, children }
}

function fromFlex(json: IJsonModel): WindowTree {
  const root = fromFlexNode(json.layout) ?? { type: "row" as const }
  const floats: WindowFloat[] = []
  for (const [id, sub] of Object.entries(json.subLayouts ?? {})) {
    const r = fromFlexNode(sub.layout)
    if (!r || sub.type !== "float") continue
    const rect = sub.rect ?? { x: 40, y: 40, width: 640, height: 480 }
    floats.push({
      id,
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      root: r,
    })
  }
  // The root is a row whatever is in it; its own weight means nothing.
  const { weight: _, ...rest } = root.type === "row" ? root : { type: "row" as const, children: [root] }
  return floats.length ? { root: rest, floats } : { root: rest }
}

/**
 * An arrangement written the one way it can be compared: as flexlayout itself would keep
 * it. Loading a tree tidies it (a row left with one child folds into its parent), so the
 * tree that comes down and the model on screen are both read back from a model.
 */
const signature = (json: IJsonModel, windows: WindowInfo[], focus: string | undefined) =>
  JSON.stringify(toFlex(fromFlex(json), windows, focus))

/** Where a window sits in a tree. */
function locate(tree: WindowTree, id: string): { stack: WindowNode; float?: WindowFloat } | undefined {
  const find = (n: WindowNode): WindowNode | undefined => {
    if (n.type === "stack") return n.wins?.includes(id) ? n : undefined
    for (const c of n.children ?? []) {
      const hit = find(c)
      if (hit) return hit
    }
    return undefined
  }
  const stack = find(tree.root)
  if (stack) return { stack }
  for (const float of tree.floats ?? []) {
    const hit = find(float.root)
    if (hit) return { stack: hit, float }
  }
  return undefined
}

/** Remove a window from a node tree, pruning empty stacks and rows. */
function removeWinFromNode(n: WindowNode, id: string): WindowNode | null {
  if (n.type === "stack") {
    const wins = (n.wins ?? []).filter((w) => w !== id)
    if (wins.length === 0) return null
    return {
      ...n,
      wins,
      selected: Math.min(n.selected ?? 0, wins.length - 1),
    }
  }
  const children = (n.children ?? []).flatMap((c) => {
    const kept = removeWinFromNode(c, id)
    return kept ? [kept] : []
  })
  if (children.length === 0) return null
  return { ...n, children }
}

/** Toggle a window between floating (popped out) and tiled (popped back in). */
function toggleWindowFloat(current: WindowTree, id: string): WindowTree {
  const where = locate(current, id)
  if (!where) return current
  const strippedRoot = removeWinFromNode(current.root, id) ?? { type: "row" as const }
  const root: WindowNode = strippedRoot.type === "row" ? strippedRoot : { type: "row", children: [strippedRoot] }
  const floats: WindowFloat[] = []
  for (const f of current.floats ?? []) {
    const kept = removeWinFromNode(f.root, id)
    if (kept) {
      floats.push({
        ...f,
        root: kept.type === "row" ? kept : { type: "row", children: [kept] },
      })
    }
  }
  if (where.float) {
    // Pop back into the tiled root layout.
    const stack: WindowNode = { type: "stack", id: `stack-${id}`, weight: 45, wins: [id], selected: 0 }
    const nextChildren = [...(root.children ?? []), stack]
    const nextRoot: WindowNode = { type: "row", children: nextChildren }
    return floats.length > 0 ? { root: nextRoot, floats } : { root: nextRoot }
  }
  // Pop out into a new floating window.
  const n = floats.length
  const newFloat: WindowFloat = {
    id: `float-${id}-${n}`,
    rect: { x: 56 + (n % 6) * 28, y: 40 + (n % 6) * 24, w: 680, h: 460 },
    root: { type: "row", children: [{ type: "stack", id: `stack-${id}`, wins: [id], selected: 0 }] },
  }
  return { root, floats: [...floats, newFloat] }
}

function WindowManager({ tree, windows, focus, onArrange, onClose, children, empty, className }: WindowManagerProps) {
  const info = React.useMemo(() => new Map(windows.map((w) => [w.id, w])), [windows])
  const [, redraw] = React.useReducer((n: number) => n + 1, 0)
  // What the owner is in the middle of: a drag (pointer down) or a change not yet
  // answered. A tree coming down waits for both, so it never lands under the pointer.
  const held = React.useRef({ pointer: false, pending: 0 })
  // A change made while the pointer is down (a float being dragged reports every step) is
  // reported once, when the pointer lifts.
  const unsent = React.useRef<{ model: Model; moved: string | undefined; grabbed: string | undefined } | null>(null)
  const live = React.useRef({ focus, onArrange, onClose, windows })
  live.current = { focus, onArrange, onClose, windows }

  const modelRef = React.useRef<Model | null>(null)
  if (modelRef.current === null) modelRef.current = Model.fromJson(toFlex(tree, windows, focus))
  const want = React.useMemo(
    () => signature(Model.fromJson(toFlex(tree, windows, focus)).toJson(), windows, focus),
    [tree, windows, focus],
  )
  if (!held.current.pointer && held.current.pending === 0) {
    const current = modelRef.current
    if (signature(current.toJson(), windows, focusOf(current, focus)) !== want) {
      // The previous model is handed over so windows present in both keep their bodies.
      modelRef.current = Model.fromJson(toFlex(tree, windows, focus), current)
    }
  }
  const model = modelRef.current

  const report = React.useCallback(
    (m: Model, moved: string | undefined, grabbed: string | undefined) => {
      const next = fromFlex(m.toJson())
      const nextFocus = moved && locate(next, moved) ? moved : focusOf(m, live.current.focus)
      const answer = live.current.onArrange(next, nextFocus, grabbed && locate(next, grabbed) ? grabbed : undefined)
      if (answer && typeof (answer as Promise<unknown>).then === "function") {
        held.current.pending++
        void (answer as Promise<unknown>)
          .catch(() => {})
          .finally(() => {
            held.current.pending--
            redraw()
          })
      }
    },
    [],
  )

  const onAction = React.useCallback((action: Action): Action | undefined => {
    if (action.type === Actions.DELETE_TAB) {
      live.current.onClose(action.data.node as string)
      return undefined
    }
    return action
  }, [])

  const onModelChange = React.useCallback(
    (m: Model, action: Action) => {
      const d = action.data as Record<string, unknown>
      // The window the owner just touched takes the focus.
      let moved: string | undefined
      if (action.type === Actions.SELECT_TAB) moved = d.tabNode as string
      else if (action.type === Actions.MOVE_NODE) moved = d.fromNode as string
      else if (action.type === Actions.POPOUT_TAB) moved = (d.node ?? d.nodeId) as string // flexlayout names it node
      else if (action.type === Actions.SET_ACTIVE_TABSET || action.type === Actions.MAXIMIZE_TOGGLE) {
        const node = m.getNodeById((d.tabsetNode ?? d.node) as string)
        if (node instanceof TabSetNode) moved = node.getSelectedNode()?.getId()
      }
      else if (action.type === Actions.MOVE_FLOAT || action.type === Actions.MOVE_FLOAT_TO_FRONT) {
        // A float picked up by its header: the window showing in it.
        const float = fromFlex(m.toJson()).floats?.find((f) => f.id === d.layoutId)
        const first = (n: WindowNode | undefined): string | undefined =>
          n?.type === "stack" ? n.wins?.[n.selected ?? 0] : n?.children?.map(first).find(Boolean)
        moved = first(float?.root)
      }
      if (moved && !live.current.windows.some((w) => w.id === moved)) moved = undefined
      // The window the owner took hold of and moved, floated or maximized (not one they only
      // brought in front, nor the ones that shifted to make room): it becomes theirs.
      const grabbed =
        action.type === Actions.MOVE_NODE ||
        action.type === Actions.POPOUT_TAB ||
        action.type === Actions.MAXIMIZE_TOGGLE ||
        action.type === Actions.MOVE_FLOAT
          ? moved
          : undefined
      if (held.current.pointer)
        unsent.current = { model: m, moved: moved ?? unsent.current?.moved, grabbed: grabbed ?? unsent.current?.grabbed }
      else report(m, moved, grabbed)
    },
    [report],
  )

  // The pointer can lift anywhere, so its release is watched on the window.
  React.useEffect(() => {
    const release = () => {
      if (!held.current.pointer) return
      held.current.pointer = false
      const late = unsent.current
      unsent.current = null
      if (late) report(late.model, late.moved, late.grabbed)
      redraw()
    }
    const events = ["pointerup", "pointercancel", "dragend", "drop", "blur"] as const
    for (const e of events) window.addEventListener(e, release, true)
    return () => {
      for (const e of events) window.removeEventListener(e, release, true)
    }
  }, [report])

  const hasTiled = (tree.root.children?.length ?? 0) > 0
  return (
    <div
      data-slot="window-manager"
      data-empty={!hasTiled}
      className={cn("relative size-full min-h-0 overflow-hidden", className)}
      onPointerDownCapture={() => {
        held.current.pointer = true
      }}
    >
      <Layout
        model={model}
        factory={(node: TabNode) => (
          <div data-slot="window-body" className="size-full min-h-0 overflow-auto bg-background">
            {children(node.getId())}
          </div>
        )}
        onAction={onAction}
        onModelChange={onModelChange}
        constrainFloatPanels
        onTabSetPlaceHolder={() => empty}
        onRenderTab={(node, values) => {
          const w = info.get(node.getId())
          values.leading = w?.icon
          values.content = (
            <span data-slot="window-title" className="flex min-w-0 items-center gap-1.5">
              <span className="truncate">{w?.dirty ? `● ${w.title}` : (w?.title ?? node.getName())}</span>
              {w?.badge}
            </span>
          )
          const parent = node.getParent()
          const multi = (parent?.getChildren().length ?? 1) > 1
          const isSelected = parent instanceof TabSetNode ? parent.getSelectedNode() === node : true
          // On a multi-tab stack, non-selected tabs still carry their own close button;
          // the active window's actions, float/dock, maximize and close X sit on the far right of the titlebar.
          if (multi && !isSelected) {
            values.buttons.push(
              <Button
                key="close"
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-sm text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                aria-label={`Close ${w?.title ?? ""}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(node.getId())
                }}
              >
                <XIcon />
              </Button>,
            )
          }
        }}
        onRenderTabSet={(tabSetNode, values) => {
          const selected = (tabSetNode.getSelectedNode() ?? tabSetNode.getChildren()[0]) as TabNode | undefined
          if (!selected) return
          const activeId = selected.getId()
          const w = info.get(activeId)
          const currentTree = fromFlex(model.toJson())
          const where = locate(currentTree, activeId)
          const isFloating = Boolean(where?.float)
          const isMaximized = tabSetNode.isMaximized()
          const canMaximize = !isFloating && (currentTree.root.children?.length ?? 0) > 1

          if (w?.actions) {
            values.buttons.push(<React.Fragment key="actions">{w.actions}</React.Fragment>)
          }

          values.buttons.push(
            <Button
              key="float-toggle"
              variant="ghost"
              size="icon-xs"
              className="size-5 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              title={isFloating ? "Pop back into tiled layout" : "Float window"}
              aria-label={isFloating ? `Dock ${w?.title ?? ""}` : `Float ${w?.title ?? ""}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                held.current.pointer = false
                const next = toggleWindowFloat(fromFlex(model.toJson()), activeId)
                modelRef.current = Model.fromJson(toFlex(next, live.current.windows, activeId), model)
                redraw()
                const answer = live.current.onArrange(next, activeId, activeId)
                if (answer && typeof (answer as Promise<unknown>).then === "function") {
                  held.current.pending++
                  void (answer as Promise<unknown>)
                    .catch(() => {})
                    .finally(() => {
                      held.current.pending--
                      redraw()
                    })
                }
              }}
            >
              {isFloating ? <ArrowDownLeftIcon /> : <PictureInPicture2Icon />}
            </Button>,
          )

          if (canMaximize || isMaximized) {
            values.buttons.push(
              <Button
                key="maximize-toggle"
                variant="ghost"
                size="icon-xs"
                className="size-5 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                title={isMaximized ? "Restore window size" : "Maximize window"}
                aria-label={isMaximized ? `Restore ${w?.title ?? ""}` : `Maximize ${w?.title ?? ""}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  held.current.pointer = false
                  model.doAction(Actions.maximizeToggle(tabSetNode.getId()))
                }}
              >
                {isMaximized ? <Minimize2Icon /> : <Maximize2Icon />}
              </Button>,
            )
          }

          values.buttons.push(
            <Button
              key="close"
              variant="ghost"
              size="icon-xs"
              className="size-5 rounded-sm text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
              title={`Close ${w?.title ?? ""}`}
              aria-label={`Close ${w?.title ?? ""}`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onClose(activeId)
              }}
            >
              <XIcon />
            </Button>,
          )
        }}
        icons={{
          maximize: <Maximize2Icon />,
          restore: <Minimize2Icon />,
          popoutFloat: <PictureInPicture2Icon />,
        }}
      />
    </div>
  )
}

/** The window the model has in front: the showing tab of the active stack. Each floating
 * group keeps an active stack of its own, so the caller's focus wins where it still fits. */
function focusOf(model: Model, hint: string | undefined): string | undefined {
  const json = model.toJson()
  const found: string[] = []
  const scan = (n: FlexNode) => {
    if (isTabset(n)) {
      const tab = n.children?.[n.selected ?? 0]
      if (n.active && tab?.type === "tab" && tab.id) found.push(tab.id)
      return
    }
    for (const c of n.children ?? []) scan(c as FlexNode)
  }
  scan(json.layout)
  for (const sub of Object.values(json.subLayouts ?? {})) scan(sub.layout)
  if (hint && found.includes(hint)) return hint
  return found[0] ?? hint
}

export { WindowManager }
export type { WindowFloat, WindowInfo, WindowManagerProps, WindowNode, WindowTree }
