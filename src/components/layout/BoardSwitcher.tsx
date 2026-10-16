"use client"

import React, { useState, useRef, useEffect } from "react"
import { useCanvasStore } from "../../lib/crdt/canvasStore"
import { acoustics } from "../../lib/audio/atelierAcoustics"
import { KumikoLogo } from "../ui/KumikoLogo"

interface BoardSwitcherProps {
  isOpen: boolean
  onClose: () => void
}

function formatRelativeTime(isoString: string): string {
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  } catch {
    return "recently"
  }
}

export const BoardSwitcher: React.FC<BoardSwitcherProps> = ({ isOpen, onClose }) => {
  const {
    boards,
    activeBoardId,
    atmosphere,
    switchBoard,
    createBoard,
    renameBoard,
    duplicateBoard,
    deleteBoard,
  } = useCanvasStore()

  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState("")
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const isHearth = atmosphere === "hearth"

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (editingId) {
          setEditingId(null)
        } else if (confirmDeleteId) {
          setConfirmDeleteId(null)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, editingId, confirmDeleteId, onClose])

  if (!isOpen) return null

  const boardList = Object.values(boards || {}).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  const filteredBoards = boardList.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  )

  const handleStartRename = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation()
    setEditingId(id)
    setDraftTitle(title)
  }

  const handleCommitRename = (id: string) => {
    if (draftTitle.trim()) {
      renameBoard(id, draftTitle.trim())
    }
    setEditingId(null)
  }

  const handleSelectBoard = (id: string) => {
    if (id === activeBoardId) {
      onClose()
      return
    }
    acoustics.playBoardSlide()
    switchBoard(id)
    onClose()
  }

  const handleCreate = (template: "blank" | "starter" = "blank") => {
    acoustics.playPaperDrop()
    createBoard(undefined, template)
    setShowTemplateMenu(false)
    onClose()
  }

  const handleDuplicate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    acoustics.playAnchorSnap()
    duplicateBoard(id)
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (boardList.length <= 1) return
    acoustics.playFlingDisintegrate()
    deleteBoard(id)
    setConfirmDeleteId(null)
  }

  return (
    <div
      ref={containerRef}
      className={`absolute top-16 left-4 z-50 w-84 sm:w-96 rounded-2xl shadow-2xl border backdrop-blur-2xl transition-all duration-200 animate-in fade-in zoom-in-95 pointer-events-auto ${
        isHearth
          ? "bg-[#181615]/95 border-stone-800 text-stone-200 shadow-black/60"
          : "bg-[#fbf9f5]/95 border-stone-200/90 text-stone-800 shadow-stone-900/15"
      }`}
      role="dialog"
      aria-label="Zen Plan Board Switcher"
    >
      {/* 1. Header with Kumiko Brand & Action Buttons */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-inherit/40">
        <div className="flex items-center gap-2">
          <KumikoLogo size={18} theme={atmosphere} />
          <div>
            <h3 className="text-xs font-semibold tracking-tight text-inherit flex items-center gap-1.5">
              <span>Zen Plan Boards</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                isHearth ? "bg-stone-800 text-stone-400" : "bg-stone-200/70 text-stone-600"
              }`}>
                {boardList.length}
              </span>
            </h3>
          </div>
        </div>

        {/* New Board Action with Template Menu */}
        <div className="relative">
          <div className="flex items-center rounded-lg overflow-hidden border border-inherit/50">
            <button
              onClick={() => handleCreate("blank")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                isHearth
                  ? "bg-stone-800/80 hover:bg-stone-700 text-stone-100"
                  : "bg-stone-200/80 hover:bg-stone-300 text-stone-800"
              }`}
              title="Create blank whiteboard (Ctrl+Alt+N)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New</span>
            </button>
            <button
              onClick={() => setShowTemplateMenu((prev) => !prev)}
              className={`px-1.5 py-1 text-xs transition-colors border-l border-inherit/50 ${
                isHearth
                  ? "bg-stone-800/80 hover:bg-stone-700 text-stone-300"
                  : "bg-stone-200/80 hover:bg-stone-300 text-stone-700"
              }`}
              title="Choose template"
            >
              ▾
            </button>
          </div>

          {/* Template Menu Dropdown */}
          {showTemplateMenu && (
            <div
              className={`absolute right-0 top-full mt-1.5 w-48 rounded-xl border shadow-xl p-1 z-30 ${
                isHearth ? "bg-[#201e1d] border-stone-700 text-stone-200" : "bg-white border-stone-200 text-stone-800"
              }`}
            >
              <button
                onClick={() => handleCreate("blank")}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-stone-500/10 flex items-center gap-2"
              >
                <span>📄</span>
                <div>
                  <div className="font-medium">Blank Canvas</div>
                  <div className="text-[10px] opacity-60">Clean fresh workspace</div>
                </div>
              </button>
              <button
                onClick={() => handleCreate("starter")}
                className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-stone-500/10 flex items-center gap-2"
              >
                <span>⛩️</span>
                <div>
                  <div className="font-medium">Starter Plan</div>
                  <div className="text-[10px] opacity-60">With notes, frames & shapes</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Search & Filter Input */}
      <div className="p-2.5">
        <div
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-colors ${
            isHearth
              ? "bg-stone-900/60 border-stone-800 focus-within:border-stone-600"
              : "bg-stone-100/70 border-stone-200/80 focus-within:border-stone-400"
          }`}
        >
          <svg className="w-3.5 h-3.5 opacity-50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search your boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-transparent outline-none text-inherit placeholder:opacity-40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-[11px] opacity-50 hover:opacity-100"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 3. Scrollable Boards List */}
      <div className="max-h-64 sm:max-h-72 overflow-y-auto px-2 pb-2 space-y-1">
        {filteredBoards.length === 0 ? (
          <div className="text-center py-6 text-xs opacity-50">
            No boards match &ldquo;{searchQuery}&rdquo;
          </div>
        ) : (
          filteredBoards.map((board) => {
            const isActive = board.id === activeBoardId
            const isEditing = editingId === board.id
            const isConfirmingDelete = confirmDeleteId === board.id
            const objectCount = Object.keys(board.objects || {}).length

            return (
              <div
                key={board.id}
                onClick={() => !isEditing && handleSelectBoard(board.id)}
                className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? isHearth
                      ? "bg-[#252220] border-amber-900/40 text-stone-100 shadow-sm"
                      : "bg-[#f4efe4] border-stone-300 text-stone-950 shadow-sm"
                    : isHearth
                    ? "border-transparent hover:bg-stone-800/40 text-stone-300"
                    : "border-transparent hover:bg-stone-100/70 text-stone-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Active Indicator Pin */}
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                      isActive
                        ? "bg-[#c25e3e] shadow-[0_0_8px_#c25e3e] scale-110"
                        : "bg-stone-400/40 group-hover:scale-90"
                    }`}
                  />

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={draftTitle}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onBlur={() => handleCommitRename(board.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCommitRename(board.id)
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        className="text-xs font-semibold bg-transparent border-b border-stone-500 outline-none w-full text-inherit"
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate">
                            {board.title || "Untitled Plan"}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-mono opacity-50 uppercase tracking-wider">
                              (active)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] opacity-50 flex items-center gap-2 mt-0.5">
                          <span>{objectCount} {objectCount === 1 ? "element" : "elements"}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(board.updatedAt || board.createdAt)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline Actions (Duplicate, Rename, Delete) */}
                {!isEditing && (
                  <div
                    className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 ${
                      isActive ? "opacity-90" : ""
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Rename Button */}
                    <button
                      onClick={(e) => handleStartRename(e, board.id, board.title)}
                      className="p-1 rounded-md hover:bg-stone-500/20 text-inherit/70 hover:text-inherit transition-colors"
                      title="Rename board"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>

                    {/* Duplicate Button */}
                    <button
                      onClick={(e) => handleDuplicate(e, board.id)}
                      className="p-1 rounded-md hover:bg-stone-500/20 text-inherit/70 hover:text-inherit transition-colors"
                      title="Duplicate board"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </button>

                    {/* Delete Button (Protected when only 1 board exists) */}
                    {boardList.length > 1 && (
                      isConfirmingDelete ? (
                        <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-lg p-0.5 animate-in fade-in">
                          <button
                            onClick={(e) => handleDelete(e, board.id)}
                            className="text-[10px] px-1.5 py-0.5 bg-red-600 text-white rounded font-medium hover:bg-red-700"
                            title="Confirm delete"
                          >
                            Delete
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmDeleteId(null)
                            }}
                            className="text-[10px] px-1 py-0.5 hover:bg-stone-500/20 rounded opacity-60"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfirmDeleteId(board.id)
                          }}
                          className="p-1 rounded-md hover:bg-red-500/20 text-inherit/70 hover:text-red-500 transition-colors"
                          title="Delete board"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 4. Footer with Helpful Shortcuts */}
      <div className="px-3.5 py-2 border-t border-inherit/40 flex items-center justify-between text-[10px] opacity-60 font-mono">
        <span><kbd className="px-1 py-0.5 rounded border border-inherit/60">Ctrl+Alt+N</kbd> New Board</span>
        <span><kbd className="px-1 py-0.5 rounded border border-inherit/60">Ctrl+B</kbd> Toggle</span>
      </div>
    </div>
  )
}
