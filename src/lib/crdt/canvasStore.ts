// Zustand store for Miro-like canvas state management
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { CanvasObject, ToolType, Point, BoardRecord } from '../../types'

const createDefaultBoardRecord = (
  id = "default-board",
  title = "Zen Plan",
  objects = getStarterObjects()
): BoardRecord => ({
  id,
  title,
  objects,
  past: [],
  future: [],
  zoomLevel: 1,
  offsetX: 0,
  offsetY: 0,
  atmosphere: "morning",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

const getStarterObjects = (): Record<string, CanvasObject> => {
  const now = new Date().toISOString()
  return {
    "workshop-frame": {
      id: "workshop-frame",
      type: "frame",
      title: "Design Atelier & Architecture",
      x: 80,
      y: 60,
      width: 580,
      height: 380,
      stroke: "#c25e3e",
      strokeWidth: 1.5,
      opacity: 0.9,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    },
    "welcome-note": {
      id: "welcome-note",
      type: "sticky-note",
      x: 120,
      y: 120,
      width: 230,
      height: 190,
      color: "#fefae0", // Warm Parchment
      fill: "#fefae0",
      content: "Zen Plan Canvas 🌿\n\n• Double-click to spawn a note\n• Tab in note for thought-chaining\n• Shift+Enter to branch below\n• Keys 1-6 switch paper tones\n• Drag frame to move group",
      stroke: "rgba(0,0,0,0.08)",
      strokeWidth: 1,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    },
    "ideas-note": {
      id: "ideas-note",
      type: "sticky-note",
      x: 390,
      y: 120,
      width: 230,
      height: 190,
      color: "#e8f5e9", // Pale Sage
      fill: "#e8f5e9",
      content: "Living Instruments ✒️\n\n• Kinetic inertia glide\n• Magnetic snap guidelines\n• Tactile elevation physics\n• Vector SVG & Outline export\n• Acoustic feedback",
      stroke: "rgba(0,0,0,0.08)",
      strokeWidth: 1,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    },
    "sample-rect": {
      id: "sample-rect",
      type: "rectangle",
      label: "Design Spec",
      x: 140,
      y: 340,
      width: 170,
      height: 70,
      fill: "#ffffff",
      stroke: "#1c1917",
      strokeWidth: 2,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    },
    "sample-arrow": {
      id: "sample-arrow",
      type: "line",
      x: 310,
      y: 375,
      width: 110,
      height: 0,
      points: [
        { x: 310, y: 375 },
        { x: 420, y: 375 },
      ],
      fromId: "sample-rect",
      toId: "sample-circle",
      fromAnchor: "e",
      toAnchor: "w",
      label: "transforms into",
      curveStyle: "bezier",
      stroke: "#c25e3e",
      strokeWidth: 2.5,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    },
    "sample-circle": {
      id: "sample-circle",
      type: "circle",
      label: "Production",
      x: 420,
      y: 340,
      width: 70,
      height: 70,
      fill: "#ffffff",
      stroke: "#1c1917",
      strokeWidth: 2,
      opacity: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
    },
  }
}

interface CanvasState {
  objects: Record<string, CanvasObject>
  selectedObjectIds: string[]
  zoomLevel: number
  offsetX: number
  offsetY: number
  currentTool: ToolType
  isDrawing: boolean
  lastPoint: Point | null
  past: Record<string, CanvasObject>[]
  future: Record<string, CanvasObject>[]

  saveSnapshot: () => void
  addObject: (object: CanvasObject) => void
  updateObject: (id: string, updates: Partial<CanvasObject>, recordHistory?: boolean) => void
  batchUpdateObjects: (ids: string[], updates: Partial<CanvasObject>, recordHistory?: boolean) => void
  deleteObject: (id: string) => void
  deleteSelectedObjects: () => void
  selectObject: (id: string, additive?: boolean) => void
  selectMultipleObjects: (ids: string[]) => void
  selectAll: () => void
  clearSelection: () => void
  duplicateSelectedObjects: () => void
  clearCanvas: () => void
  loadStarterTemplate: () => void

  setZoomLevel: (level: number) => void
  setOffset: (x: number, y: number) => void
  panBy: (dx: number, dy: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetView: () => void
  zoomToFit: (viewportWidth: number, viewportHeight: number) => void
  centerOnObject: (id: string, viewportWidth: number, viewportHeight: number) => void

  setCurrentTool: (tool: ToolType) => void
  startDrawing: (point: Point) => void
  stopDrawing: () => void
  updateDrawingPoint: (point: Point) => void

  updateObjectPosition: (id: string, x: number, y: number) => void
  updateObjectSize: (id: string, width: number, height: number) => void
  updateObjectRotation: (id: string, rotation: number) => void

  atmosphere: "morning" | "hearth"
  boardTitle: string
  setAtmosphere: (mode: "morning" | "hearth") => void
  setBoardTitle: (title: string) => void
  spawnAdjacentNote: (sourceId: string, direction: "right" | "down") => string

  activeBoardId: string
  boards: Record<string, BoardRecord>
  createBoard: (title?: string, template?: "blank" | "starter") => string
  switchBoard: (boardId: string) => void
  renameBoard: (boardId: string, newTitle: string) => void
  duplicateBoard: (boardId: string) => string
  deleteBoard: (boardId: string) => void

  updateMultipleObjects: (updates: { id: string; x: number; y: number }[]) => void

  undo: () => void
  redo: () => void
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    persist(
      (set, get) => ({
        objects: getStarterObjects(),
        selectedObjectIds: [],
        zoomLevel: 1,
        offsetX: 0,
        offsetY: 0,
        currentTool: 'select',
        isDrawing: false,
        lastPoint: null,
        past: [],
        future: [],
        atmosphere: "morning",
        boardTitle: "Zen Plan",
        activeBoardId: "default-board",
        boards: {
          "default-board": createDefaultBoardRecord(),
        },

        setAtmosphere: (mode) =>
          set((state) => {
            const currentBoard = state.boards[state.activeBoardId]
            return {
              atmosphere: mode,
              boards: currentBoard
                ? {
                    ...state.boards,
                    [state.activeBoardId]: {
                      ...currentBoard,
                      atmosphere: mode,
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : state.boards,
            }
          }),

        setBoardTitle: (title) =>
          set((state) => {
            const currentBoard = state.boards[state.activeBoardId]
            return {
              boardTitle: title,
              boards: currentBoard
                ? {
                    ...state.boards,
                    [state.activeBoardId]: {
                      ...currentBoard,
                      title,
                      updatedAt: new Date().toISOString(),
                    },
                  }
                : state.boards,
            }
          }),

        createBoard: (title, template = "blank") => {
          const { activeBoardId, boards, objects, past, future, zoomLevel, offsetX, offsetY, atmosphere, boardTitle } = get()
          const now = new Date().toISOString()
          
          // 1. Snapshot current active board
          const currentBoardSnapshot: BoardRecord = {
            id: activeBoardId,
            title: boardTitle,
            objects,
            past,
            future,
            zoomLevel,
            offsetX,
            offsetY,
            atmosphere,
            createdAt: boards[activeBoardId]?.createdAt || now,
            updatedAt: now,
          }

          // 2. Generate new board
          const newId = `board-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          const newTitle = title || `Untitled Plan ${Object.keys(boards).length + 1}`
          const newObjects = template === "starter" ? getStarterObjects() : {}

          const newBoard: BoardRecord = {
            id: newId,
            title: newTitle,
            objects: newObjects,
            past: [],
            future: [],
            zoomLevel: 1,
            offsetX: 0,
            offsetY: 0,
            atmosphere,
            createdAt: now,
            updatedAt: now,
          }

          set({
            boards: {
              ...boards,
              [activeBoardId]: currentBoardSnapshot,
              [newId]: newBoard,
            },
            activeBoardId: newId,
            boardTitle: newTitle,
            objects: newObjects,
            selectedObjectIds: [],
            past: [],
            future: [],
            zoomLevel: 1,
            offsetX: 0,
            offsetY: 0,
          })

          return newId
        },

        switchBoard: (targetId) => {
          const { activeBoardId, boards, objects, past, future, zoomLevel, offsetX, offsetY, atmosphere, boardTitle } = get()
          if (targetId === activeBoardId) return
          const targetBoard = boards[targetId]
          if (!targetBoard) return

          const now = new Date().toISOString()
          const currentBoardSnapshot: BoardRecord = {
            id: activeBoardId,
            title: boardTitle,
            objects,
            past,
            future,
            zoomLevel,
            offsetX,
            offsetY,
            atmosphere,
            createdAt: boards[activeBoardId]?.createdAt || now,
            updatedAt: now,
          }

          set({
            boards: {
              ...boards,
              [activeBoardId]: currentBoardSnapshot,
            },
            activeBoardId: targetId,
            boardTitle: targetBoard.title,
            objects: targetBoard.objects || {},
            selectedObjectIds: [],
            past: targetBoard.past || [],
            future: targetBoard.future || [],
            zoomLevel: targetBoard.zoomLevel ?? 1,
            offsetX: targetBoard.offsetX ?? 0,
            offsetY: targetBoard.offsetY ?? 0,
            atmosphere: targetBoard.atmosphere || atmosphere,
          })
        },

        renameBoard: (boardId, newTitle) => {
          set((state) => {
            const target = state.boards[boardId]
            if (!target) return state
            const updated = {
              ...state.boards,
              [boardId]: {
                ...target,
                title: newTitle,
                updatedAt: new Date().toISOString(),
              },
            }
            return {
              boards: updated,
              boardTitle: boardId === state.activeBoardId ? newTitle : state.boardTitle,
            }
          })
        },

        duplicateBoard: (boardId) => {
          const { boards, activeBoardId, objects, past, future, zoomLevel, offsetX, offsetY, atmosphere, boardTitle } = get()
          const now = new Date().toISOString()
          const sourceBoard = boardId === activeBoardId ? {
            id: activeBoardId,
            title: boardTitle,
            objects,
            past,
            future,
            zoomLevel,
            offsetX,
            offsetY,
            atmosphere,
            createdAt: boards[activeBoardId]?.createdAt || now,
            updatedAt: now,
          } : boards[boardId]

          if (!sourceBoard) return ""

          const newId = `board-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
          const newTitle = `${sourceBoard.title} (Copy)`
          
          const clonedObjects: Record<string, CanvasObject> = {}
          Object.values(sourceBoard.objects).forEach((o) => {
            const freshId = `${o.type}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
            clonedObjects[freshId] = {
              ...o,
              id: freshId,
              x: o.x + 30,
              y: o.y + 30,
              updatedAt: now,
            }
          })

          const newBoard: BoardRecord = {
            ...sourceBoard,
            id: newId,
            title: newTitle,
            objects: clonedObjects,
            past: [],
            future: [],
            createdAt: now,
            updatedAt: now,
          }

          set((state) => ({
            boards: {
              ...state.boards,
              [newId]: newBoard,
            },
          }))

          return newId
        },

        deleteBoard: (boardId) => {
          const { boards, activeBoardId } = get()
          const boardKeys = Object.keys(boards)
          if (boardKeys.length <= 1) {
            return
          }

          const newBoards = { ...boards }
          delete newBoards[boardId]

          if (boardId === activeBoardId) {
            const nextRemainingId = Object.keys(newBoards)[0]
            const nextBoard = newBoards[nextRemainingId]
            set({
              boards: newBoards,
              activeBoardId: nextRemainingId,
              boardTitle: nextBoard.title,
              objects: nextBoard.objects || {},
              selectedObjectIds: [],
              past: nextBoard.past || [],
              future: nextBoard.future || [],
              zoomLevel: nextBoard.zoomLevel ?? 1,
              offsetX: nextBoard.offsetX ?? 0,
              offsetY: nextBoard.offsetY ?? 0,
              atmosphere: nextBoard.atmosphere || "morning",
            })
          } else {
            set({ boards: newBoards })
          }
        },

        updateMultipleObjects: (updates) => {
          set((state) => {
            const newObjects = { ...state.objects }
            const now = new Date().toISOString()
            updates.forEach(({ id, x, y }) => {
              if (newObjects[id]) {
                newObjects[id] = {
                  ...newObjects[id],
                  x,
                  y,
                  updatedAt: now,
                }
              }
            })
            return { objects: newObjects }
          })
        },

        spawnAdjacentNote: (sourceId, direction) => {
          const { objects } = get()
          const source = objects[sourceId]
          const now = new Date().toISOString()
          const newId = crypto.randomUUID()

          const defaultW = 220
          const defaultH = 160
          const gap = 24

          let newX = 100
          let newY = 100
          let color = "#fefae0"

          if (source) {
            color = (source as any).color || source.fill || "#fefae0"
            if (direction === "right") {
              newX = source.x + (source.width || defaultW) + gap
              newY = source.y
            } else {
              newX = source.x
              newY = source.y + (source.height || defaultH) + gap
            }
          }

          const newNote: CanvasObject = {
            id: newId,
            type: "sticky-note",
            x: Math.round(newX),
            y: Math.round(newY),
            width: source ? source.width : defaultW,
            height: source ? source.height : defaultH,
            color,
            fill: color,
            content: "",
            stroke: "rgba(0,0,0,0.08)",
            strokeWidth: 1,
            opacity: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: "user",
          }

          set((state) => ({
            past: [...state.past.slice(-25), state.objects],
            future: [],
            objects: {
              ...state.objects,
              [newId]: newNote,
            },
            selectedObjectIds: [newId],
          }))

          return newId
        },

        saveSnapshot: () => {
          set((state) => ({
            past: [...state.past.slice(-25), state.objects],
            future: [],
          }))
        },

        addObject: (object) => {
          const current = get().objects
          set((state) => ({
            past: [...state.past.slice(-25), current],
            future: [],
            objects: {
              ...state.objects,
              [object.id]: object,
            },
            selectedObjectIds: [object.id],
          }))
        },

        updateObject: (id, updates, recordHistory = false) => {
          set((state) => {
            const currentObj = state.objects[id]
            if (!currentObj) return state
            return {
              past: recordHistory ? [...state.past.slice(-25), state.objects] : state.past,
              future: recordHistory ? [] : state.future,
              objects: {
                ...state.objects,
                [id]: {
                  ...currentObj,
                  ...updates,
                  updatedAt: new Date().toISOString(),
                } as CanvasObject,
              },
            }
          })
        },

        batchUpdateObjects: (ids, updates, recordHistory = true) => {
          set((state) => {
            const newObjects = { ...state.objects }
            const now = new Date().toISOString()
            ids.forEach((id) => {
              if (newObjects[id]) {
                newObjects[id] = {
                  ...newObjects[id],
                  ...updates,
                  updatedAt: now,
                } as CanvasObject
              }
            })
            return {
              past: recordHistory ? [...state.past.slice(-25), state.objects] : state.past,
              future: recordHistory ? [] : state.future,
              objects: newObjects,
            }
          })
        },

        deleteObject: (id) => {
          const current = get().objects
          set((state) => {
            const newObjects = { ...state.objects }
            delete newObjects[id]
            // Eliminate dangling arrows pointing to nowhere
            Object.keys(newObjects).forEach((otherId) => {
              const other = newObjects[otherId]
              if (other?.type === "line" && (other.fromId === id || other.toId === id)) {
                delete newObjects[otherId]
              }
            })
            return {
              past: [...state.past.slice(-20), current],
              future: [],
              objects: newObjects,
              selectedObjectIds: state.selectedObjectIds.filter((selectedId) => selectedId !== id),
            }
          })
        },

        deleteSelectedObjects: () => {
          const { objects, selectedObjectIds } = get()
          if (selectedObjectIds.length === 0) return
          const newObjects = { ...objects }
          const deletedSet = new Set(selectedObjectIds)
          selectedObjectIds.forEach((id) => {
            delete newObjects[id]
          })
          // Eliminate dangling arrows pointing to nowhere
          Object.keys(newObjects).forEach((otherId) => {
            const other = newObjects[otherId]
            if (other?.type === "line" && (deletedSet.has(other.fromId || "") || deletedSet.has(other.toId || ""))) {
              delete newObjects[otherId]
            }
          })
          set((state) => ({
            past: [...state.past.slice(-20), objects],
            future: [],
            objects: newObjects,
            selectedObjectIds: [],
          }))
        },

        selectObject: (id, additive = false) => {
          set((state) => {
            if (additive) {
              const alreadySelected = state.selectedObjectIds.includes(id)
              return {
                selectedObjectIds: alreadySelected
                  ? state.selectedObjectIds.filter((item) => item !== id)
                  : [...state.selectedObjectIds, id],
              }
            }
            return { selectedObjectIds: [id] }
          })
        },

        selectMultipleObjects: (ids) => {
          set({ selectedObjectIds: ids })
        },

        selectAll: () => {
          set((state) => ({
            selectedObjectIds: Object.keys(state.objects),
          }))
        },

        clearSelection: () => {
          set({ selectedObjectIds: [] })
        },

        duplicateSelectedObjects: () => {
          const { objects, selectedObjectIds } = get()
          if (selectedObjectIds.length === 0) return

          const newObjects = { ...objects }
          const newSelectedIds: string[] = []

          selectedObjectIds.forEach((id) => {
            const original = objects[id]
            if (!original) return
            const newId = crypto.randomUUID()
            const clone = {
              ...original,
              id: newId,
              x: original.x + 24,
              y: original.y + 24,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
            newObjects[newId] = clone as CanvasObject
            newSelectedIds.push(newId)
          })

          set((state) => ({
            past: [...state.past.slice(-20), objects],
            future: [],
            objects: newObjects,
            selectedObjectIds: newSelectedIds,
          }))
        },

        clearCanvas: () => {
          const current = get().objects
          set((state) => ({
            past: [...state.past.slice(-20), current],
            future: [],
            objects: {},
            selectedObjectIds: [],
          }))
        },

        loadStarterTemplate: () => {
          set({
            objects: getStarterObjects(),
            selectedObjectIds: [],
            zoomLevel: 1,
            offsetX: 0,
            offsetY: 0,
            past: [],
            future: [],
          })
        },

        setZoomLevel: (level) => {
          const clamped = Math.min(Math.max(level || 1, 0.15), 4)
          set({ zoomLevel: Number(clamped.toFixed(2)) })
        },

        setOffset: (x, y) => {
          set({ offsetX: Number.isFinite(x) ? x : 0, offsetY: Number.isFinite(y) ? y : 0 })
        },

        panBy: (dx, dy) => {
          if (!Number.isFinite(dx) || !Number.isFinite(dy)) return
          set((state) => ({
            offsetX: state.offsetX + dx,
            offsetY: state.offsetY + dy,
          }))
        },

        zoomIn: () => {
          set((state) => ({
            zoomLevel: Math.min(Number((state.zoomLevel * 1.2).toFixed(2)), 4),
          }))
        },

        zoomOut: () => {
          set((state) => ({
            zoomLevel: Math.max(Number((state.zoomLevel / 1.2).toFixed(2)), 0.15),
          }))
        },

        resetView: () => {
          set({ zoomLevel: 1, offsetX: 0, offsetY: 0 })
        },

        zoomToFit: (viewportWidth, viewportHeight) => {
          const objectList = Object.values(get().objects)
          if (objectList.length === 0) {
            set({ zoomLevel: 1, offsetX: 0, offsetY: 0 })
            return
          }

          let minX = Infinity
          let minY = Infinity
          let maxX = -Infinity
          let maxY = -Infinity

          objectList.forEach((obj) => {
            if (!obj) return
            const w = obj.width || 60
            const h = obj.height || 60
            minX = Math.min(minX, obj.x)
            minY = Math.min(minY, obj.y)
            maxX = Math.max(maxX, obj.x + w)
            maxY = Math.max(maxY, obj.y + h)
          })

          if (!Number.isFinite(minX)) {
            set({ zoomLevel: 1, offsetX: 0, offsetY: 0 })
            return
          }

          const padding = 90
          const contentW = Math.max(maxX - minX, 100)
          const contentH = Math.max(maxY - minY, 100)
          const availableW = Math.max(viewportWidth - padding * 2, 200)
          const availableH = Math.max(viewportHeight - padding * 2, 200)
          const scaleX = availableW / contentW
          const scaleY = availableH / contentH
          const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.2), 1.4)
          const roundedZoom = Number(targetZoom.toFixed(2))

          const centerX = (minX + maxX) / 2
          const centerY = (minY + maxY) / 2

          set({
            zoomLevel: roundedZoom,
            offsetX: Math.round(viewportWidth / 2 - centerX * roundedZoom),
            offsetY: Math.round(viewportHeight / 2 - centerY * roundedZoom),
          })
        },

        centerOnObject: (id, viewportWidth, viewportHeight) => {
          const obj = get().objects[id]
          if (!obj) return
          const zoom = get().zoomLevel || 1
          const centerX = obj.x + (obj.width || 100) / 2
          const centerY = obj.y + (obj.height || 100) / 2
          set({
            offsetX: Math.round(viewportWidth / 2 - centerX * zoom),
            offsetY: Math.round(viewportHeight / 2 - centerY * zoom),
            selectedObjectIds: [id],
          })
        },

        setCurrentTool: (tool) => {
          set({ currentTool: tool })
        },

        startDrawing: (point) => {
          set({ isDrawing: true, lastPoint: point })
        },

        stopDrawing: () => {
          set({ isDrawing: false, lastPoint: null })
        },

        updateDrawingPoint: (point) => {
          set({ lastPoint: point })
        },

        updateObjectPosition: (id, x, y) => {
          set((state) => {
            const obj = state.objects[id]
            if (!obj) return state
            return {
              objects: {
                ...state.objects,
                [id]: {
                  ...obj,
                  x,
                  y,
                  updatedAt: new Date().toISOString(),
                },
              },
            }
          })
        },

        updateObjectSize: (id, width, height) => {
          set((state) => {
            const obj = state.objects[id]
            if (!obj) return state
            return {
              objects: {
                ...state.objects,
                [id]: {
                  ...obj,
                  width,
                  height,
                  updatedAt: new Date().toISOString(),
                },
              },
            }
          })
        },

        updateObjectRotation: (id, rotation) => {
          set((state) => {
            const obj = state.objects[id]
            if (!obj) return state
            return {
              objects: {
                ...state.objects,
                [id]: {
                  ...obj,
                  rotation,
                  updatedAt: new Date().toISOString(),
                },
              },
            }
          })
        },

        undo: () => {
          const { past, future, objects } = get()
          if (past.length === 0) return
          const previous = past[past.length - 1]
          const newPast = past.slice(0, past.length - 1)
          set({
            objects: previous,
            past: newPast,
            future: [objects, ...future],
            selectedObjectIds: [],
          })
        },

        redo: () => {
          const { past, future, objects } = get()
          if (future.length === 0) return
          const next = future[0]
          const newFuture = future.slice(1)
          set({
            objects: next,
            past: [...past, objects],
            future: newFuture,
            selectedObjectIds: [],
          })
        },
      }),
      {
        name: 'zenflow-whiteboard-v3', // Clean key to purge any stale buggy state
        partialize: (state) => {
          const currentBoard: BoardRecord = {
            id: state.activeBoardId,
            title: state.boardTitle,
            objects: state.objects,
            past: state.past,
            future: state.future,
            zoomLevel: state.zoomLevel,
            offsetX: state.offsetX,
            offsetY: state.offsetY,
            atmosphere: state.atmosphere,
            createdAt: state.boards[state.activeBoardId]?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          return {
            activeBoardId: state.activeBoardId,
            boards: {
              ...state.boards,
              [state.activeBoardId]: currentBoard,
            },
            objects: state.objects,
            selectedObjectIds: state.selectedObjectIds,
            zoomLevel: state.zoomLevel,
            offsetX: state.offsetX,
            offsetY: state.offsetY,
            atmosphere: state.atmosphere,
            boardTitle: state.boardTitle,
          }
        },
        onRehydrateStorage: () => (state) => {
          if (state) {
            if (!state.boards || Object.keys(state.boards).length === 0) {
              const defaultId = state.activeBoardId || "default-board"
              const defaultRecord: BoardRecord = {
                id: defaultId,
                title: state.boardTitle || "Zen Plan",
                objects: state.objects || getStarterObjects(),
                past: state.past || [],
                future: state.future || [],
                zoomLevel: state.zoomLevel ?? 1,
                offsetX: state.offsetX ?? 0,
                offsetY: state.offsetY ?? 0,
                atmosphere: state.atmosphere || "morning",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              state.boards = { [defaultId]: defaultRecord }
              state.activeBoardId = defaultId
            }
          }
        },
      }
    )
  )
)