"use client"

import React from "react"
import { useCanvasStore } from "../../lib/crdt/canvasStore"
import { ToolType } from "../../types"

interface ToolbarProps {
  vertical?: boolean
}

export const CanvasToolbar: React.FC<ToolbarProps> = ({ vertical = false }) => {
  const {
    currentTool,
    setCurrentTool,
    undo,
    redo,
    deleteSelectedObjects,
    selectedObjectIds,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetView,
    zoomToFit,
  } = useCanvasStore()

  const mainTools: Array<{
    id: ToolType
    label: string
    shortcut: string
    icon: React.ReactNode
  }> = [
    {
      id: "select",
      label: "Select",
      shortcut: "V",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 3.5l14 7.5-6.5 1.5-2 6.5L4 3.5z" />
          <path d="M12.5 12.5l5 5" strokeWidth="1.5" />
        </svg>
      ),
    },
    {
      id: "hand",
      label: "Pan Hand",
      shortcut: "H",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 11V6a1.5 1.5 0 0 0-3 0v4m-3-6a1.5 1.5 0 0 0-3 0v6m-3-4a1.5 1.5 0 0 0-3 0v7a6 6 0 0 0 6 6h2.5a6 6 0 0 0 6-6v-5a1.5 1.5 0 0 0-3 0" />
        </svg>
      ),
    },
    {
      id: "sticky-note",
      label: "Sticky Note",
      shortcut: "N",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15.5 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15.5 3z" />
          <path d="M15 3v5h5" />
          <path d="M8 12.5h8M8 16h5" strokeWidth="1.4" />
        </svg>
      ),
    },
    {
      id: "text",
      label: "Text",
      shortcut: "T",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 6.5h14M12 6.5v12M9 18.5h6" />
          <path d="M5 4.5v3M19 4.5v3" strokeWidth="1.4" />
        </svg>
      ),
    },
    {
      id: "frame",
      label: "Artisan Frame",
      shortcut: "F",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" strokeDasharray="3.5 2.5" />
          <path d="M7.5 7.5h4" strokeWidth="1.75" />
        </svg>
      ),
    },
    {
      id: "rectangle",
      label: "Shape",
      shortcut: "R",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5.5" width="17" height="13" rx="3.5" />
          <path d="M8 12h8" strokeWidth="1.3" opacity="0.4" />
        </svg>
      ),
    },
    {
      id: "circle",
      label: "Circle",
      shortcut: "C",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" opacity="0.5" />
        </svg>
      ),
    },
    {
      id: "line",
      label: "Connector Arrow",
      shortcut: "L",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17c4-8 10-8 15.5-2" />
          <path d="M15 15.5l4.5-.5-1-4" />
        </svg>
      ),
    },
    {
      id: "pen",
      label: "Brush Stylus",
      shortcut: "P",
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5L16.5 3.5z" />
          <path d="M14.5 5.5l3 3" strokeWidth="1.4" />
        </svg>
      ),
    },
  ]

  const hasSelection = selectedObjectIds.length > 0

  return (
    <div
      className={`fixed ${
        vertical
          ? "top-1/2 left-4 -translate-y-1/2 flex-col"
          : "bottom-12 left-1/2 -translate-x-1/2 flex-row max-w-[calc(100vw-32px)] overflow-x-auto"
      } z-40 pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#faf9f5]/92 dark:bg-[#1c1a18]/92 backdrop-blur-2xl border border-stone-300/80 dark:border-stone-800 shadow-2xl shadow-stone-900/10 transition-all select-none`}
    >
      {/* Tool items */}
      <div className={`flex ${vertical ? "flex-col" : "flex-row"} items-center gap-1`}>
        {mainTools.map((tool) => {
          const isActive = currentTool === tool.id
          return (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`relative group w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-[#1c1917] text-[#faf9f5] dark:bg-[#faf9f5] dark:text-[#1c1917] shadow-md shadow-stone-900/20 scale-105"
                  : "text-stone-600 dark:text-stone-400 hover:text-[#c25e3e] dark:hover:text-[#e07a5f] hover:bg-stone-200/50 dark:hover:bg-stone-800/60"
              }`}
              title={`${tool.label} (${tool.shortcut})`}
              aria-label={tool.label}
            >
              {tool.icon}
              <span className="pointer-events-none absolute -top-9 px-2 py-1 text-[11px] font-medium tracking-tight rounded-md bg-[#1c1917] text-[#faf9f5] opacity-0 group-hover:opacity-100 transition-opacity shadow-lg whitespace-nowrap">
                {tool.label} <span className="opacity-60 ml-0.5">({tool.shortcut})</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className={`${vertical ? "w-6 h-px my-1" : "w-px h-6 mx-1"} bg-stone-300/70 dark:bg-stone-700/60`} />

      {/* Actions (Undo / Redo / Delete) */}
      <div className={`flex ${vertical ? "flex-col" : "flex-row"} items-center gap-1`}>
        <button
          onClick={undo}
          className="relative group w-9 h-9 flex items-center justify-center rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-all"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 9h9a5 5 0 0 1 5 5v1" />
            <path d="M8.5 5L4.5 9l4 4" />
          </svg>
          <span className="pointer-events-none absolute -top-9 px-2 py-1 text-[11px] font-medium rounded-md bg-[#1c1917] text-[#faf9f5] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Undo (Ctrl+Z)
          </span>
        </button>

        <button
          onClick={redo}
          className="relative group w-9 h-9 flex items-center justify-center rounded-xl text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-all"
          title="Redo (Ctrl+Y)"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19.5 9h-9a5 5 0 0 0-5 5v1" />
            <path d="M15.5 5l4 4-4 4" />
          </svg>
          <span className="pointer-events-none absolute -top-9 px-2 py-1 text-[11px] font-medium rounded-md bg-[#1c1917] text-[#faf9f5] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Redo (Ctrl+Y)
          </span>
        </button>

        {hasSelection && (
          <button
            onClick={deleteSelectedObjects}
            className="relative group w-9 h-9 flex items-center justify-center rounded-xl text-[#c25e3e] hover:text-[#a04629] hover:bg-[#c25e3e]/10 transition-all"
            title="Delete Selected (Backspace)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6.5h16M9 6.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5m2 0V19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6.5" />
              <line x1="10" y1="11" x2="10" y2="16.5" strokeWidth="1.4" />
              <line x1="14" y1="11" x2="14" y2="16.5" strokeWidth="1.4" />
            </svg>
            <span className="pointer-events-none absolute -top-9 px-2 py-1 text-[11px] font-medium rounded-md bg-[#c25e3e] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
              Delete
            </span>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className={`${vertical ? "w-6 h-px my-1" : "w-px h-6 mx-1"} bg-stone-300/70 dark:bg-stone-700/60`} />

      {/* Viewport Zoom controls */}
      <div className="flex items-center gap-1 text-xs text-stone-600 dark:text-stone-300">
        <button
          onClick={zoomOut}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-sm font-semibold transition-colors"
          title="Zoom Out (-)"
        >
          -
        </button>
        <button
          onClick={resetView}
          className="px-2 h-8 flex items-center justify-center rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800/60 font-mono text-[11px] font-medium transition-colors"
          title="Reset View (100%)"
        >
          {Math.round((zoomLevel || 1) * 100)}%
        </button>
        <button
          onClick={zoomIn}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-sm font-semibold transition-colors"
          title="Zoom In (+)"
        >
          +
        </button>
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              zoomToFit(window.innerWidth, window.innerHeight)
            }
          }}
          className="relative group w-8 h-8 flex items-center justify-center rounded-lg hover:bg-stone-200/50 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400 hover:text-[#c25e3e] transition-all ml-0.5"
          title="Fit All in Atelier (Shift+1)"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15.5 3.5h5v5M8.5 20.5H3.5v-5M3.5 8.5v-5h5M20.5 15.5v5h-5" />
          </svg>
          <span className="pointer-events-none absolute -top-9 px-2 py-1 text-[11px] font-medium rounded-md bg-[#1c1917] text-[#faf9f5] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
            Fit All (⇧1)
          </span>
        </button>
      </div>
    </div>
  )
}
