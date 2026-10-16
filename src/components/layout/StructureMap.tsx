"use client"

import React from "react"
import { useCanvasStore } from "../../lib/crdt/canvasStore"
import { CanvasObject, FrameObject } from "../../types"
import { KumikoLogo } from "../ui/KumikoLogo"

interface StructureMapProps {
  show: boolean
  onClose: () => void
}

export const StructureMap: React.FC<StructureMapProps> = ({ show, onClose }) => {
  const {
    objects,
    selectedObjectIds,
    selectObject,
    deleteObject,
    centerOnObject,
    zoomToFit,
    clearCanvas,
    loadStarterTemplate,
    atmosphere,
  } = useCanvasStore()

  const objectList = Object.values(objects)

  // Calculate object category counts
  const counts = {
    frames: 0,
    stickyNotes: 0,
    shapes: 0,
    lines: 0,
  }

  objectList.forEach((obj) => {
    if (!obj) return
    if (obj.type === "frame") counts.frames++
    else if (obj.type === "sticky-note") counts.stickyNotes++
    else if (obj.type === "rectangle" || obj.type === "circle") counts.shapes++
    else if (obj.type === "line" || obj.type === "pen") counts.lines++
  })

  const getObjectLabel = (obj: CanvasObject) => {
    if (obj.type === "frame") {
      return (obj as FrameObject).title || "Artisan Frame"
    }
    if (obj.type === "sticky-note") {
      const text = (obj as any).content || ""
      return text.trim() ? text.slice(0, 22) : "Sticky Note"
    }
    if (obj.type === "text") {
      const text = (obj as any).content || ""
      return text.trim() ? text.slice(0, 22) : "Text Box"
    }
    if (obj.type === "rectangle") {
      const label = (obj as any).label || (obj as any).title
      return label?.trim() ? `Shape: ${label.trim().slice(0, 18)}` : `Shape (${obj.width}x${obj.height})`
    }
    if (obj.type === "circle") {
      const label = (obj as any).label || (obj as any).title
      return label?.trim() ? `Circle: ${label.trim().slice(0, 18)}` : `Circle (${obj.width}x${obj.height})`
    }
    if (obj.type === "line") {
      const label = (obj as any).label
      return label?.trim() ? `Arrow: ${label.trim().slice(0, 18)}` : "Connector Arrow"
    }
    if (obj.type === "pen") return "Brush Stroke"
    return "Element"
  }

  const handleSelectObject = (id: string) => {
    selectObject(id)
    if (typeof window !== "undefined") {
      centerOnObject(id, window.innerWidth, window.innerHeight)
    }
  }

  // Calculate simple bounding box for the Birds-Eye stone minimap
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  objectList.forEach((o) => {
    minX = Math.min(minX, o.x)
    minY = Math.min(minY, o.y)
    maxX = Math.max(maxX, o.x + (o.width || 60))
    maxY = Math.max(maxY, o.y + (o.height || 60))
  })
  if (!Number.isFinite(minX)) {
    minX = 0; minY = 0; maxX = 800; maxY = 600
  }
  const spanW = Math.max(maxX - minX, 400)
  const spanH = Math.max(maxY - minY, 300)

  const isHearth = atmosphere === "hearth"

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-80 z-50 flex flex-col ${
        isHearth
          ? "bg-[#181817]/95 border-r border-stone-800 text-stone-200"
          : "bg-[#faf9f5]/95 border-r border-stone-200 text-stone-800"
      } backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out ${
        show ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3.5 border-b ${isHearth ? "border-stone-800" : "border-stone-200/70"}`}>
        <div className="flex items-center gap-2">
          <KumikoLogo size={22} className="shrink-0" theme={atmosphere} />
          <span className="text-sm font-semibold tracking-tight">
            The Scroll Index
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
            isHearth ? "bg-stone-800 text-stone-300" : "bg-stone-200/60 text-stone-700"
          }`}>
            {objectList.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                zoomToFit(window.innerWidth, window.innerHeight)
              }
            }}
            className={`px-2 py-1 flex items-center gap-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
              isHearth ? "text-stone-300 hover:text-stone-100 hover:bg-stone-800" : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
            }`}
            title="Fit All in Atelier (Shift+1)"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" x2="14" y1="3" y2="10" />
              <line x1="3" x2="10" y1="21" y2="14" />
            </svg>
            <span>Fit</span>
          </button>
          <button
            onClick={onClose}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              isHearth ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800" : "text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
            }`}
            title="Close index"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Birds-Eye Stone Minimap */}
      <div className={`p-3 border-b ${isHearth ? "border-stone-800" : "border-stone-200/70"}`}>
        <div className="flex items-center justify-between mb-1.5 text-[11px] font-medium text-stone-500">
          <span>Birds-Eye View</span>
          <span className="text-[10px] opacity-70">Click element to glide</span>
        </div>
        <div
          className={`relative w-full h-28 rounded-xl overflow-hidden border ${
            isHearth ? "border-stone-800 bg-stone-900/60" : "border-stone-300/60 bg-stone-100/50"
          }`}
        >
          <svg className="w-full h-full" viewBox={`${minX - 40} ${minY - 40} ${spanW + 80} ${spanH + 80}`}>
            {objectList.map((o) => {
              const isSelected = selectedObjectIds.includes(o.id)
              if (o.type === "frame") {
                return (
                  <rect
                    key={o.id}
                    x={o.x}
                    y={o.y}
                    width={o.width}
                    height={o.height}
                    fill="none"
                    stroke="#c25e3e"
                    strokeWidth="3"
                    strokeDasharray="6 6"
                    opacity="0.8"
                  />
                )
              }
              return (
                <rect
                  key={o.id}
                  x={o.x}
                  y={o.y}
                  width={Math.max(o.width || 30, 20)}
                  height={Math.max(o.height || 30, 20)}
                  rx="3"
                  fill={
                    isSelected
                      ? "#c25e3e"
                      : o.type === "sticky-note"
                      ? (o as any).color || "#fefae0"
                      : "#a8a29e"
                  }
                  stroke={isSelected ? "#1c1917" : "rgba(0,0,0,0.15)"}
                  strokeWidth="1"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleSelectObject(o.id)}
                />
              )
            })}
          </svg>
        </div>
      </div>

      {/* Overview Stats */}
      <div className={`p-3 grid grid-cols-4 gap-1.5 border-b ${isHearth ? "border-stone-800" : "border-stone-200/70"} text-xs`}>
        <div className={`p-2 rounded-lg border flex flex-col items-center ${
          isHearth ? "bg-stone-900/80 border-stone-800 text-stone-200" : "bg-stone-100/70 border-stone-200/60 text-stone-800"
        }`}>
          <span className="text-stone-400 text-[10px]">Frames</span>
          <span className={`font-bold text-sm ${isHearth ? "text-stone-100" : "text-stone-900"}`}>{counts.frames}</span>
        </div>
        <div className={`p-2 rounded-lg border flex flex-col items-center ${
          isHearth ? "bg-stone-900/80 border-stone-800 text-stone-200" : "bg-stone-100/70 border-stone-200/60 text-stone-800"
        }`}>
          <span className="text-stone-400 text-[10px]">Notes</span>
          <span className={`font-bold text-sm ${isHearth ? "text-stone-100" : "text-stone-900"}`}>{counts.stickyNotes}</span>
        </div>
        <div className={`p-2 rounded-lg border flex flex-col items-center ${
          isHearth ? "bg-stone-900/80 border-stone-800 text-stone-200" : "bg-stone-100/70 border-stone-200/60 text-stone-800"
        }`}>
          <span className="text-stone-400 text-[10px]">Shapes</span>
          <span className={`font-bold text-sm ${isHearth ? "text-stone-100" : "text-stone-900"}`}>{counts.shapes}</span>
        </div>
        <div className={`p-2 rounded-lg border flex flex-col items-center ${
          isHearth ? "bg-stone-900/80 border-stone-800 text-stone-200" : "bg-stone-100/70 border-stone-200/60 text-stone-800"
        }`}>
          <span className="text-stone-400 text-[10px]">Lines</span>
          <span className={`font-bold text-sm ${isHearth ? "text-stone-100" : "text-stone-900"}`}>{counts.lines}</span>
        </div>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {objectList.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            Atelier is clean & quiet.
            <br />
            Place thoughts or select instruments below.
          </div>
        ) : (
          objectList.map((obj) => {
            if (!obj) return null
            const isSelected = selectedObjectIds.includes(obj.id)
            return (
              <div
                key={obj.id}
                onClick={() => handleSelectObject(obj.id)}
                className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? isHearth
                      ? "bg-[#c25e3e]/20 text-stone-100 border border-[#c25e3e]/50 shadow-sm"
                      : "bg-[#c25e3e]/15 text-stone-900 border border-[#c25e3e]/40 shadow-sm"
                    : isHearth
                    ? "hover:bg-stone-800/60 text-stone-300"
                    : "hover:bg-stone-200/60 text-stone-700"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                    style={{
                      backgroundColor:
                        obj.type === "frame"
                          ? "#c25e3e"
                          : obj.type === "sticky-note"
                          ? (obj as any).color || "#fefae0"
                          : obj.stroke || (isHearth ? "#e7e5e4" : "#1c1917"),
                    }}
                  />
                  <span className="text-xs truncate font-medium">
                    {getObjectLabel(obj)}
                  </span>
                  {obj.type === "frame" && (
                    <span className={`text-[9px] uppercase tracking-wider px-1 py-0.2 rounded ${
                      isHearth ? "bg-amber-950/70 text-amber-300 border border-amber-900/60" : "bg-amber-100 text-amber-800"
                    }`}>
                      Frame
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteObject(obj.id)
                  }}
                  className={`w-5 h-5 flex items-center justify-center rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity ${
                    isHearth ? "text-stone-400 hover:text-rose-400" : "text-stone-400 hover:text-rose-600"
                  }`}
                  title="Remove element"
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Actions */}
      <div className={`p-3 border-t ${isHearth ? "border-stone-800" : "border-stone-200/70"} space-y-1.5`}>
        <button
          onClick={loadStarterTemplate}
          className={`w-full py-1.5 px-3 rounded-xl text-xs font-medium border transition-all text-center cursor-pointer ${
            isHearth
              ? "text-stone-300 hover:bg-stone-800 border-stone-700 hover:text-stone-100"
              : "text-stone-700 hover:bg-stone-200/70 border-stone-300/80 hover:text-stone-900"
          }`}
        >
          Reset to Atelier Starter Board
        </button>
        {objectList.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Clear all objects from the whiteboard?")) {
                clearCanvas()
              }
            }}
            className={`w-full py-1.5 px-3 rounded-xl text-xs font-medium border transition-all text-center cursor-pointer ${
              isHearth
                ? "text-rose-400 hover:bg-rose-950/40 border-rose-900/60"
                : "text-rose-700 hover:bg-rose-100/70 border-rose-200/80"
            }`}
          >
            Clear Whiteboard
          </button>
        )}
      </div>
    </aside>
  )
}
