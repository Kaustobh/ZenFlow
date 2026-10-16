"use client"

import React from "react"
import { useCanvasStore } from "../../lib/crdt/canvasStore"
import { CanvasObject, StickyNoteObject } from "../../types"

const ZEN_PALETTE = [
  { name: "Parchment", color: "#fefae0", border: "#e4dfc5" },
  { name: "Pale Sage", color: "#e8f5e9", border: "#c8e6c9" },
  { name: "Mist", color: "#e0f2fe", border: "#bae6fd" },
  { name: "Sakura", color: "#fce7f3", border: "#fbcfe8" },
  { name: "Sand", color: "#f5ebe0", border: "#e6ccb2" },
  { name: "Washi White", color: "#ffffff", border: "#e2e8f0" },
]

interface ContextualInspectorProps {
  selectedObject?: CanvasObject
  selectedIds?: string[]
  screenPosition: { x: number; y: number }
  onStartEdit?: (id: string) => void
}

export const ContextualInspector: React.FC<ContextualInspectorProps> = ({
  selectedObject,
  selectedIds,
  screenPosition,
  onStartEdit,
}) => {
  const {
    updateObject,
    batchUpdateObjects,
    deleteObject,
    deleteSelectedObjects,
    duplicateSelectedObjects,
    atmosphere,
  } = useCanvasStore()

  const isMulti = selectedIds && selectedIds.length > 1
  const isHearth = atmosphere === "hearth"

  const handleColorChange = (color: string) => {
    if (isMulti && selectedIds) {
      batchUpdateObjects(selectedIds, { color, fill: color }, true)
      return
    }
    if (!selectedObject) return
    if (selectedObject.type === "sticky-note") {
      updateObject(
        selectedObject.id,
        {
          color,
          fill: color,
        } as Partial<StickyNoteObject>,
        true
      )
    } else {
      updateObject(
        selectedObject.id,
        {
          fill: color,
        },
        true
      )
    }
  }

  const handleStrokeWidthChange = (width: number) => {
    if (!selectedObject) return
    updateObject(
      selectedObject.id,
      {
        strokeWidth: width,
      },
      true
    )
  }

  const isNearTop = screenPosition.y < 90
  const isNearBottom = typeof window !== "undefined" && screenPosition.y > window.innerHeight - 80

  const halfW = isMulti ? 180 : 225
  const clampedX = typeof window !== "undefined"
    ? Math.max(
        Math.min(halfW, window.innerWidth / 2),
        Math.min(window.innerWidth - Math.min(halfW, window.innerWidth / 2), screenPosition.x)
      )
    : screenPosition.x

  const clampedY = isNearBottom
    ? Math.min(screenPosition.y, typeof window !== "undefined" ? window.innerHeight - 80 : screenPosition.y)
    : screenPosition.y

  if (!isMulti && !selectedObject) return null

  return (
    <div
      className={`absolute z-50 -translate-x-1/2 ${
        isNearTop ? "translate-y-6" : "-translate-y-full mb-3"
      } flex items-center gap-1.5 p-1.5 rounded-2xl backdrop-blur-xl border select-none transition-all shadow-xl max-w-[calc(100vw-24px)] overflow-x-auto ${
        isHearth
          ? "bg-[#1c1a18]/95 border-stone-800 text-stone-200 shadow-black/40"
          : "bg-[#faf9f5]/95 border-stone-200/90 text-stone-800 shadow-stone-900/10"
      }`}
      style={{
        left: `${clampedX}px`,
        top: `${clampedY}px`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 1. Multi-Selection Batch Capsule */}
      {isMulti && selectedIds ? (
        <div className="flex items-center gap-1.5 px-1">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#c25e3e]/15 text-[#c25e3e] text-xs font-semibold whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c25e3e]" />
            <span>{selectedIds.length} thoughts selected</span>
          </div>

          <div className={`w-px h-5 mx-0.5 ${isHearth ? "bg-stone-800" : "bg-stone-200"}`} />

          {/* Quick Batch Palette */}
          <div className="flex items-center gap-1 px-1">
            {ZEN_PALETTE.map((swatch) => (
              <button
                key={swatch.color}
                onClick={() => handleColorChange(swatch.color)}
                className="w-5 h-5 rounded-full transition-transform hover:scale-115 flex items-center justify-center cursor-pointer shrink-0"
                style={{
                  backgroundColor: swatch.color,
                  border: `1px solid ${swatch.border}`,
                }}
                title={`Recolor all to ${swatch.name}`}
              />
            ))}
          </div>

          <div className={`w-px h-5 mx-0.5 ${isHearth ? "bg-stone-800" : "bg-stone-200"}`} />

          {/* Duplicate Batch */}
          <button
            onClick={duplicateSelectedObjects}
            className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors cursor-pointer shrink-0 ${
              isHearth
                ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800"
                : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            }`}
            title="Duplicate all (Ctrl+D)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="8" width="13" height="13" rx="2.5" />
              <path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          {/* Delete Batch */}
          <button
            onClick={deleteSelectedObjects}
            className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors cursor-pointer shrink-0 ${
              isHearth
                ? "text-stone-400 hover:text-rose-400 hover:bg-rose-950/40"
                : "text-stone-400 hover:text-rose-600 hover:bg-rose-50"
            }`}
            title="Delete all (Backspace)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      ) : selectedObject ? (
        <>
          {/* 2. Single Object Palette Swatches */}
          <div className="flex items-center gap-1 px-1">
            {ZEN_PALETTE.map((swatch) => {
              const currentColor = (selectedObject as any).color || selectedObject.fill || "#ffffff"
              const isActive = currentColor === swatch.color
              return (
                <button
                  key={swatch.color}
                  onClick={() => handleColorChange(swatch.color)}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex items-center justify-center cursor-pointer shrink-0 ${
                    isActive ? "ring-2 ring-[#c25e3e] ring-offset-2 ring-offset-transparent scale-105" : ""
                  }`}
                  style={{
                    backgroundColor: swatch.color,
                    border: `1px solid ${swatch.border}`,
                  }}
                  title={swatch.name}
                />
              )
            })}
          </div>

          <div className={`w-px h-5 mx-0.5 ${isHearth ? "bg-stone-800" : "bg-stone-200"}`} />

          {/* Frame Section Title Trigger */}
          {selectedObject.type === "frame" && (
            <>
              <button
                onClick={() => {
                  if (onStartEdit) {
                    onStartEdit(selectedObject.id)
                  } else {
                    const currentTitle = (selectedObject as any).title || "Frame Section"
                    const newTitle = window.prompt("Frame section title:", currentTitle)
                    if (newTitle !== null) {
                      updateObject(selectedObject.id, { title: newTitle.trim() || "Frame" } as any, true)
                    }
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isHearth ? "hover:bg-stone-800/70 text-stone-300" : "hover:bg-stone-100 text-stone-700"
                }`}
                title="Rename Frame Section (or press Enter / F2)"
              >
                <svg className="w-3.5 h-3.5 text-[#c25e3e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span className="max-w-[110px] truncate">
                  {(selectedObject as any).title ? (selectedObject as any).title : "Name Frame"}
                </span>
              </button>
              <div className={`w-px h-5 mx-0.5 ${isHearth ? "bg-stone-800" : "bg-stone-200"}`} />
            </>
          )}

          {/* Rectangle & Circle Shape Label Trigger */}
          {(selectedObject.type === "rectangle" || selectedObject.type === "circle") && (
            <>
              <button
                onClick={() => {
                  if (onStartEdit) {
                    onStartEdit(selectedObject.id)
                  } else {
                    const currentLabel = (selectedObject as any).label || (selectedObject as any).title || ""
                    const newLabel = window.prompt("Shape label / heading:", currentLabel)
                    if (newLabel !== null) {
                      updateObject(selectedObject.id, { label: newLabel.trim() } as any, true)
                    }
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isHearth ? "hover:bg-stone-800/70 text-stone-300" : "hover:bg-stone-100 text-stone-700"
                }`}
                title="Name Shape (or press Enter / F2)"
              >
                <svg className="w-3.5 h-3.5 text-[#c25e3e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span className="max-w-[110px] truncate">
                  {(selectedObject as any).label ? (selectedObject as any).label : "+ Name Shape"}
                </span>
              </button>
              <div className={`w-px h-5 mx-0.5 ${isHearth ? "bg-stone-800" : "bg-stone-200"}`} />
            </>
          )}

          {/* Line Relationship Label Trigger */}
          {selectedObject.type === "line" && (
            <>
              <button
                onClick={() => {
                  if (onStartEdit) {
                    onStartEdit(selectedObject.id)
                  } else {
                    const currentLabel = (selectedObject as any).label || ""
                    const newLabel = window.prompt("Relationship label (e.g. leads to, blocks, validates):", currentLabel)
                    if (newLabel !== null) {
                      updateObject(selectedObject.id, { label: newLabel.trim() } as any, true)
                    }
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isHearth ? "hover:bg-stone-800/70 text-stone-300" : "hover:bg-stone-100 text-stone-700"
                }`}
                title="Edit relationship label (or press Enter / F2)"
              >
                <svg className="w-3.5 h-3.5 text-[#c25e3e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span className="max-w-[110px] truncate">
                  {(selectedObject as any).label ? (selectedObject as any).label : "+ Label"}
                </span>
              </button>
              <div className={`w-px h-5 mx-0.5 ${isHearth ? "bg-stone-800" : "bg-stone-200"}`} />
            </>
          )}

          {/* Sticky Note & Text Edit Trigger */}
          {(selectedObject.type === "sticky-note" || selectedObject.type === "text") && (
            <>
              <button
                onClick={() => {
                  if (onStartEdit) {
                    onStartEdit(selectedObject.id)
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isHearth ? "hover:bg-stone-800/70 text-stone-300" : "hover:bg-stone-100 text-stone-700"
                }`}
                title="Edit Content (or press Enter / F2)"
              >
                <svg className="w-3.5 h-3.5 text-[#c25e3e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Edit</span>
              </button>
              <div className={`w-px h-5 mx-0.5 ${isHearth ? "bg-stone-800" : "bg-stone-200"}`} />
            </>
          )}

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-0.5">
            {[1.5, 2.5, 4].map((width) => {
              const currentWidth = selectedObject.strokeWidth || 2
              const isActive = currentWidth === width
              return (
                <button
                  key={width}
                  onClick={() => handleStrokeWidthChange(width)}
                  className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                    isActive
                      ? isHearth ? "bg-stone-800 text-[#d97757]" : "bg-stone-200/80 text-[#c25e3e]"
                      : isHearth ? "text-stone-500 hover:text-stone-300 hover:bg-stone-800/40" : "text-stone-400 hover:text-stone-700 hover:bg-stone-100/60"
                  }`}
                  title={`Stroke ${width}px`}
                >
                  <div
                    className="bg-current rounded-full"
                    style={{ width: `${width * 2 + 3}px`, height: `${width + 1}px` }}
                  />
                </button>
              )
            })}
          </div>

          <div className={`w-px h-5 mx-0.5 ${isHearth ? "bg-stone-800" : "bg-stone-200"}`} />

          {/* Duplicate Button */}
          <button
            onClick={duplicateSelectedObjects}
            className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isHearth ? "text-stone-400 hover:text-stone-200 hover:bg-stone-800" : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
            }`}
            title="Duplicate (Ctrl+D)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="8" y="8" width="13" height="13" rx="2.5" />
              <path d="M5 16H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
            </svg>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => deleteObject(selectedObject.id)}
            className={`w-7 h-7 flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isHearth ? "text-stone-400 hover:text-rose-400 hover:bg-rose-950/40" : "text-stone-400 hover:text-rose-600 hover:bg-rose-50"
            }`}
            title="Delete (Backspace)"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </>
      ) : null}
    </div>
  )
}
