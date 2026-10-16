"use client"

import { useState, useEffect, useRef } from "react"
import { ZenCanvas } from "../components/canvas/ZenCanvas"
import { CanvasToolbar } from "../components/canvas/CanvasToolbar"
import { StructureMap } from "../components/layout/StructureMap"
import { useCanvasStore } from "../lib/crdt/canvasStore"
import { acoustics } from "../lib/audio/atelierAcoustics"
import { exportToSVG, exportToMarkdown } from "../lib/export/exportFormats"
import { KumikoLogo } from "../components/ui/KumikoLogo"
import { AtelierLoadingScreen } from "../components/ui/AtelierLoadingScreen"
import { BoardSwitcher } from "../components/layout/BoardSwitcher"

export default function Home() {
  const {
    objects,
    zoomLevel,
    loadStarterTemplate,
    atmosphere,
    setAtmosphere,
    boardTitle,
    setBoardTitle,
    createBoard,
  } = useCanvasStore()

  const [showStructureMap, setShowStructureMap] = useState(false)
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false)
  const [isZenMode, setIsZenMode] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showLoadingScreen, setShowLoadingScreen] = useState(true)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(boardTitle || "Zen Plan")
  const [acousticsActive, setAcousticsActive] = useState(true)

  const exportMenuRef = useRef<HTMLDivElement>(null)
  const settingsMenuRef = useRef<HTMLDivElement>(null)

  // Sync draft title when active board changes
  useEffect(() => {
    setTitleDraft(boardTitle || "Zen Plan")
  }, [boardTitle])

  // Quick keyboard shortcuts for Zen Mode, Board Creation & Switcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key.toLowerCase() === "z" && !e.ctrlKey && !e.metaKey) {
        setIsZenMode((prev) => !prev)
      }
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault()
        acoustics.playPaperDrop()
        createBoard()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b" && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        setShowBoardSwitcher((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [createBoard])

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false)
      }
    }
    if (showExportMenu || showSettingsMenu) {
      window.addEventListener("mousedown", handleClickOutside)
    }
    return () => window.removeEventListener("mousedown", handleClickOutside)
  }, [showExportMenu, showSettingsMenu])

  // Export handlers
  const handleExportPNG = () => {
    const canvas = document.querySelector("canvas")
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `${boardTitle.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
    setShowExportMenu(false)
  }

  const handleExportSVG = () => {
    const svg = exportToSVG(objects, atmosphere)
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" })
    const link = document.createElement("a")
    link.download = `${boardTitle.toLowerCase().replace(/\s+/g, "-")}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
    setShowExportMenu(false)
  }

  const handleExportMarkdown = () => {
    const md = exportToMarkdown(objects, boardTitle)
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" })
    const link = document.createElement("a")
    link.download = `${boardTitle.toLowerCase().replace(/\s+/g, "-")}-outline.md`
    link.href = URL.createObjectURL(blob)
    link.click()
    setShowExportMenu(false)
  }

  const handleToggleAcoustics = () => {
    const next = acoustics.toggleAcoustics()
    setAcousticsActive(next)
    if (next) {
      acoustics.playAnchorSnap()
    }
  }

  const handleCommitTitle = () => {
    setIsEditingTitle(false)
    const trimmed = titleDraft.trim() || "Zen Plan"
    setBoardTitle(trimmed)
  }

  const objectCount = Object.keys(objects).length

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden ${
        atmosphere === "hearth" ? "bg-[#161615] text-[#e7e5e4]" : "bg-[#faf9f5] text-[#1c1917]"
      } font-sans select-none`}
    >
      {/* 0. Serene Quick Entrance Loading Screen */}
      {showLoadingScreen && (
        <AtelierLoadingScreen onComplete={() => setShowLoadingScreen(false)} />
      )}

      {/* 1. Infinite Canvas covers the ENTIRE viewport */}
      <div className="absolute inset-0 w-full h-full z-0">
        <ZenCanvas />
      </div>

      {/* 2. Scroll Index Sidebar */}
      <StructureMap
        show={showStructureMap}
        onClose={() => setShowStructureMap(false)}
      />

      {/* 3. Top Floating Atelier Capsule Header (Hidden in Zen Mode) */}
      {!isZenMode && (
        <header className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between pointer-events-none">
          {/* Left: Scroll Index Toggle & Board Title */}
          <div
            className={`flex items-center gap-2 pointer-events-auto transition-all duration-300 ${
              showStructureMap ? "opacity-0 -translate-x-8 pointer-events-none" : "opacity-100 translate-x-0"
            }`}
          >
            <button
              onClick={() => setShowStructureMap((prev) => !prev)}
              className={`p-2 rounded-xl backdrop-blur-xl border transition-all ${
                showStructureMap
                  ? "bg-stone-900 text-stone-100 border-stone-800 shadow-md"
                  : atmosphere === "hearth"
                  ? "bg-[#20201e]/90 text-stone-200 border-stone-800 hover:bg-[#282825] shadow-sm"
                  : "bg-white/90 text-stone-700 border-stone-200/90 hover:bg-stone-50 shadow-sm"
              }`}
              title="Toggle Scroll Index (Outline)"
              aria-label="Toggle Scroll Index"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            {/* Board Title & Board Switcher Capsule */}
            <div className="relative">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border transition-all ${
                  atmosphere === "hearth"
                    ? "bg-[#20201e]/90 border-stone-800 text-stone-200 shadow-sm"
                    : "bg-white/90 border-stone-200/90 text-stone-900 shadow-sm"
                }`}
              >
                <KumikoLogo size={18} className="shrink-0" theme={atmosphere} />
                {isEditingTitle ? (
                  <input
                    type="text"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={handleCommitTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCommitTitle()
                      if (e.key === "Escape") {
                        setTitleDraft(boardTitle)
                        setIsEditingTitle(false)
                      }
                    }}
                    className="text-xs font-semibold tracking-tight bg-transparent border-b border-stone-400 outline-none w-28 sm:w-36 text-current"
                  />
                ) : (
                  <span
                    onClick={() => {
                      setTitleDraft(boardTitle)
                      setIsEditingTitle(true)
                    }}
                    className="text-xs font-semibold tracking-tight cursor-pointer hover:opacity-80 transition-opacity truncate max-w-[100px] sm:max-w-[180px] md:max-w-[240px] block"
                    title="Click to rename board"
                  >
                    {boardTitle || "Zen Plan"}
                  </span>
                )}

                {/* Switcher Toggle Chevron Button */}
                <button
                  onClick={() => setShowBoardSwitcher((prev) => !prev)}
                  className={`p-1 rounded-md transition-colors ${
                    showBoardSwitcher
                      ? "bg-stone-500/20 text-current"
                      : "opacity-60 hover:opacity-100 hover:bg-stone-500/10"
                  }`}
                  title="Switch or manage whiteboards (Ctrl+B)"
                  aria-label="Switch or manage whiteboards"
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${showBoardSwitcher ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {/* Board Switcher Dropdown */}
              <BoardSwitcher
                isOpen={showBoardSwitcher}
                onClose={() => setShowBoardSwitcher(false)}
              />
            </div>

            {/* Quick "+ New Board" Direct Button */}
            <button
              onClick={() => {
                acoustics.playPaperDrop()
                createBoard()
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
                atmosphere === "hearth"
                  ? "bg-[#20201e]/90 hover:bg-[#282825] text-stone-200 border-stone-800"
                  : "bg-white/90 hover:bg-stone-50 text-stone-800 border-stone-200/90"
              }`}
              title="Create a new blank whiteboard (Ctrl+Alt+N)"
            >
              <svg className="w-3.5 h-3.5 text-[#c25e3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="hidden sm:inline">New Board</span>
            </button>
          </div>

          {/* Right Action Island: Atmosphere, Acoustics, Starter, Export, Zen Focus */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Desktop Atmosphere Mode Switcher (>= md) */}
            <button
              onClick={() => setAtmosphere(atmosphere === "morning" ? "hearth" : "morning")}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
                atmosphere === "hearth"
                  ? "bg-[#20201e]/90 hover:bg-[#282825] text-amber-200 border-stone-800"
                  : "bg-white/90 hover:bg-stone-50 text-stone-700 border-stone-200/90"
              }`}
              title={atmosphere === "morning" ? "Switch to Ink & Hearth (Night atmosphere)" : "Switch to Morning Light (Day atmosphere)"}
            >
              {atmosphere === "morning" ? (
                <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4.5" />
                  <line x1="12" y1="2" x2="12" y2="4.5" />
                  <line x1="12" y1="19.5" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="4.5" y2="12" />
                  <line x1="19.5" y1="12" x2="22" y2="12" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3c-2.5 3-4 6-4 9a4 4 0 0 0 8 0c0-3-1.5-6-4-9z" />
                  <path d="M8 18h8" />
                  <path d="M7 21h10" />
                </svg>
              )}
              <span className="hidden sm:inline">
                {atmosphere === "morning" ? "Morning Light" : "Ink & Hearth"}
              </span>
            </button>

            {/* Desktop Acoustics Feedback Toggle (>= md) */}
            <button
              onClick={handleToggleAcoustics}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
                acousticsActive
                  ? atmosphere === "hearth"
                    ? "bg-[#20201e]/90 text-stone-200 border-stone-800"
                    : "bg-white/90 text-stone-800 border-stone-200/90"
                  : "bg-stone-200/50 text-stone-400 border-stone-300"
              }`}
              title="Toggle tactile acoustic feedback"
            >
              {acousticsActive ? (
                <svg className="w-3.5 h-3.5 text-[#c25e3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9a6 6 0 1 1 12 0v5l2 2H4l2-2V9" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                  <path d="M18 6a6 6 0 0 1 2 3" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9a6 6 0 1 1 12 0v5l2 2H4l2-2V9" />
                  <path d="M10 19a2 2 0 0 0 4 0" />
                  <line x1="3" y1="3" x2="21" y2="21" />
                </svg>
              )}
              <span className="hidden sm:inline">Sound</span>
            </button>

            {/* Desktop Starter Board (>= md) */}
            <button
              onClick={loadStarterTemplate}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
                atmosphere === "hearth"
                  ? "bg-[#20201e]/90 hover:bg-[#282825] text-stone-200 border-stone-800"
                  : "bg-white/90 hover:bg-stone-50 text-stone-700 border-stone-200/90"
              }`}
              title="Reset to clean starter board"
            >
              <svg className="w-3.5 h-3.5 text-[#c25e3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 2.5-6.2L3 8" />
                <polyline points="3 3 3 8 8 8" />
              </svg>
              <span className="hidden sm:inline">Starter Board</span>
            </button>

            {/* Mobile Actions Drawer Toggle (< md) */}
            <div className="relative md:hidden" ref={settingsMenuRef}>
              <button
                onClick={() => setShowSettingsMenu((prev) => !prev)}
                className={`flex items-center justify-center w-8 h-8 rounded-xl backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
                  atmosphere === "hearth"
                    ? "bg-[#20201e]/90 text-stone-200 border-stone-800"
                    : "bg-white/90 text-stone-700 border-stone-200/90"
                }`}
                title="Atelier Settings"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                  <circle cx="5" cy="12" r="1.5" />
                </svg>
              </button>

              {showSettingsMenu && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl border transition-all z-50 flex flex-col gap-0.5 ${
                    atmosphere === "hearth"
                      ? "bg-[#1c1a18]/98 border-stone-800 text-stone-200 shadow-black/40"
                      : "bg-[#faf9f5]/98 border-stone-200 text-stone-800 shadow-stone-900/10"
                  }`}
                >
                  <button
                    onClick={() => {
                      setAtmosphere(atmosphere === "morning" ? "hearth" : "morning")
                      setShowSettingsMenu(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-colors w-full text-left"
                  >
                    {atmosphere === "morning" ? (
                      <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <circle cx="12" cy="12" r="4.5" />
                        <line x1="12" y1="2" x2="12" y2="4.5" />
                        <line x1="12" y1="19.5" x2="12" y2="22" />
                        <line x1="2" y1="12" x2="4.5" y2="12" />
                        <line x1="19.5" y1="12" x2="22" y2="12" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M12 3c-2.5 3-4 6-4 9a4 4 0 0 0 8 0c0-3-1.5-6-4-9z" />
                        <path d="M8 18h8" />
                        <path d="M7 21h10" />
                      </svg>
                    )}
                    <span>{atmosphere === "morning" ? "Morning Light" : "Ink & Hearth"}</span>
                  </button>

                  <button
                    onClick={() => {
                      handleToggleAcoustics()
                      setShowSettingsMenu(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-colors w-full text-left"
                  >
                    <svg className="w-3.5 h-3.5 text-[#c25e3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M6 9a6 6 0 1 1 12 0v5l2 2H4l2-2V9" />
                      <path d="M10 19a2 2 0 0 0 4 0" />
                    </svg>
                    <span>{acousticsActive ? "Tactile Sound: On" : "Tactile Sound: Off"}</span>
                  </button>

                  <button
                    onClick={() => {
                      loadStarterTemplate()
                      setShowSettingsMenu(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-stone-200/50 dark:hover:bg-stone-800/60 transition-colors w-full text-left"
                  >
                    <svg className="w-3.5 h-3.5 text-[#c25e3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M3 12a9 9 0 1 0 2.5-6.2L3 8" />
                      <polyline points="3 3 3 8 8 8" />
                    </svg>
                    <span>Starter Board</span>
                  </button>
                </div>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
                  atmosphere === "hearth"
                    ? "bg-[#20201e]/90 hover:bg-[#282825] text-stone-200 border-stone-800"
                    : "bg-white/90 hover:bg-stone-50 text-stone-700 border-stone-200/90"
                }`}
                title="Export Whiteboard"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                <span>Export</span>
                <span className="text-[10px] opacity-60">▾</span>
              </button>

              {showExportMenu && (
                <div
                  className={`absolute right-0 mt-2 w-52 rounded-2xl p-1.5 shadow-2xl backdrop-blur-2xl border transition-all z-50 ${
                    atmosphere === "hearth"
                      ? "bg-[#1c1a18]/98 border-stone-800 text-stone-200 shadow-black/40"
                      : "bg-[#faf9f5]/98 border-stone-200 text-stone-800 shadow-stone-900/10"
                  }`}
                >
                  <button
                    onClick={handleExportPNG}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-[#c25e3e] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2.5" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <div>
                      <div className="font-medium">Snapshot PNG</div>
                      <div className="text-[10px] text-stone-400">High-resolution image</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportSVG}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-stone-600 dark:text-stone-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="5" height="5" rx="1" />
                      <rect x="16" y="16" width="5" height="5" rx="1" />
                      <path d="M8 5.5h4a6 6 0 0 1 6 6v4" />
                    </svg>
                    <div>
                      <div className="font-medium">Vector SVG</div>
                      <div className="text-[10px] text-stone-400">Infinite resolution vector</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl hover:bg-stone-100/80 dark:hover:bg-stone-800/80 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-stone-600 dark:text-stone-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6h16" />
                      <path d="M7 12h13" />
                      <path d="M4 12h.01" />
                      <path d="M7 18h13" />
                      <path d="M4 18h.01" />
                    </svg>
                    <div>
                      <div className="font-medium">Markdown Outline</div>
                      <div className="text-[10px] text-stone-400">Hierarchical notes & ideas</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Zen Focus Mode Toggle */}
            <button
              onClick={() => setIsZenMode(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-xl border text-xs font-medium transition-all shadow-sm ${
                atmosphere === "hearth"
                  ? "bg-[#20201e]/90 hover:bg-[#282825] text-stone-200 border-stone-800"
                  : "bg-white/90 hover:bg-stone-50 text-stone-700 border-stone-200/90"
              }`}
              title="Zen Focus Mode (Press Z)"
            >
              <svg className="w-3.5 h-3.5 text-[#c25e3e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
              </svg>
              <span className="hidden sm:inline">Focus Mode</span>
            </button>
          </div>
        </header>
      )}

      {/* 4. Floating Exit Capsule for Zen Focus Mode */}
      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          className="absolute top-4 right-4 z-50 px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 backdrop-blur-md text-xs font-medium transition-all shadow-lg border border-stone-700"
          title="Exit Focus Mode (Press Z)"
        >
          Exit Focus (Z)
        </button>
      )}

      {/* 5. Floating Pen Tray Instrument Dock (Hidden in Zen Mode) */}
      {!isZenMode && <CanvasToolbar vertical={false} />}

      {/* 6. Atelier Bottom Status Bar (Hidden in Zen Mode) */}
      {!isZenMode && (
        <footer
          className={`absolute bottom-0 left-0 right-0 h-8 border-t flex items-center justify-between px-4 text-[11px] z-30 pointer-events-none transition-colors ${
            atmosphere === "hearth"
              ? "border-stone-800/80 bg-[#161615]/85 text-stone-400"
              : "border-stone-200/80 bg-[#faf9f5]/85 text-stone-500"
          } backdrop-blur-sm`}
        >
          <div className="flex items-center gap-3 pointer-events-auto">
            <span className="font-mono font-medium">Zoom: {Math.round(zoomLevel * 100)}%</span>
            <span className="w-px h-3 bg-stone-300/60" />
            <span>{objectCount} {objectCount === 1 ? "element" : "elements"}</span>
            <div className="flex items-center gap-1.5 text-[10px] opacity-80">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  atmosphere === "morning" ? "bg-amber-600" : "bg-amber-400"
                }`}
              />
              <span>{atmosphere === "morning" ? "Morning Light" : "Ink & Hearth"}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 pointer-events-auto">
            <span className="hidden sm:inline opacity-75">
              Hold <kbd className="px-1.5 py-0.5 rounded bg-stone-200/60 border border-stone-300 font-mono text-[10px] text-stone-700">Space</kbd> + Drag to Pan &bull; <kbd className="px-1.5 py-0.5 rounded bg-stone-200/60 border border-stone-300 font-mono text-[10px] text-stone-700">Tab</kbd> in note to branch
            </span>
            <span className="w-px h-3 bg-stone-300/60" />
            <div className="flex items-center gap-1.5 font-medium text-[#c25e3e]">
              <span className="w-2 h-2 rounded-full bg-[#c25e3e]" />
              <span>Atelier Active</span>
            </div>
          </div>
        </footer>
      )}
    </main>
  )
}
