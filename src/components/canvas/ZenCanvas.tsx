"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { useCanvasStore } from "../../lib/crdt/canvasStore"
import {
  CanvasObject,
  Point,
  RectangleObject,
  CircleObject,
  FrameObject,
  LineObject,
  PenObject,
  StickyNoteObject,
  TextObject,
} from "../../types"
import { ContextualInspector } from "./ContextualInspector"
import { acoustics } from "../../lib/audio/atelierAcoustics"

const ATELIER_PALETTE = [
  "#fefae0", // Warm Parchment
  "#e8f5e9", // Pale Sage
  "#e0f2fe", // Morning Mist
  "#fce7f3", // Sakura Rose
  "#f5ebe0", // Sand Linen
  "#ffffff", // Washi Pure White
]

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"

/**
 * Calculates the required height for a sticky note based on its text content
 * and width, ensuring the paper note organically expands with writing.
 */
export const calculateNoteHeight = (
  content?: string,
  width: number = 220,
  minHeight: number = 140
): number => {
  if (!content || !content.trim()) return minHeight
  const padding = 14
  const maxWidth = Math.max(width - padding * 2, 80)
  const approxCharsPerLine = Math.floor(maxWidth / 7.6)
  const rawLines = content.split("\n")
  let totalLineSlots = 0

  for (const rawLine of rawLines) {
    if (rawLine.length === 0) {
      totalLineSlots += 1
    } else {
      totalLineSlots += Math.max(Math.ceil(rawLine.length / approxCharsPerLine), 1)
    }
  }

  const computed = padding * 2 + totalLineSlots * 22 + 14
  return Math.max(computed, minHeight)
}

const JAPANDI_FONT_FAMILY = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', 'Segoe UI', Roboto, sans-serif"

export const ZenCanvas: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>(0)
  const inertiaRafRef = useRef<number>(0)
  const glideRafRef = useRef<number>(0)

  // Velocity tracking for Inertial Glide Panning
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 })
  const lastMoveTimeRef = useRef<number>(Date.now())
  const lastScreenPosRef = useRef<Point>({ x: 0, y: 0 })

  const {
    objects,
    selectedObjectIds,
    zoomLevel,
    offsetX,
    offsetY,
    currentTool,
    atmosphere,
    setZoomLevel,
    setOffset,
    panBy,
    setCurrentTool,
    addObject,
    updateObject,
    selectObject,
    selectMultipleObjects,
    clearSelection,
    deleteSelectedObjects,
    duplicateSelectedObjects,
    spawnAdjacentNote,
    saveSnapshot,
    undo,
    redo,
    selectAll,
    centerOnObject,
    zoomToFit,
    resetView,
  } = useCanvasStore()

  // Interaction State
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null)
  const [isInteracting, setIsInteracting] = useState(false)
  const [dragStartScreen, setDragStartScreen] = useState<Point>({ x: 0, y: 0 })
  const [dragStartCanvas, setDragStartCanvas] = useState<Point>({ x: 0, y: 0 })
  const [currentCanvasPoint, setCurrentCanvasPoint] = useState<Point>({ x: 0, y: 0 })
  const [penPoints, setPenPoints] = useState<Point[]>([])
  const [interactionMode, setInteractionMode] = useState<
    "idle" | "panning" | "drawing" | "moving" | "resizing" | "selecting"
  >("idle")

  // Snapping & Magnetic Guidelines
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({})

  // Cardinal Anchors for Smart Connectors
  const [lineStartAnchor, setLineStartAnchor] = useState<{ objectId: string; anchor: 'n' | 'e' | 's' | 'w'; point: Point } | null>(null)
  const [hoveredAnchor, setHoveredAnchor] = useState<{ objectId: string; anchor: 'n' | 'e' | 's' | 'w'; point: Point } | null>(null)

  // Double-Click Ripple Animation State
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null)

  // Inline Text Editor State
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState<string>("")
  const [editingPos, setEditingPos] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const getAnchorPoint = useCallback((obj: CanvasObject, anchor?: 'n' | 'e' | 's' | 'w'): Point => {
    const ow = obj.width || 50
    const oh = obj.type === "sticky-note" ? calculateNoteHeight((obj as any).content, ow, obj.height || 140) : (obj.height || 50)
    if (anchor === 'n') return { x: obj.x + ow / 2, y: obj.y }
    if (anchor === 's') return { x: obj.x + ow / 2, y: obj.y + oh }
    if (anchor === 'e') return { x: obj.x + ow, y: obj.y + oh / 2 }
    if (anchor === 'w') return { x: obj.x, y: obj.y + oh / 2 }
    return { x: obj.x + ow / 2, y: obj.y + oh / 2 }
  }, [])

  const findNearestAnchor = useCallback((point: Point, excludeId?: string): { objectId: string; anchor: 'n' | 'e' | 's' | 'w'; point: Point } | null => {
    const threshold = 28 // 28px snap radius
    for (const [id, obj] of Object.entries(objects)) {
      if (id === excludeId || obj.type === "line" || obj.type === "pen" || obj.type === "frame") continue
      const ow = obj.width || 50
      const oh = obj.type === "sticky-note" ? calculateNoteHeight((obj as any).content, ow, obj.height || 140) : (obj.height || 50)
      const anchors: { anchor: 'n' | 'e' | 's' | 'w'; pt: Point }[] = [
        { anchor: 'n', pt: { x: obj.x + ow / 2, y: obj.y } },
        { anchor: 'e', pt: { x: obj.x + ow, y: obj.y + oh / 2 } },
        { anchor: 's', pt: { x: obj.x + ow / 2, y: obj.y + oh } },
        { anchor: 'w', pt: { x: obj.x, y: obj.y + oh / 2 } },
      ]
      for (const a of anchors) {
        const dist = Math.hypot(point.x - a.pt.x, point.y - a.pt.y)
        if (dist <= threshold) {
          return { objectId: id, anchor: a.anchor, point: a.pt }
        }
      }
    }
    return null
  }, [objects])

  const computeBezierParams = useCallback(
    (
      p1: Point,
      p2: Point,
      fromAnchor?: 'n' | 'e' | 's' | 'w',
      toAnchor?: 'n' | 'e' | 's' | 'w'
    ) => {
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.hypot(dx, dy)
      const curvature = Math.max(32, Math.min(dist * 0.45, 170))

      let d1x = 0
      let d1y = 0
      if (fromAnchor === 'e') d1x = 1
      else if (fromAnchor === 'w') d1x = -1
      else if (fromAnchor === 's') d1y = 1
      else if (fromAnchor === 'n') d1y = -1
      else {
        if (Math.abs(dx) > Math.abs(dy)) d1x = dx >= 0 ? 1 : -1
        else d1y = dy >= 0 ? 1 : -1
      }

      let d2x = 0
      let d2y = 0
      if (toAnchor === 'e') d2x = 1
      else if (toAnchor === 'w') d2x = -1
      else if (toAnchor === 's') d2y = 1
      else if (toAnchor === 'n') d2y = -1
      else {
        if (Math.abs(dx) > Math.abs(dy)) d2x = dx >= 0 ? -1 : 1
        else d2y = dy >= 0 ? -1 : 1
      }

      const cp1 = {
        x: p1.x + d1x * curvature,
        y: p1.y + d1y * curvature,
      }
      const cp2 = {
        x: p2.x + d2x * curvature,
        y: p2.y + d2y * curvature,
      }

      const midpoint = {
        x: 0.125 * p1.x + 0.375 * cp1.x + 0.375 * cp2.x + 0.125 * p2.x,
        y: 0.125 * p1.y + 0.375 * cp1.y + 0.375 * cp2.y + 0.125 * p2.y,
      }

      const arrowAngle = Math.atan2(p2.y - cp2.y, p2.x - cp2.x)

      return { p1, p2, cp1, cp2, midpoint, arrowAngle }
    },
    []
  )

  // Coordinate Conversion Helpers
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const clientX = screenX - rect.left
      const clientY = screenY - rect.top

      const zoom = Math.max(zoomLevel || 1, 0.05)
      return {
        x: (clientX - (offsetX || 0)) / zoom,
        y: (clientY - (offsetY || 0)) / zoom,
      }
    },
    [offsetX, offsetY, zoomLevel]
  )

  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number): Point => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      const zoom = Math.max(zoomLevel || 1, 0.05)
      return {
        x: rect.left + canvasX * zoom + (offsetX || 0),
        y: rect.top + canvasY * zoom + (offsetY || 0),
      }
    },
    [offsetX, offsetY, zoomLevel]
  )

  // Peripheral Off-Screen Radar: Detect objects outside the current visible viewport
  const { offscreenItems, totalOffscreenCount } = React.useMemo(() => {
    const container = containerRef.current
    const vpW = container ? container.clientWidth : (typeof window !== "undefined" ? window.innerWidth : 1200)
    const vpH = container ? container.clientHeight : (typeof window !== "undefined" ? window.innerHeight : 800)
    const z = zoomLevel || 1
    const ox = offsetX || 0
    const oy = offsetY || 0

    const visibleMinX = -ox / z
    const visibleMinY = -oy / z
    const visibleMaxX = (vpW - ox) / z
    const visibleMaxY = (vpH - oy) / z

    const allObjects = Object.values(objects).filter(
      (o) => o.type !== "line" && o.type !== "pen"
    )

    let count = 0
    const offscreen: Array<{
      id: string
      title: string
      type: string
      distance: number
      clampedX: number
      clampedY: number
      angle: number
    }> = []

    allObjects.forEach((obj) => {
      const ow = obj.width || 100
      const oh = obj.type === "sticky-note" ? calculateNoteHeight((obj as any).content, ow, obj.height || 140) : (obj.height || 100)

      const isVisible =
        obj.x + ow >= visibleMinX &&
        obj.x <= visibleMaxX &&
        obj.y + oh >= visibleMinY &&
        obj.y <= visibleMaxY

      if (!isVisible) {
        count++
        const objCenterX = obj.x + ow / 2
        const objCenterY = obj.y + oh / 2

        const localScreenX = objCenterX * z + ox
        const localScreenY = objCenterY * z + oy

        const centerX = vpW / 2
        const centerY = vpH / 2
        const dx = localScreenX - centerX
        const dy = localScreenY - centerY
        const dist = Math.round(Math.hypot(dx, dy) / z)

        const marginX = 84
        const marginTop = 105
        const marginBottom = 65
        const halfW = Math.max(vpW / 2 - marginX, 100)
        const halfH = Math.max(vpH / 2 - (marginTop + marginBottom) / 2, 100)

        const scale = Math.min(
          dx !== 0 ? Math.abs(halfW / dx) : Infinity,
          dy !== 0 ? Math.abs(halfH / dy) : Infinity
        )

        const clampedX = Math.max(marginX, Math.min(vpW - marginX, centerX + dx * scale))
        const clampedY = Math.max(marginTop, Math.min(vpH - marginBottom, centerY + dy * scale))
        const angle = Math.atan2(dy, dx)

        let label = "Note"
        if (obj.type === "frame") label = (obj as any).title || "Frame"
        else if (obj.type === "sticky-note") {
          const c = (obj as any).content || ""
          label = c.trim() ? c.slice(0, 14) + (c.length > 14 ? "…" : "") : "Sticky Note"
        } else if (obj.type === "text") {
          const c = (obj as any).content || ""
          label = c.trim() ? c.slice(0, 14) + (c.length > 14 ? "…" : "") : "Text"
        } else if (obj.type === "rectangle" || obj.type === "circle") {
          label = "Shape"
        }

        offscreen.push({
          id: obj.id,
          title: label,
          type: obj.type,
          distance: dist,
          clampedX,
          clampedY,
          angle,
        })
      }
    })

    // Sort by distance and deduplicate very close indicators
    offscreen.sort((a, b) => a.distance - b.distance)
    const filtered: typeof offscreen = []
    for (const item of offscreen) {
      const tooClose = filtered.some(
        (f) => Math.hypot(f.clampedX - item.clampedX, f.clampedY - item.clampedY) < 70
      )
      if (!tooClose) {
        filtered.push(item)
      }
      if (filtered.length >= 4) break
    }

    return { offscreenItems: filtered, totalOffscreenCount: count }
  }, [objects, zoomLevel, offsetX, offsetY])

  // Setup HiDPI Canvas & Auto Resize via ResizeObserver
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const rect = container.getBoundingClientRect()
      const width = rect.width || window.innerWidth
      const height = rect.height || window.innerHeight
      const dpr = window.devicePixelRatio || 1

      if (width > 0 && height > 0) {
        canvas.width = Math.round(width * dpr)
        canvas.height = Math.round(height * dpr)
      }
    }

    updateCanvasSize()

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize()
    })

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    window.addEventListener("resize", updateCanvasSize)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener("resize", updateCanvasSize)
      cancelAnimationFrame(glideRafRef.current)
    }
  }, [])

  // Smooth Kinetic Glide to off-screen object
  const glideToObject = useCallback(
    (id: string) => {
      const obj = objects[id]
      if (!obj) return

      const container = containerRef.current
      const vpW = container ? container.clientWidth : (typeof window !== "undefined" ? window.innerWidth : 1200)
      const vpH = container ? container.clientHeight : (typeof window !== "undefined" ? window.innerHeight : 800)
      const z = Math.max(zoomLevel || 1, 0.1)

      const objW = obj.width || 60
      const objH = obj.type === "sticky-note" ? calculateNoteHeight((obj as any).content, objW, obj.height || 160) : (obj.height || 60)
      const centerX = obj.x + objW / 2
      const centerY = obj.y + objH / 2

      const startX = offsetX || 0
      const startY = offsetY || 0
      const targetX = Math.round(vpW / 2 - centerX * z)
      const targetY = Math.round(vpH / 2 - centerY * z)

      cancelAnimationFrame(glideRafRef.current)
      cancelAnimationFrame(inertiaRafRef.current)

      const startTime = performance.now()
      const duration = 480 // 480ms serene kinetic glide

      const step = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Fluid cubic ease-out curve: 1 - (1 - t)^3
        const ease = 1 - Math.pow(1 - progress, 3)

        const curX = Math.round(startX + (targetX - startX) * ease)
        const curY = Math.round(startY + (targetY - startY) * ease)

        setOffset(curX, curY)

        if (progress < 1) {
          glideRafRef.current = requestAnimationFrame(step)
        } else {
          setOffset(targetX, targetY)
          selectObject(id)
          acoustics.playPaperDrop()
        }
      }

      glideRafRef.current = requestAnimationFrame(step)
    },
    [objects, zoomLevel, offsetX, offsetY, setOffset, selectObject]
  )

  // Start inline editing for any canvas object (frame, rectangle, circle, line, note, text)
  const startEditingObject = useCallback(
    (id: string) => {
      const obj = objects[id]
      if (!obj) return

      const zoom = Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1

      if (obj.type === "frame") {
        const frame = obj as FrameObject
        const screenPos = canvasToScreen(frame.x + 12, frame.y + 10)
        setEditingId(id)
        setEditingContent(frame.title || "Frame Section")
        setEditingPos({
          x: screenPos.x,
          y: screenPos.y,
          width: Math.max((frame.width || 240) * zoom * 0.6, 200),
          height: 32,
        })
        return
      }

      if (obj.type === "rectangle" || obj.type === "circle") {
        const screenPos = canvasToScreen(obj.x, obj.y)
        const objW = (obj.width || 100) * zoom
        const editW = Math.max(Math.min(objW, 220), 130)
        setEditingId(id)
        setEditingContent((obj as any).label || (obj as any).title || "")
        setEditingPos({
          x: screenPos.x + Math.max(0, (objW - editW) / 2),
          y: screenPos.y - 32,
          width: editW,
          height: 28,
        })
        return
      }

      if (obj.type === "line") {
        const line = obj as LineObject
        let p1 = line.points?.[0] || { x: line.x, y: line.y }
        let p2 = line.points?.[1] || { x: line.x + line.width, y: line.y + line.height }
        if (line.fromId && objects[line.fromId]) p1 = getAnchorPoint(objects[line.fromId], line.fromAnchor)
        if (line.toId && objects[line.toId]) p2 = getAnchorPoint(objects[line.toId], line.toAnchor)
        const { midpoint } = computeBezierParams(p1, p2, line.fromAnchor, line.toAnchor)
        const screenPos = canvasToScreen(midpoint.x, midpoint.y)
        setEditingId(id)
        setEditingContent(line.label || "")
        setEditingPos({
          x: screenPos.x - 75,
          y: screenPos.y - 16,
          width: 150,
          height: 32,
        })
        return
      }

      if (obj.type === "sticky-note" || obj.type === "text") {
        const screenPos = canvasToScreen(obj.x, obj.y)
        setEditingId(id)
        setEditingContent((obj as any).content || "")
        setEditingPos({
          x: screenPos.x,
          y: screenPos.y,
          width: Math.max((obj.width || 180) * zoom, 160),
          height: Math.max((obj.height || 140) * zoom, 100),
        })
      }
    },
    [objects, zoomLevel, canvasToScreen, computeBezierParams, getAnchorPoint]
  )

  // Listen to Keyboard shortcuts (with Number Keys 1-6 for instant palette switching & arrow nudging)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.code === "Space" && !e.repeat) {
        e.preventDefault()
        setIsSpacePressed(true)
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault()
        deleteSelectedObjects()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault()
        selectAll()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault()
        duplicateSelectedObjects()
      } else if (e.shiftKey && (e.key === "!" || e.key === "1")) {
        e.preventDefault()
        if (containerRef.current) {
          zoomToFit(containerRef.current.clientWidth, containerRef.current.clientHeight)
          acoustics.playPaperDrop()
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault()
        resetView()
      } else if (e.key === "Escape") {
        clearSelection()
        setEditingId(null)
      } else if (
        selectedObjectIds.length === 1 &&
        (e.key === "Enter" || e.key === "F2") &&
        !editingId
      ) {
        e.preventDefault()
        startEditingObject(selectedObjectIds[0])
      } else if (
        selectedObjectIds.length > 0 &&
        (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight")
      ) {
        e.preventDefault()
        const step = e.shiftKey ? 10 : 2
        selectedObjectIds.forEach((id) => {
          const obj = objects[id]
          if (!obj) return
          let dx = 0
          let dy = 0
          if (e.key === "ArrowUp") dy = -step
          if (e.key === "ArrowDown") dy = step
          if (e.key === "ArrowLeft") dx = -step
          if (e.key === "ArrowRight") dx = step
          updateObject(id, { x: obj.x + dx, y: obj.y + dy })
        })
      } else if (selectedObjectIds.length === 1 && ["1", "2", "3", "4", "5", "6"].includes(e.key)) {
        // Instant palette hotkey 1-6
        const idx = parseInt(e.key) - 1
        const swatch = ATELIER_PALETTE[idx]
        if (swatch) {
          const id = selectedObjectIds[0]
          const obj = objects[id]
          if (obj?.type === "sticky-note") {
            updateObject(id, { color: swatch, fill: swatch } as any)
          } else if (obj) {
            updateObject(id, { fill: swatch })
          }
        }
      } else {
        const toolMap: Record<string, any> = {
          v: "select",
          h: "hand",
          r: "rectangle",
          c: "circle",
          l: "line",
          p: "pen",
          n: "sticky-note",
          t: "text",
          f: "frame",
        }
        const key = e.key.toLowerCase()
        if (key in toolMap) {
          setCurrentTool(toolMap[key])
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [
    deleteSelectedObjects,
    undo,
    redo,
    selectAll,
    clearSelection,
    setCurrentTool,
    duplicateSelectedObjects,
    selectedObjectIds,
    objects,
    zoomToFit,
    resetView,
    startEditingObject,
    editingId,
  ])

  // Get Resize Handle at canvas point
  const getHandleAtPoint = (point: Point, obj: CanvasObject): ResizeHandle | null => {
    const handleSize = 14 / (zoomLevel || 1)
    const h = obj.type === "sticky-note" ? calculateNoteHeight((obj as any).content, obj.width || 220, obj.height || 140) : obj.height
    const bounds = {
      x: obj.x,
      y: obj.y,
      w: obj.width,
      h: h,
    }

    const handles: Record<ResizeHandle, Point> = {
      nw: { x: bounds.x, y: bounds.y },
      n: { x: bounds.x + bounds.w / 2, y: bounds.y },
      ne: { x: bounds.x + bounds.w, y: bounds.y },
      e: { x: bounds.x + bounds.w, y: bounds.y + bounds.h / 2 },
      se: { x: bounds.x + bounds.w, y: bounds.y + bounds.h },
      s: { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h },
      sw: { x: bounds.x, y: bounds.y + bounds.h },
      w: { x: bounds.x, y: bounds.y + bounds.h / 2 },
    }

    for (const [key, pos] of Object.entries(handles)) {
      if (
        Math.abs(point.x - pos.x) <= handleSize &&
        Math.abs(point.y - pos.y) <= handleSize
      ) {
        return key as ResizeHandle
      }
    }
    return null
  }

  // Hit-testing for object selection (foreground elements prioritized over background frames)
  const getObjectAtPoint = useCallback(
    (point: Point): string | null => {
      const keys = Object.keys(objects).reverse()

      // 1. First test foreground objects (notes, shapes, text, lines)
      for (const id of keys) {
        const obj = objects[id]
        if (!obj || obj.type === "frame") continue

        if (obj.type === "line") {
          const line = obj as LineObject
          let p1 = line.points?.[0] || { x: line.x, y: line.y }
          let p2 = line.points?.[1] || { x: line.x + line.width, y: line.y + line.height }
          if (line.fromId && objects[line.fromId]) p1 = getAnchorPoint(objects[line.fromId], line.fromAnchor)
          if (line.toId && objects[line.toId]) p2 = getAnchorPoint(objects[line.toId], line.toAnchor)

          const { cp1, cp2, midpoint } = computeBezierParams(p1, p2, line.fromAnchor, line.toAnchor)

          // Midpoint pill hit test
          if (Math.hypot(point.x - midpoint.x, point.y - midpoint.y) <= 18) {
            return id
          }

          // Sample 12 steps along Bezier curve
          for (let step = 0; step <= 12; step++) {
            const t = step / 12
            const bx = (1 - t) ** 3 * p1.x + 3 * (1 - t) ** 2 * t * cp1.x + 3 * (1 - t) * t ** 2 * cp2.x + t ** 3 * p2.x
            const by = (1 - t) ** 3 * p1.y + 3 * (1 - t) ** 2 * t * cp1.y + 3 * (1 - t) * t ** 2 * cp2.y + t ** 3 * p2.y
            if (Math.hypot(point.x - bx, point.y - by) <= 14) {
              return id
            }
          }
          continue
        }

        const w = obj.width || 50
        const h = obj.type === "sticky-note" ? calculateNoteHeight((obj as any).content, w, obj.height || 140) : (obj.height || 50)
        if (
          point.x >= obj.x &&
          point.x <= obj.x + w &&
          point.y >= obj.y &&
          point.y <= obj.y + h
        ) {
          return id
        }
      }

      // 2. Then test frames (background grouping containers)
      for (const id of keys) {
        const obj = objects[id]
        if (!obj || obj.type !== "frame") continue
        const w = obj.width || 50
        const h = obj.height || 50
        if (
          point.x >= obj.x &&
          point.x <= obj.x + w &&
          point.y >= obj.y &&
          point.y <= obj.y + h
        ) {
          return id
        }
      }

      return null
    },
    [objects, getAnchorPoint, computeBezierParams]
  )

  // Double click: edit existing note/shape/frame or instant-create new sticky note on empty canvas
  const handleDoubleClick = (e: React.MouseEvent) => {
    const point = screenToCanvas(e.clientX, e.clientY)
    const clickedId = getObjectAtPoint(point)

    if (!clickedId) {
      // Trigger subtle ripple animation
      setRipple({ x: e.clientX, y: e.clientY })
      setTimeout(() => setRipple(null), 550)
      acoustics.playPaperDrop()

      // Instant Quick-Create: Spawns a tactile Washi Parchment note
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const newNote: StickyNoteObject = {
        id,
        type: "sticky-note",
        x: Math.round(point.x - 110),
        y: Math.round(point.y - 70),
        width: 220,
        height: 160,
        color: "#fefae0", // Warm Parchment
        fill: "#fefae0",
        content: "",
        stroke: "rgba(0,0,0,0.08)",
        strokeWidth: 1,
        opacity: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: "user",
      }
      addObject(newNote)
      selectObject(id)

      const screenPos = canvasToScreen(newNote.x, newNote.y)
      const zoom = zoomLevel || 1
      setEditingId(id)
      setEditingContent("")
      setEditingPos({
        x: screenPos.x,
        y: screenPos.y,
        width: Math.max(newNote.width * zoom, 160),
        height: Math.max(newNote.height * zoom, 100),
      })
      return
    }

    const obj = objects[clickedId]
    if (obj.type === "frame") {
      // If double-clicked in frame title bar (top 55px) or frame was selected, rename frame!
      if (point.y <= obj.y + 55 || selectedObjectIds.includes(clickedId)) {
        startEditingObject(clickedId)
        return
      }

      // If double-clicked deep in body, drop a new note inside the frame
      setRipple({ x: e.clientX, y: e.clientY })
      setTimeout(() => setRipple(null), 550)
      acoustics.playPaperDrop()
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const newNote: StickyNoteObject = {
        id,
        type: "sticky-note",
        x: Math.round(point.x - 110),
        y: Math.round(point.y - 70),
        width: 220,
        height: 160,
        color: "#fefae0",
        fill: "#fefae0",
        content: "",
        stroke: "rgba(0,0,0,0.08)",
        strokeWidth: 1,
        opacity: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: "user",
      }
      addObject(newNote)
      selectObject(id)
      startEditingObject(id)
      return
    }

    // Direct inline editing for rectangle, circle, line, sticky-note, and text
    startEditingObject(clickedId)
  }

  // Mouse Down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    // Cancel any active pan inertia
    cancelAnimationFrame(inertiaRafRef.current)
    velocityRef.current = { vx: 0, vy: 0 }

    if (editingId) {
      commitInlineEdit()
    }

    const screenPt = { x: e.clientX, y: e.clientY }
    const canvasPt = screenToCanvas(e.clientX, e.clientY)
    setDragStartScreen(screenPt)
    setDragStartCanvas(canvasPt)
    setCurrentCanvasPoint(canvasPt)
    setIsInteracting(true)
    lastMoveTimeRef.current = Date.now()
    lastScreenPosRef.current = screenPt

    // Pan with spacebar or middle click or hand tool
    if (isSpacePressed || e.button === 1 || currentTool === "hand") {
      setInteractionMode("panning")
      return
    }

    if (e.button !== 0) return

    if (currentTool === "select") {
      if (selectedObjectIds.length === 1) {
        const anchor = findNearestAnchor(canvasPt)
        if (anchor && selectedObjectIds.includes(anchor.objectId)) {
          setLineStartAnchor(anchor)
          setDragStartCanvas(anchor.point)
          setInteractionMode("drawing")
          setCurrentTool("line")
          acoustics.playAnchorSnap()
          return
        }

        const selectedObj = objects[selectedObjectIds[0]]
        if (selectedObj) {
          const handle = getHandleAtPoint(canvasPt, selectedObj)
          if (handle) {
            saveSnapshot()
            setActiveHandle(handle)
            setInteractionMode("resizing")
            return
          }
        }
      }

      const clickedId = getObjectAtPoint(canvasPt)
      if (clickedId) {
        if (e.shiftKey) {
          selectObject(clickedId, true)
        } else if (!selectedObjectIds.includes(clickedId)) {
          selectObject(clickedId, false)
        }
        saveSnapshot()
        setInteractionMode("moving")
      } else {
        clearSelection()
        setInteractionMode("selecting")
      }
    } else if (currentTool === "pen") {
      setInteractionMode("drawing")
      setPenPoints([canvasPt])
    } else if (currentTool === "line") {
      setInteractionMode("drawing")
      const anchor = findNearestAnchor(canvasPt)
      if (anchor) {
        setLineStartAnchor(anchor)
        setDragStartCanvas(anchor.point)
        acoustics.playAnchorSnap()
      } else {
        setLineStartAnchor(null)
      }
    } else if (
      currentTool === "rectangle" ||
      currentTool === "circle" ||
      currentTool === "frame" ||
      currentTool === "sticky-note" ||
      currentTool === "text"
    ) {
      setInteractionMode("drawing")
    }
  }

  // Mouse Move handler (with Inertial Velocity tracking & Magnetic Detents)
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasPt = screenToCanvas(e.clientX, e.clientY)
    setCurrentCanvasPoint(canvasPt)

    if (!isInteracting) return

    if (interactionMode === "panning") {
      const now = Date.now()
      const dt = Math.max(now - lastMoveTimeRef.current, 1)
      const dx = e.clientX - lastScreenPosRef.current.x
      const dy = e.clientY - lastScreenPosRef.current.y

      // Exponential smoothing on velocity vector for inertial release
      velocityRef.current = {
        vx: (dx / dt) * 12,
        vy: (dy / dt) * 12,
      }
      lastMoveTimeRef.current = now
      lastScreenPosRef.current = { x: e.clientX, y: e.clientY }

      panBy(dx, dy)
    } else if (interactionMode === "moving") {
      let dx = canvasPt.x - dragStartCanvas.x
      let dy = canvasPt.y - dragStartCanvas.y

      // Magnetic Snapping Physics: check proximity to other objects
      let snappedX: number | undefined = undefined
      let snappedY: number | undefined = undefined

      if (selectedObjectIds.length === 1) {
        const currentId = selectedObjectIds[0]
        const current = objects[currentId]
        if (current) {
          const prospectiveCenterX = current.x + dx + current.width / 2
          const prospectiveCenterY = current.y + dy + current.height / 2

          for (const [id, other] of Object.entries(objects)) {
            if (id === currentId || !other) continue
            const otherCenterX = other.x + other.width / 2
            const otherCenterY = other.y + other.height / 2

            // Magnetic snap to center X
            if (Math.abs(prospectiveCenterX - otherCenterX) < 7) {
              snappedX = otherCenterX
              dx = otherCenterX - (current.x + current.width / 2)
            }
            // Magnetic snap to center Y
            if (Math.abs(prospectiveCenterY - otherCenterY) < 7) {
              snappedY = otherCenterY
              dy = otherCenterY - (current.y + current.height / 2)
            }
          }
        }
      }

      if ((snappedX !== undefined || snappedY !== undefined) && !snapGuides.x && !snapGuides.y) {
        acoustics.playAnchorSnap()
      }
      setSnapGuides({ x: snappedX, y: snappedY })

      // Smart Frame grouping: If a frame is moving, all contained thoughts move seamlessly with it
      const movingIds = new Set<string>(selectedObjectIds)
      selectedObjectIds.forEach((id) => {
        const obj = objects[id]
        if (obj?.type === "frame") {
          Object.values(objects).forEach((other) => {
            if (!movingIds.has(other.id) && other.type !== "frame") {
              const cx = other.x + (other.width || 50) / 2
              const cy = other.y + (other.height || 50) / 2
              if (
                cx >= obj.x &&
                cx <= obj.x + obj.width &&
                cy >= obj.y &&
                cy <= obj.y + obj.height
              ) {
                movingIds.add(other.id)
              }
            }
          })
        }
      })

      movingIds.forEach((id) => {
        const obj = objects[id]
        if (obj) {
          updateObject(id, {
            x: Math.round(obj.x + dx),
            y: Math.round(obj.y + dy),
          })
        }
      })

      // Dynamically track connected line arrows
      Object.values(objects).forEach((o) => {
        if (o.type === "line") {
          const line = o as LineObject
          let changed = false
          const p0 = line.points?.[0] ? { ...line.points[0] } : { x: line.x, y: line.y }
          const p1 = line.points?.[1] ? { ...line.points[1] } : { x: line.x + line.width, y: line.y + line.height }

          if (line.fromId && movingIds.has(line.fromId) && objects[line.fromId]) {
            const anchorPt = getAnchorPoint(objects[line.fromId], line.fromAnchor)
            p0.x = anchorPt.x
            p0.y = anchorPt.y
            changed = true
          }
          if (line.toId && movingIds.has(line.toId) && objects[line.toId]) {
            const anchorPt = getAnchorPoint(objects[line.toId], line.toAnchor)
            p1.x = anchorPt.x
            p1.y = anchorPt.y
            changed = true
          }
          if (changed) {
            updateObject(line.id, {
              points: [p0, p1],
              x: Math.min(p0.x, p1.x),
              y: Math.min(p0.y, p1.y),
              width: Math.abs(p1.x - p0.x),
              height: Math.abs(p1.y - p0.y),
            })
          }
        }
      })

      setDragStartCanvas(canvasPt)
    } else if (interactionMode === "drawing" && currentTool === "line") {
      const anchor = findNearestAnchor(canvasPt, lineStartAnchor?.objectId)
      if (anchor) {
        if (!hoveredAnchor) acoustics.playAnchorSnap()
        setHoveredAnchor(anchor)
        setCurrentCanvasPoint(anchor.point)
      } else {
        setHoveredAnchor(null)
      }
    } else if (interactionMode === "resizing" && activeHandle && selectedObjectIds.length === 1) {
      const id = selectedObjectIds[0]
      const obj = objects[id]
      if (!obj) return

      let { x, y, width, height } = obj

      if (activeHandle.includes("e")) {
        width = Math.max(30, canvasPt.x - x)
      }
      if (activeHandle.includes("s")) {
        height = Math.max(30, canvasPt.y - y)
      }
      if (activeHandle.includes("w")) {
        const newWidth = Math.max(30, x + width - canvasPt.x)
        x = x + width - newWidth
        width = newWidth
      }
      if (activeHandle.includes("n")) {
        const newHeight = Math.max(30, y + height - canvasPt.y)
        y = y + height - newHeight
        height = newHeight
      }

      updateObject(id, { x, y, width, height })
    } else if (interactionMode === "drawing" && currentTool === "pen") {
      setPenPoints((prev) => [...prev, canvasPt])
    }
  }

  // Mouse Up handler (Kick off Kinetic Pan Inertia & Marquee selections)
  const handleMouseUp = () => {
    if (!isInteracting) return

    // Trigger Inertial Pan Momentum if released with velocity
    if (interactionMode === "panning") {
      let { vx, vy } = velocityRef.current
      if (Math.hypot(vx, vy) > 2) {
        const stepInertia = () => {
          panBy(vx, vy)
          vx *= 0.91 // Gentle kinetic friction
          vy *= 0.91
          if (Math.hypot(vx, vy) > 0.35) {
            inertiaRafRef.current = requestAnimationFrame(stepInertia)
          }
        }
        cancelAnimationFrame(inertiaRafRef.current)
        inertiaRafRef.current = requestAnimationFrame(stepInertia)
      }
    }

    if (interactionMode === "drawing") {
      const p1 = dragStartCanvas
      const p2 = currentCanvasPoint
      const x = Math.min(p1.x, p2.x)
      const y = Math.min(p1.y, p2.y)
      const width = Math.max(Math.abs(p2.x - p1.x), 20)
      const height = Math.max(Math.abs(p2.y - p1.y), 20)

      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      if (currentTool === "rectangle") {
        const isHearth = atmosphere === "hearth"
        const rectObj: RectangleObject = {
          id,
          type: "rectangle",
          x,
          y,
          width: Math.max(width, 100),
          height: Math.max(height, 60),
          fill: isHearth ? "#201e1d" : "#ffffff",
          stroke: isHearth ? "#e7e5e4" : "#1c1917",
          strokeWidth: 2,
          opacity: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: "user",
        }
        addObject(rectObj)
        selectObject(rectObj.id)
        acoustics.playPaperDrop()
        setCurrentTool("select")
      } else if (currentTool === "circle") {
        const isHearth = atmosphere === "hearth"
        const circleObj: CircleObject = {
          id,
          type: "circle",
          x,
          y,
          width: Math.max(width, 70),
          height: Math.max(height, 70),
          fill: isHearth ? "#201e1d" : "#ffffff",
          stroke: isHearth ? "#e7e5e4" : "#1c1917",
          strokeWidth: 2,
          opacity: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: "user",
        }
        addObject(circleObj)
        selectObject(circleObj.id)
        acoustics.playPaperDrop()
        setCurrentTool("select")
      } else if (currentTool === "line") {
        const endAnchor = findNearestAnchor(p2, lineStartAnchor?.objectId)

        if (lineStartAnchor && !endAnchor && Math.hypot(p2.x - p1.x, p2.y - p1.y) > 60) {
          // Instant Quick-Spawn connected note
          const newNoteId = crypto.randomUUID()
          const oppositeAnchor: Record<'n'|'e'|'s'|'w', 'n'|'e'|'s'|'w'> = {
            n: 's',
            s: 'n',
            e: 'w',
            w: 'e',
          }
          const toAnchor = oppositeAnchor[lineStartAnchor.anchor] || 'w'

          const noteW = 220
          const noteH = 160
          const noteX = toAnchor === 'w' ? p2.x : toAnchor === 'e' ? p2.x - noteW : p2.x - noteW / 2
          const noteY = toAnchor === 'n' ? p2.y : toAnchor === 's' ? p2.y - noteH : p2.y - noteH / 2

          const newNote: StickyNoteObject = {
            id: newNoteId,
            type: "sticky-note",
            x: Math.round(noteX),
            y: Math.round(noteY),
            width: noteW,
            height: noteH,
            color: "#fefae0",
            fill: "#fefae0",
            content: "",
            stroke: "rgba(0,0,0,0.08)",
            strokeWidth: 1,
            opacity: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: "user",
          }
          addObject(newNote)

          const targetAnchorPt = getAnchorPoint(newNote, toAnchor)

          const lineObj: LineObject = {
            id,
            type: "line",
            x: Math.min(p1.x, targetAnchorPt.x),
            y: Math.min(p1.y, targetAnchorPt.y),
            width: Math.abs(targetAnchorPt.x - p1.x),
            height: Math.abs(targetAnchorPt.y - p1.y),
            points: [p1, targetAnchorPt],
            fromId: lineStartAnchor.objectId,
            fromAnchor: lineStartAnchor.anchor,
            toId: newNoteId,
            toAnchor,
            stroke: "#c25e3e",
            strokeWidth: 2.5,
            curveStyle: "bezier",
            opacity: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: "user",
          }
          addObject(lineObj)
          acoustics.playPaperDrop()
          setCurrentTool("select")
          selectObject(newNoteId)

          const screenPos = canvasToScreen(newNote.x, newNote.y)
          setEditingId(newNoteId)
          setEditingContent("")
          setEditingPos({
            x: screenPos.x,
            y: screenPos.y,
            width: Math.max(newNote.width * (zoomLevel || 1), 160),
            height: Math.max(newNote.height * (zoomLevel || 1), 100),
          })

          setLineStartAnchor(null)
          setHoveredAnchor(null)
        } else {
          const finalP1 = lineStartAnchor ? lineStartAnchor.point : p1
          const finalP2 = endAnchor ? endAnchor.point : p2

          // Prevent stray zero-length arrows pointing to nowhere on accidental clicks
          const dragDist = Math.hypot(finalP2.x - finalP1.x, finalP2.y - finalP1.y)
          if (!lineStartAnchor && !endAnchor && dragDist < 25) {
            setLineStartAnchor(null)
            setHoveredAnchor(null)
            setCurrentTool("select")
            return
          }

          const lineObj: LineObject = {
            id,
            type: "line",
            x: Math.min(finalP1.x, finalP2.x),
            y: Math.min(finalP1.y, finalP2.y),
            width: Math.abs(finalP2.x - finalP1.x),
            height: Math.abs(finalP2.y - finalP1.y),
            points: [finalP1, finalP2],
            fromId: lineStartAnchor?.objectId,
            fromAnchor: lineStartAnchor?.anchor,
            toId: endAnchor?.objectId,
            toAnchor: endAnchor?.anchor,
            curveStyle: "bezier",
            stroke: "#c25e3e",
            strokeWidth: 2.5,
            opacity: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: "user",
          }
          addObject(lineObj)
          acoustics.playAnchorSnap()
          setCurrentTool("select")
          setLineStartAnchor(null)
          setHoveredAnchor(null)
        }
      } else if (currentTool === "frame") {
        const frameObj: FrameObject = {
          id,
          type: "frame",
          title: "Section",
          x,
          y,
          width: Math.max(width, 240),
          height: Math.max(height, 160),
          stroke: "#c25e3e",
          strokeWidth: 1.5,
          opacity: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: "user",
        }
        addObject(frameObj)
        selectObject(frameObj.id)
        acoustics.playPaperDrop()
        setCurrentTool("select")
      } else if (currentTool === "pen") {
        if (penPoints.length > 1) {
          const minX = Math.min(...penPoints.map((p) => p.x))
          const minY = Math.min(...penPoints.map((p) => p.y))
          const maxX = Math.max(...penPoints.map((p) => p.x))
          const maxY = Math.max(...penPoints.map((p) => p.y))

          const penObj: PenObject = {
            id,
            type: "pen",
            x: minX,
            y: minY,
            width: maxX - minX || 20,
            height: maxY - minY || 20,
            points: penPoints,
            stroke: atmosphere === "hearth" ? "#e7e5e4" : "#1c1917", // Dynamic sumi carbon ink
            strokeWidth: 2.5,
            opacity: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: "user",
          }
          addObject(penObj)
        }
        setPenPoints([])
      } else if (currentTool === "sticky-note") {
        const randomColor = ATELIER_PALETTE[Math.floor(Math.random() * ATELIER_PALETTE.length)]
        const noteObj: StickyNoteObject = {
          id,
          type: "sticky-note",
          x: p1.x,
          y: p1.y,
          width: 220,
          height: 160,
          color: randomColor,
          content: "Double-click to write...",
          fill: randomColor,
          stroke: "rgba(0,0,0,0.08)",
          strokeWidth: 1,
          opacity: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: "user",
        }
        addObject(noteObj)
        acoustics.playPaperDrop()
        setCurrentTool("select")
      } else if (currentTool === "text") {
        const textObj: TextObject = {
          id,
          type: "text",
          x: p1.x,
          y: p1.y,
          width: 220,
          height: 40,
          content: "",
          fontSize: 18,
          fontFamily: "var(--font-geist-sans), sans-serif",
          textAlign: "left",
          fill: atmosphere === "hearth" ? "#e7e5e4" : "#1c1917",
          opacity: 1,
          createdAt: now,
          updatedAt: now,
          createdBy: "user",
        }
        addObject(textObj)
        selectObject(textObj.id)
        setCurrentTool("select")
        startEditingObject(textObj.id)
      }
    } else if (interactionMode === "moving") {
      if (selectedObjectIds.length === 1) {
        const { vx, vy } = velocityRef.current
        const speed = Math.hypot(vx, vy)
        if (speed > 26) {
          // Tactile Fling off board
          acoustics.playFlingDisintegrate()
          deleteSelectedObjects()
        } else {
          acoustics.playPaperDrop()
        }
      } else {
        acoustics.playPaperDrop()
      }
    } else if (interactionMode === "selecting") {
      // Marquee Box Selection
      const boxX = Math.min(dragStartCanvas.x, currentCanvasPoint.x)
      const boxY = Math.min(dragStartCanvas.y, currentCanvasPoint.y)
      const boxW = Math.abs(currentCanvasPoint.x - dragStartCanvas.x)
      const boxH = Math.abs(currentCanvasPoint.y - dragStartCanvas.y)

      if (boxW > 6 || boxH > 6) {
        const matched = Object.values(objects).filter((obj) => {
          const ow = obj.width || 50
          const oh = obj.height || 50
          return (
            obj.x + ow >= boxX &&
            obj.x <= boxX + boxW &&
            obj.y + oh >= boxY &&
            obj.y <= boxY + boxH
          )
        }).map((obj) => obj.id)

        if (matched.length > 0) {
          selectMultipleObjects(matched)
        }
      }
    }

    setIsInteracting(false)
    setInteractionMode("idle")
    setActiveHandle(null)
    setSnapGuides({})
    setLineStartAnchor(null)
    setHoveredAnchor(null)
  }

  // Wheel zoom centered around cursor with rubber-band bounds
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()

    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92
      const currentZoom = zoomLevel || 1
      const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.15), 4)

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      const offX = offsetX || 0
      const offY = offsetY || 0
      const newOffsetX = mouseX - (mouseX - offX) * (newZoom / currentZoom)
      const newOffsetY = mouseY - (mouseY - offY) * (newZoom / currentZoom)

      setZoomLevel(newZoom)
      setOffset(newOffsetX, newOffsetY)
    } else {
      panBy(-e.deltaX, -e.deltaY)
    }
  }

  // Commit text editing
  const commitInlineEdit = () => {
    if (editingId && objects[editingId]) {
      const obj = objects[editingId]
      if (obj.type === "frame") {
        updateObject(editingId, { title: editingContent.trim() || "Frame Section" } as any)
      } else if (obj.type === "line") {
        updateObject(editingId, { label: editingContent.trim() } as any)
      } else if (obj.type === "rectangle" || obj.type === "circle") {
        const text = editingContent.trim()
        updateObject(editingId, { label: text, title: text } as any)
      } else if (obj.type === "sticky-note") {
        const reqH = calculateNoteHeight(editingContent, obj.width || 220, 140)
        updateObject(editingId, { content: editingContent, height: reqH } as any)
      } else {
        updateObject(editingId, { content: editingContent } as any)
      }
    }
    setEditingId(null)
    setEditingPos(null)
  }

  // Canvas Render Loop (with Elevation Shadows, Magnetic Lines & Fluid Brushes)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const render = () => {
      const dpr = window.devicePixelRatio || 1
      const width = canvas.width / dpr
      const height = canvas.height / dpr

      if (width === 0 || height === 0) {
        animationFrameRef.current = requestAnimationFrame(render)
        return
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      // Transform for Infinite Pan & Zoom
      ctx.save()
      const offX = Number.isFinite(offsetX) ? offsetX : 0
      const offY = Number.isFinite(offsetY) ? offsetY : 0
      const zoom = Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1

      ctx.translate(offX, offY)
      ctx.scale(zoom, zoom)

      // 1. Render Existing Canvas Objects safely with Elevation Physics
      // 1. Render Existing Canvas Objects safely with Elevation Physics
      // Render frames first so they sit as background mounting boards
      const objectList = Object.values(objects)
      const frames = objectList.filter((o) => o?.type === "frame")
      const nonFrames = objectList.filter((o) => o?.type !== "frame")

      frames.forEach((obj) => {
        if (!obj || !obj.id) return
        try {
          const isSelected = selectedObjectIds.includes(obj.id)
          const isLifted = isInteracting && interactionMode === "moving" && isSelected
          drawObject(ctx, obj, isSelected, isLifted, zoom)
        } catch (err) {
          console.error("Error drawing frame:", obj.id, err)
        }
      })

      nonFrames.forEach((obj) => {
        if (!obj || !obj.id) return
        try {
          const isSelected = selectedObjectIds.includes(obj.id)
          const isLifted = isInteracting && interactionMode === "moving" && isSelected
          drawObject(ctx, obj, isSelected, isLifted, zoom)
        } catch (err) {
          console.error("Error drawing object:", obj.id, err)
        }
      })

      // 2. Render In-progress Previews
      if (isInteracting && interactionMode === "drawing") {
        ctx.save()
        if (currentTool === "rectangle") {
          const x = Math.min(dragStartCanvas.x, currentCanvasPoint.x)
          const y = Math.min(dragStartCanvas.y, currentCanvasPoint.y)
          const w = Math.abs(currentCanvasPoint.x - dragStartCanvas.x)
          const h = Math.abs(currentCanvasPoint.y - dragStartCanvas.y)
          ctx.strokeStyle = "#c25e3e"
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.strokeRect(x, y, w, h)
        } else if (currentTool === "frame") {
          const x = Math.min(dragStartCanvas.x, currentCanvasPoint.x)
          const y = Math.min(dragStartCanvas.y, currentCanvasPoint.y)
          const w = Math.abs(currentCanvasPoint.x - dragStartCanvas.x)
          const h = Math.abs(currentCanvasPoint.y - dragStartCanvas.y)
          ctx.strokeStyle = "#c25e3e"
          ctx.lineWidth = 1.5
          ctx.setLineDash([6, 6])
          ctx.strokeRect(x, y, w, h)
        } else if (currentTool === "circle") {
          const x = Math.min(dragStartCanvas.x, currentCanvasPoint.x)
          const y = Math.min(dragStartCanvas.y, currentCanvasPoint.y)
          const w = Math.abs(currentCanvasPoint.x - dragStartCanvas.x)
          const h = Math.abs(currentCanvasPoint.y - dragStartCanvas.y)
          ctx.strokeStyle = "#c25e3e"
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.ellipse(x + w / 2, y + h / 2, Math.max(w / 2, 1), Math.max(h / 2, 1), 0, 0, Math.PI * 2)
          ctx.stroke()
        } else if (currentTool === "line") {
          ctx.strokeStyle = "#c25e3e"
          ctx.lineWidth = 2.5
          ctx.lineCap = "round"
          const p1 = dragStartCanvas
          const p2 = currentCanvasPoint
          const previewParams = computeBezierParams(p1, p2, lineStartAnchor?.anchor, hoveredAnchor?.anchor)

          ctx.beginPath()
          ctx.moveTo(previewParams.p1.x, previewParams.p1.y)
          ctx.bezierCurveTo(
            previewParams.cp1.x,
            previewParams.cp1.y,
            previewParams.cp2.x,
            previewParams.cp2.y,
            previewParams.p2.x,
            previewParams.p2.y
          )
          ctx.stroke()

          // Arrow head at p2 dynamically angled with curve tangent
          const headLen = 14
          ctx.fillStyle = ctx.strokeStyle
          ctx.beginPath()
          ctx.moveTo(previewParams.p2.x, previewParams.p2.y)
          ctx.lineTo(
            previewParams.p2.x - headLen * Math.cos(previewParams.arrowAngle - Math.PI / 6),
            previewParams.p2.y - headLen * Math.sin(previewParams.arrowAngle - Math.PI / 6)
          )
          ctx.lineTo(
            previewParams.p2.x - headLen * Math.cos(previewParams.arrowAngle + Math.PI / 6),
            previewParams.p2.y - headLen * Math.sin(previewParams.arrowAngle + Math.PI / 6)
          )
          ctx.closePath()
          ctx.fill()
        } else if (currentTool === "pen" && penPoints.length > 1) {
          ctx.strokeStyle = atmosphere === "hearth" ? "#e7e5e4" : "#1c1917"
          ctx.lineWidth = 2.5
          ctx.lineCap = "round"
          ctx.lineJoin = "round"
          ctx.beginPath()
          ctx.moveTo(penPoints[0].x, penPoints[0].y)
          for (let i = 1; i < penPoints.length; i++) {
            ctx.lineTo(penPoints[i].x, penPoints[i].y)
          }
          ctx.stroke()
        }
        ctx.restore()
      }

      // 3. Render Cardinal Anchor Ports when using line tool
      if (currentTool === "line") {
        ctx.save()
        Object.values(objects).forEach((o) => {
          if (o.type === "line" || o.type === "pen" || o.type === "frame") return
          const ow = o.width || 50
          const oh = o.type === "sticky-note" ? calculateNoteHeight((o as any).content, ow, o.height || 160) : (o.height || 50)
          const anchors: Point[] = [
            { x: o.x + ow / 2, y: o.y },
            { x: o.x + ow, y: o.y + oh / 2 },
            { x: o.x + ow / 2, y: o.y + oh },
            { x: o.x, y: o.y + oh / 2 },
          ]
          anchors.forEach((pt) => {
            const isTarget = hoveredAnchor && Math.hypot(hoveredAnchor.point.x - pt.x, hoveredAnchor.point.y - pt.y) < 3
            ctx.beginPath()
            ctx.arc(pt.x, pt.y, isTarget ? 6 / zoom : 3.5 / zoom, 0, Math.PI * 2)
            ctx.fillStyle = isTarget ? "#c25e3e" : "rgba(194, 94, 62, 0.7)"
            ctx.fill()
            ctx.lineWidth = 1.5 / zoom
            ctx.strokeStyle = "#ffffff"
            ctx.stroke()
          })
        })
        ctx.restore()
      }

      // 4. Render Magnetic Snapping Hairlines
      if (snapGuides.x !== undefined) {
        ctx.save()
        ctx.strokeStyle = "#c25e3e"
        ctx.lineWidth = 1 / zoom
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(snapGuides.x, -50000)
        ctx.lineTo(snapGuides.x, 50000)
        ctx.stroke()
        ctx.restore()
      }
      if (snapGuides.y !== undefined) {
        ctx.save()
        ctx.strokeStyle = "#c25e3e"
        ctx.lineWidth = 1 / zoom
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(-50000, snapGuides.y)
        ctx.lineTo(50000, snapGuides.y)
        ctx.stroke()
        ctx.restore()
      }

      // 5. Render Marquee Box Selection Preview
      if (isInteracting && interactionMode === "selecting") {
        ctx.save()
        const x = Math.min(dragStartCanvas.x, currentCanvasPoint.x)
        const y = Math.min(dragStartCanvas.y, currentCanvasPoint.y)
        const w = Math.abs(currentCanvasPoint.x - dragStartCanvas.x)
        const h = Math.abs(currentCanvasPoint.y - dragStartCanvas.y)
        ctx.fillStyle = "rgba(194, 94, 62, 0.08)"
        ctx.strokeStyle = "#c25e3e"
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.fillRect(x, y, w, h)
        ctx.strokeRect(x, y, w, h)
        ctx.restore()
      }

      ctx.restore() // Restore pan & zoom
      ctx.restore() // Restore DPR scale

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [
    objects,
    selectedObjectIds,
    zoomLevel,
    offsetX,
    offsetY,
    isInteracting,
    interactionMode,
    currentTool,
    dragStartCanvas,
    currentCanvasPoint,
    penPoints,
    snapGuides,
    hoveredAnchor,
  ])

  // Individual Object Renderer with Elevation Physics
  const drawObject = (
    ctx: CanvasRenderingContext2D,
    obj: CanvasObject,
    isSelected: boolean,
    isLifted: boolean,
    zoom: number
  ) => {
    ctx.save()
    ctx.globalAlpha = obj.opacity ?? 1

    const x = obj.x || 0
    const y = obj.y || 0
    const w = Math.max(Math.abs(obj.width || 50), 10)
    const rawH = Math.max(Math.abs(obj.height || 50), 10)
    const h = obj.type === "sticky-note" ? calculateNoteHeight((obj as any).content, w, rawH) : rawH

    // Elevation Physics: Gentle expansion and elevation shadow on active drag
    if (isLifted) {
      ctx.translate(x + w / 2, y + h / 2)
      ctx.scale(1.025, 1.025)
      ctx.translate(-(x + w / 2), -(y + h / 2))
    }

    if (obj.type === "frame") {
      const frame = obj as FrameObject
      ctx.save()
      ctx.fillStyle = atmosphere === "hearth" ? "rgba(255, 255, 255, 0.02)" : "rgba(194, 94, 62, 0.025)"
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, 12)
      ctx.fill()

      ctx.strokeStyle = frame.stroke || (atmosphere === "hearth" ? "rgba(231, 229, 228, 0.3)" : "rgba(194, 94, 62, 0.45)")
      ctx.lineWidth = frame.strokeWidth || 1.5
      ctx.setLineDash([6, 6])
      ctx.stroke()
      ctx.setLineDash([])

      // Title badge in top-left
      const title = frame.title || "Frame Section"
      ctx.font = `bold 12px ${JAPANDI_FONT_FAMILY}`
      const textMetrics = ctx.measureText(title)
      const badgeW = textMetrics.width + 22
      const badgeH = 24

      ctx.fillStyle = atmosphere === "hearth" ? "#262624" : "#f5ebe0"
      ctx.beginPath()
      ctx.roundRect(x + 12, y + 10, badgeW, badgeH, 6)
      ctx.fill()

      ctx.fillStyle = atmosphere === "hearth" ? "#e7e5e4" : "#78350f"
      ctx.textBaseline = "middle"
      ctx.textAlign = "left"
      ctx.fillText(title, x + 23, y + 10 + badgeH / 2)
      ctx.restore()
    } else if (obj.type === "rectangle") {
      if (isLifted) {
        ctx.shadowColor = "rgba(28, 25, 23, 0.16)"
        ctx.shadowBlur = 24
        ctx.shadowOffsetY = 10
      }

      ctx.fillStyle = obj.fill || "#ffffff"
      ctx.strokeStyle = obj.stroke || "#1c1917"
      ctx.lineWidth = obj.strokeWidth || 2

      ctx.beginPath()
      const radius = Math.min(8, w / 2, h / 2)
      ctx.roundRect(x, y, w, h, radius)
      if (obj.fill && obj.fill !== "transparent") ctx.fill()
      ctx.stroke()

      // Render heading/label at top of rectangle
      const label = (obj as any).label || (obj as any).title
      if (label && editingId !== obj.id) {
        ctx.save()
        ctx.font = `bold 11px ${JAPANDI_FONT_FAMILY}`
        const textMetrics = ctx.measureText(label)
        const badgeW = textMetrics.width + 16
        const badgeH = 20
        const badgeX = x + Math.max(4, (w - badgeW) / 2)
        const badgeY = y - badgeH - 3

        ctx.fillStyle = atmosphere === "hearth" ? "rgba(32, 30, 29, 0.95)" : "rgba(250, 248, 245, 0.95)"
        ctx.strokeStyle = atmosphere === "hearth" ? "rgba(231, 229, 228, 0.25)" : "rgba(28, 25, 23, 0.18)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = atmosphere === "hearth" ? "#e7e5e4" : "#1c1917"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(label, badgeX + badgeW / 2, badgeY + badgeH / 2)
        ctx.restore()
      }
    } else if (obj.type === "circle") {
      if (isLifted) {
        ctx.shadowColor = "rgba(28, 25, 23, 0.16)"
        ctx.shadowBlur = 24
        ctx.shadowOffsetY = 10
      }

      ctx.fillStyle = obj.fill || "#ffffff"
      ctx.strokeStyle = obj.stroke || "#1c1917"
      ctx.lineWidth = obj.strokeWidth || 2

      ctx.beginPath()
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
      if (obj.fill && obj.fill !== "transparent") ctx.fill()
      ctx.stroke()

      // Render heading/label at top of circle
      const label = (obj as any).label || (obj as any).title
      if (label && editingId !== obj.id) {
        ctx.save()
        ctx.font = `bold 11px ${JAPANDI_FONT_FAMILY}`
        const textMetrics = ctx.measureText(label)
        const badgeW = textMetrics.width + 16
        const badgeH = 20
        const badgeX = x + (w - badgeW) / 2
        const badgeY = y - badgeH - 4

        ctx.fillStyle = atmosphere === "hearth" ? "rgba(32, 30, 29, 0.95)" : "rgba(250, 248, 245, 0.95)"
        ctx.strokeStyle = atmosphere === "hearth" ? "rgba(231, 229, 228, 0.25)" : "rgba(28, 25, 23, 0.18)"
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 4)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = atmosphere === "hearth" ? "#e7e5e4" : "#1c1917"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(label, badgeX + badgeW / 2, badgeY + badgeH / 2)
        ctx.restore()
      }
    } else if (obj.type === "line") {
      const line = obj as LineObject
      ctx.strokeStyle = obj.stroke || "#c25e3e"
      ctx.lineWidth = obj.strokeWidth || 2.5
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      let p1 = line.points?.[0] || { x, y }
      let p2 = line.points?.[1] || { x: x + w, y: y + h }

      if (line.fromId && objects[line.fromId]) {
        p1 = getAnchorPoint(objects[line.fromId], line.fromAnchor)
      }
      if (line.toId && objects[line.toId]) {
        p2 = getAnchorPoint(objects[line.toId], line.toAnchor)
      }

      const params = computeBezierParams(p1, p2, line.fromAnchor, line.toAnchor)

      // 1. Draw smooth cubic Bezier curve
      ctx.beginPath()
      ctx.moveTo(params.p1.x, params.p1.y)
      ctx.bezierCurveTo(
        params.cp1.x,
        params.cp1.y,
        params.cp2.x,
        params.cp2.y,
        params.p2.x,
        params.p2.y
      )
      ctx.stroke()

      // 2. Arrow head at p2 dynamically angled with curve tangent
      const headLen = 14
      ctx.fillStyle = ctx.strokeStyle
      ctx.beginPath()
      ctx.moveTo(params.p2.x, params.p2.y)
      ctx.lineTo(
        params.p2.x - headLen * Math.cos(params.arrowAngle - Math.PI / 6),
        params.p2.y - headLen * Math.sin(params.arrowAngle - Math.PI / 6)
      )
      ctx.lineTo(
        params.p2.x - headLen * Math.cos(params.arrowAngle + Math.PI / 6),
        params.p2.y - headLen * Math.sin(params.arrowAngle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()

      // 3. Render midpoint relationship label pill badge
      const labelText = line.label?.trim()
      if (labelText && editingId !== line.id) {
        ctx.font = `500 11px ${JAPANDI_FONT_FAMILY}`
        const metrics = ctx.measureText(labelText)
        const pillW = metrics.width + 16
        const pillH = 20
        const pillX = params.midpoint.x - pillW / 2
        const pillY = params.midpoint.y - pillH / 2

        // Frosted vellum pill background
        ctx.fillStyle = atmosphere === "hearth" ? "#20201e" : "#faf9f5"
        ctx.beginPath()
        ctx.roundRect(pillX, pillY, pillW, pillH, 10)
        ctx.fill()

        ctx.strokeStyle = atmosphere === "hearth" ? "#44403c" : "#e7e5e4"
        ctx.lineWidth = 1
        ctx.stroke()

        // Badge label text
        ctx.fillStyle = atmosphere === "hearth" ? "#d6d3d1" : "#57534e"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(labelText, params.midpoint.x, params.midpoint.y)
      } else if (isSelected && !labelText && editingId !== line.id) {
        // Subtle hint chip indicating label can be added
        const hintText = "+ label"
        ctx.font = `10px ${JAPANDI_FONT_FAMILY}`
        const metrics = ctx.measureText(hintText)
        const pillW = metrics.width + 12
        const pillH = 18
        const pillX = params.midpoint.x - pillW / 2
        const pillY = params.midpoint.y - pillH / 2

        ctx.fillStyle = atmosphere === "hearth" ? "#262624" : "#f5ebe0"
        ctx.beginPath()
        ctx.roundRect(pillX, pillY, pillW, pillH, 9)
        ctx.fill()

        ctx.strokeStyle = "#c25e3e"
        ctx.lineWidth = 1
        ctx.setLineDash([2, 2])
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = "#c25e3e"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(hintText, params.midpoint.x, params.midpoint.y)
      }
    } else if (obj.type === "pen") {
      const pen = obj as PenObject
      if (pen.points && pen.points.length > 1) {
        ctx.strokeStyle = obj.stroke || "#1c1917"
        ctx.lineWidth = obj.strokeWidth || 2.5
        ctx.lineCap = "round"
        ctx.lineJoin = "round"

        ctx.beginPath()
        ctx.moveTo(pen.points[0].x, pen.points[0].y)
        for (let i = 1; i < pen.points.length; i++) {
          ctx.lineTo(pen.points[i].x, pen.points[i].y)
        }
        ctx.stroke()
      }
    } else if (obj.type === "sticky-note") {
      const note = obj as StickyNoteObject

      // Elevation Shadow: Deep soft shadow when lifted, warm resting shadow when down
      ctx.shadowColor = isLifted ? "rgba(28, 25, 23, 0.18)" : "rgba(28, 25, 23, 0.08)"
      ctx.shadowBlur = isLifted ? 26 : 10
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = isLifted ? 12 : 3

      // Background note
      ctx.fillStyle = note.color || note.fill || "#fefae0"
      ctx.beginPath()
      const radius = Math.min(8, w / 2, h / 2)
      ctx.roundRect(x, y, w, h, radius)
      ctx.fill()

      // Reset shadow for border and text
      ctx.shadowColor = "transparent"
      ctx.strokeStyle = note.stroke || "rgba(0,0,0,0.06)"
      ctx.lineWidth = 1
      ctx.stroke()

      // Content text with heading hierarchy and line wrapping
      if (editingId !== obj.id) {
        ctx.textAlign = "left"
        ctx.textBaseline = "top"

        const padding = 14
        const maxWidth = w - padding * 2
        const rawLines = (note.content || "").split("\n")
        let curY = y + padding

        rawLines.forEach((rawLine, lineIndex) => {
          const isHeading = lineIndex === 0 && rawLine.trim().length > 0 && (rawLines.length > 1 || rawLine.startsWith("#"))
          const cleanLine = rawLine.startsWith("#") ? rawLine.replace(/^#+\s*/, "") : rawLine

          ctx.font = isHeading
            ? `bold 14.5px ${JAPANDI_FONT_FAMILY}`
            : `13.5px ${JAPANDI_FONT_FAMILY}`
          ctx.fillStyle = isHeading ? "#1c1917" : "#292524"

          const words = cleanLine.split(" ")
          let line = ""
          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " "
            const metrics = ctx.measureText(testLine)
            if (metrics.width > maxWidth && n > 0) {
              ctx.fillText(line, x + padding, curY)
              line = words[n] + " "
              curY += isHeading ? 22 : 20
            } else {
              line = testLine
            }
          }
          ctx.fillText(line, x + padding, curY)
          curY += isHeading ? 24 : 20
        })
      }
    } else if (obj.type === "text") {
      const textObj = obj as TextObject
      if (editingId !== obj.id) {
        ctx.fillStyle = textObj.fill || "#1c1917"
        ctx.font = `${textObj.fontSize || 18}px ${textObj.fontFamily || JAPANDI_FONT_FAMILY}`
        ctx.textAlign = (textObj.textAlign as CanvasTextAlign) || "left"
        ctx.textBaseline = "top"
        ctx.fillText(textObj.content || "", x, y)
      }
    }

    // 3. Draw Bounding Box & Handles if Selected
    if (isSelected) {
      ctx.strokeStyle = "#c25e3e"
      ctx.lineWidth = 1.8
      ctx.setLineDash([4, 4])
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4)
      ctx.setLineDash([])

      const handleRadius = Math.max(5 / zoom, 3.5)
      const handles: Point[] = [
        { x: x - 2, y: y - 2 },
        { x: x + w / 2, y: y - 2 },
        { x: x + w + 2, y: y - 2 },
        { x: x + w + 2, y: y + h / 2 },
        { x: x + w + 2, y: y + h + 2 },
        { x: x + w / 2, y: y + h + 2 },
        { x: x - 2, y: y + h + 2 },
        { x: x - 2, y: y + h / 2 },
      ]

      ctx.fillStyle = "#ffffff"
      ctx.strokeStyle = "#c25e3e"
      ctx.lineWidth = 1.8

      handles.forEach((h) => {
        ctx.beginPath()
        ctx.arc(h.x, h.y, handleRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })
    }

    ctx.restore()
  }

  const getCursorClass = () => {
    if (isSpacePressed || currentTool === "hand") {
      return isInteracting ? "cursor-grabbing" : "cursor-grab"
    }
    if (currentTool === "select") {
      if (interactionMode === "resizing") return "cursor-nwse-resize"
      if (interactionMode === "moving") return "cursor-move"
      return "cursor-default"
    }
    return "cursor-crosshair"
  }

  const offX = Number.isFinite(offsetX) ? offsetX : 0
  const offY = Number.isFinite(offsetY) ? offsetY : 0
  const zoom = Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1
  const bgSize = `${Math.round(26 * zoom)}px ${Math.round(26 * zoom)}px`
  const bgPos = `${Math.round(offX)}px ${Math.round(offY)}px`

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 w-full h-full select-none overflow-hidden ${
        atmosphere === "hearth" ? "atelier-grid-hearth" : "atelier-grid-morning"
      } ${getCursorClass()}`}
      style={{
        backgroundSize: bgSize,
        backgroundPosition: bgPos,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block touch-none" />

      {/* Double-Click Water Drop Ripple Animation */}
      {ripple && (
        <div
          className="absolute w-8 h-8 rounded-full border border-stone-400 bg-stone-300/30 zen-ripple pointer-events-none"
          style={{ left: `${ripple.x}px`, top: `${ripple.y}px` }}
        />
      )}

      {/* Floating Zen Contextual Inspector for Active Selection (Single & Multi-Select) */}
      {!isInteracting && selectedObjectIds.length > 0 && !editingId && (() => {
        if (selectedObjectIds.length === 1) {
          const obj = objects[selectedObjectIds[0]]
          if (!obj) return null
          const screenPos = canvasToScreen(
            obj.x + (obj.width || 100) / 2,
            obj.y - 12
          )
          return (
            <ContextualInspector
              selectedObject={obj}
              screenPosition={screenPos}
              onStartEdit={startEditingObject}
            />
          )
        } else {
          const selectedObjs = selectedObjectIds.map((id) => objects[id]).filter(Boolean)
          if (selectedObjs.length === 0) return null
          const minX = Math.min(...selectedObjs.map((o) => o.x))
          const maxX = Math.max(...selectedObjs.map((o) => o.x + (o.width || 60)))
          const minY = Math.min(...selectedObjs.map((o) => o.y))
          const screenPos = canvasToScreen((minX + maxX) / 2, minY - 12)
          return (
            <ContextualInspector
              selectedIds={selectedObjectIds}
              screenPosition={screenPos}
            />
          )
        }
      })()}

      {/* Floating Inline Text Editor with Tab & Enter Thought Chaining */}
      {editingId && editingPos && (
        <div
          className="absolute z-50"
          style={{
            left: `${editingPos.x}px`,
            top: `${editingPos.y}px`,
            width: `${editingPos.width}px`,
            height: `${editingPos.height}px`,
          }}
        >
          {objects[editingId]?.type === "line" ? (
            <input
              type="text"
              autoFocus
              onFocus={(e) => e.target.select()}
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              onBlur={commitInlineEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  commitInlineEdit()
                }
              }}
              className="w-full h-full px-3 py-1 text-xs font-medium bg-[#faf9f5] text-stone-900 rounded-full shadow-2xl border-2 border-[#c25e3e] outline-none text-center"
              placeholder="e.g. leads to, blocks..."
            />
          ) : objects[editingId]?.type === "frame" ? (
            <input
              type="text"
              autoFocus
              onFocus={(e) => e.target.select()}
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              onBlur={commitInlineEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  commitInlineEdit()
                }
              }}
              className="w-full h-full px-3 py-1 text-xs font-bold bg-[#faf9f5] text-stone-900 rounded-md shadow-2xl border-2 border-[#c25e3e] outline-none text-left"
              placeholder="Frame Title..."
            />
          ) : objects[editingId]?.type === "rectangle" || objects[editingId]?.type === "circle" ? (
            <input
              type="text"
              autoFocus
              onFocus={(e) => e.target.select()}
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              onBlur={commitInlineEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  commitInlineEdit()
                }
              }}
              className="w-full h-full px-2 py-1 text-xs font-bold bg-[#faf9f5] text-stone-900 rounded-md shadow-2xl border-2 border-[#c25e3e] outline-none text-center"
              placeholder="Shape Label..."
            />
          ) : (
            <textarea
              autoFocus
              onFocus={(e) => e.target.select()}
              value={editingContent}
              onChange={(e) => {
                const newContent = e.target.value
                setEditingContent(newContent)
                if (objects[editingId]?.type === "sticky-note") {
                  const reqH = calculateNoteHeight(newContent, objects[editingId].width || 220, 140)
                  setEditingPos((prev) => (prev ? { ...prev, height: Math.max(reqH * (zoomLevel || 1), 100) } : null))
                  updateObject(editingId, { height: reqH, content: newContent } as any)
                }
              }}
              onBlur={commitInlineEdit}
              onKeyDown={(e) => {
                // Tab Thought-Chaining: Spawns the next note 24px to the right and transfers focus!
                if (e.key === "Tab") {
                  e.preventDefault()
                  commitInlineEdit()
                  if (editingId) {
                    const newId = spawnAdjacentNote(editingId, "right")
                    const newObj = useCanvasStore.getState().objects[newId]
                    if (newObj) {
                      setTimeout(() => {
                        const screenPos = canvasToScreen(newObj.x, newObj.y)
                        setEditingId(newId)
                        setEditingContent("")
                        setEditingPos({
                          x: screenPos.x,
                          y: screenPos.y,
                          width: Math.max((newObj.width || 180) * (zoomLevel || 1), 160),
                          height: Math.max((newObj.height || 140) * (zoomLevel || 1), 100),
                        })
                      }, 40)
                    }
                  }
                } else if (e.key === "Enter" && (e.shiftKey || e.ctrlKey || e.metaKey)) {
                  // Enter Thought-Chaining: Spawns the next note directly below!
                  e.preventDefault()
                  commitInlineEdit()
                  if (editingId) {
                    const newId = spawnAdjacentNote(editingId, "down")
                    const newObj = useCanvasStore.getState().objects[newId]
                    if (newObj) {
                      setTimeout(() => {
                        const screenPos = canvasToScreen(newObj.x, newObj.y)
                        setEditingId(newId)
                        setEditingContent("")
                        setEditingPos({
                          x: screenPos.x,
                          y: screenPos.y,
                          width: Math.max((newObj.width || 180) * (zoomLevel || 1), 160),
                          height: Math.max((newObj.height || 140) * (zoomLevel || 1), 100),
                        })
                      }, 40)
                    }
                  }
                } else if (e.key === "Escape") {
                  commitInlineEdit()
                }
              }}
              className="w-full h-full p-3 text-sm bg-white text-stone-900 rounded-lg shadow-2xl border-2 border-stone-800 outline-none resize-none"
              placeholder="Write your thought... (Tab to spawn next)"
            />
          )}
        </div>
      )}

      {/* Peripheral Off-Screen Radar Badges (Atelier Edge Compass) */}
      {!isInteracting &&
        offscreenItems.map((item) => (
          <button
            key={item.id}
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.stopPropagation()
              glideToObject(item.id)
            }}
            style={{
              left: `${item.clampedX}px`,
              top: `${item.clampedY}px`,
              transform: "translate(-50%, -50%)",
            }}
            className="absolute z-40 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#faf9f5]/95 dark:bg-[#201e1d]/95 backdrop-blur-md text-stone-700 dark:text-stone-300 rounded-full border border-stone-300/80 dark:border-stone-700 shadow-xl hover:border-[#c25e3e] hover:text-[#c25e3e] hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            title={`Center view on ${item.title} (${item.distance}px away)`}
          >
            <span
              className="inline-block transition-transform duration-200 text-[#c25e3e] font-bold text-xs"
              style={{ transform: `rotate(${Math.round(item.angle * (180 / Math.PI))}deg)` }}
            >
              ➔
            </span>
            <span className="truncate max-w-[110px] tracking-tight">{item.title}</span>
            <span className="text-[10px] opacity-60 font-mono tracking-tighter">{item.distance}px</span>
          </button>
        ))}

      {/* Top-Right Horizon Radar Badge (Offset below header to prevent overlapping) */}
      {!isInteracting && !editingId && totalOffscreenCount > 0 && (
        <div className="absolute top-[62px] right-4 z-30 flex items-center gap-2">
          <button
            onMouseDown={(e) => {
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (containerRef.current) {
                zoomToFit(containerRef.current.clientWidth, containerRef.current.clientHeight)
                acoustics.playPaperDrop()
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#faf9f5]/90 dark:bg-[#1c1917]/90 backdrop-blur-md border border-stone-300/80 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 shadow-md hover:border-[#c25e3e] hover:text-[#c25e3e] hover:shadow-lg transition-all cursor-pointer"
            title="Frame all objects in atelier (Shift+1)"
          >
            <span className="w-2 h-2 rounded-full bg-[#c25e3e] animate-pulse" />
            <span className="tracking-tight">
              {totalOffscreenCount} {totalOffscreenCount === 1 ? "thought" : "thoughts"} beyond horizon
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-200/80 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              ⇧1 Fit
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
