# ZenFlow — RED.md

> Read-Evaluate-Document: current state of the ZenFlow codebase.


## 1. Project Overview

**ZenFlow** is an infinite, collaborative digital canvas inspired by Miro, built with a "zen" aesthetic: minimal UI, monochrome palette, generous whitespace, and calm interactions. It is a Next.js 15 + React 19 application that runs an HTML5 Canvas rendering loop isolated from the React tree, with Zustand for local state and Yjs CRDTs as the foundation for real-time collaboration.

### Mission

Provide a Miro-like infinite canvas experience that feels calm and uncluttered — a "zen" alternative to busy, chrome-heavy whiteboard tools.

### Baseline (Miro-like)

- Infinite canvas with pan and zoom
- Multiple shape types (rectangle, circle, line, sticky note, text, connector)
- Floating toolbar for tool selection
- Structure/sidebar map for navigating objects
- Real-time collaboration foundation (Supabase + Yjs)
- Persistence (localStorage via Zustand persist middleware)

### Differentiation Features

- **Zen aesthetic**: monochrome theme, soft grays, warm zinc, faint borders, generous whitespace, Geist typography
- **Isolated rendering**: requestAnimationFrame canvas loop decoupled from React to prevent re-renders during mouse moves
- **Zen Layout mode**: toggle button (UI only) for auto-snapping grids and collapsible sections
- **Local-first architecture**: prepared for IndexedDB persistence and offline-first sync

### Zen Aesthetic Philosophy

- Monochromatic palette: soft whites (`#fafafa`), deep charcoal texts
- Faint borders (`#e5e5e5`)
- Generous whitespace
- Clean typography (Geist font via `next/font`)
- Interface clutter control (minimal floating toolbar)
- Smooth transitions and micro-interactions
- Calm, distraction-free canvas environment


## 2. Technology Stack

All versions taken from `package.json` at the workspace root.

### Dependencies

| Package | Version |
|---------|---------|
| `next` | `^15.5.5` |
| `react` | `^19.1.0` |
| `react-dom` | `^19.1.0` |
| `@supabase/auth-helpers-nextjs` | `^0.15.0` |
| `@supabase/auth-helpers-react` | `^0.15.0` |
| `@supabase/supabase-js` | `^2.118.0` |
| `canvaskit-wasm` | `^0.42.0` |
| `date-fns` | `^4.4.0` |
| `uuid` | `^14.0.3` |
| `y-websocket` | `^3.1.0` |
| `yjs` | `^13.6.33` |
| `zustand` | `^5.0.15` |

### Dev Dependencies

| Package | Version |
|---------|---------|
| `typescript` | `^5` |
| `tailwindcss` | `^4.3.3` |
| `@tailwindcss/postcss` | `^4.3.3` |
| `eslint` | `^9.39.5` |
| `eslint-config-next` | `15.5.5` |
| `@types/node` | `^20` (installed `^20.19.43`) |
| `@types/react` | `^19` (installed `^19.3.0`) |
| `@types/react-dom` | `^19` (installed `^19.3.0`) |

### Notes

- Tailwind CSS 4 is used (no `tailwind.config.js`; config via `@import "tailwindcss"` and `@theme inline` in `globals.css`).
- `@shopify/react-skia` was considered but not available; the project falls back to basic HTML5 Canvas + `canvaskit-wasm`.
- Two Next.js projects exist: the root project (full dependency set, the active one) and `zen-flow-app/` (a minimal scaffold with only `next`, `react`, `react-dom`).


## 3. Architecture

### Directory Structure

```
zen flow/                          # Root project (active)
├── package.json                   # Full dependency set
├── tsconfig.json                  # strict: false
├── next-env.d.ts
├── IMPLEMENTATION_SUMMARY.md
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout, Geist fonts, metadata
│   │   ├── page.tsx               # Home page (client component)
│   │   ├── globals.css            # Tailwind + CSS variables
│   │   └── favicon.ico
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── ZenCanvas.tsx      # HTML5 canvas rendering engine
│   │   │   └── CanvasToolbar.tsx  # Floating toolbar (horizontal + vertical)
│   │   └── layout/
│   │       └── StructureMap.tsx   # Sidebar: object counts + navigation list
│   ├── lib/
│   │   ├── crdt/
│   │   │   ├── canvasStore.ts     # Zustand store (devtools + persist)
│   │   │   └── yjsProvider.ts     # Simplified Yjs CRDT provider
│   │   └── supabase/
│   │       └── client.ts          # Supabase client singleton
│   └── types/
│       └── index.ts               # TypeScript type definitions
└── .next/                         # Build output
zen-flow-app/                      # Second, minimal Next.js project (scaffold)
```

### Data Flow

1. User interaction (mouse down/move/up, wheel, keyboard) is captured on the `<canvas>` in `ZenCanvas.tsx`.
2. Events update the **Zustand canvas store** (`canvasStore.ts`) directly, bypassing React re-renders during mouse moves.
3. `ZenCanvas` subscribes to store fields (`objects`, `zoomLevel`, `offsetX/Y`, etc.) and redraws via a `requestAnimationFrame` loop.
4. `CanvasToolbar` and `StructureMap` also read from the same store for tool selection and object counts.
5. `page.tsx` wires the keyboard shortcut listener (currently commented out for `setCurrentTool`).
6. `yjsProvider.ts` is a standalone CRDT layer; it is **not** yet wired into the Zustand store or the canvas.

### State Management

- **Zustand** (`zustand ^5.0.15`) with `devtools` and `persist` middleware.
- Store key: `zenflow-canvas-storage`.
- Persisted fields: `objects` and `selectedObjectIds` (partialize).
- Isolated from React: components read via `useCanvasStore()` selectors; the render loop runs independently.
- State shape: `objects` (`Record<string, CanvasObject>`), `selectedObjectIds`, `zoomLevel`, `offsetX/Y`, `currentTool`, `isDrawing`, `lastPoint`, plus actions.

### Rendering Approach

- HTML5 Canvas 2D context (`ctx`) inside `ZenCanvas.tsx`.
- `requestAnimationFrame` loop (`animate` → `drawCanvas`) running continuously.
- Transform: translate to center, scale by `zoomLevel`, translate back — enables pan/zoom.
- Grid drawn at 20px intervals (`#e5e5e5`).
- Six draw functions: `drawRectangle`, `drawCircle`, `drawLine`, `drawStickyNote`, `drawText`, `drawConnector`.
- Selection border drawn as dashed blue rectangle around selected objects.
- Only **rectangle creation** is fully implemented; other shapes have draw functions but no creation flow.

### Sync Architecture

- **Yjs** (`^13.6.33`) CRDT document (`Y.Doc`) with `Y.Map` for objects and cursors.
- `y-websocket` (`^3.1.0`) available but **provider not connected** (no WebSocket server).
- `yjsProvider.ts` sets up local observers and a stub `setupRealtimeSubscription` using Supabase channels (contains a syntax error: smart-quote backtick).
- **Supabase** (`^2.118.0`) client configured via env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no tables exist yet.
- Real-time collaboration via WebRTC/WebSockets is **not implemented**.
- No database schema (`workspaces`, `boards`, `canvas_objects`) exists.


## 4. Implemented Features

- Next.js 15 App Router with React 19 (`"use client"` page).
- Tailwind CSS 4 zen monochrome theme (`#fafafa` / `#0a0a0a`, Geist sans + mono).
- Zustand canvas store with devtools + persist middleware (`localStorage`).
- Yjs CRDT provider (simplified, standalone, not connected).
- HTML5 Canvas rendering engine with zoom (0.2x–5x), pan (offset), and 20px grid.
- 6 object types: `rectangle`, `circle`, `line`, `sticky-note`, `text`, `connector` (draw functions exist for all).
- Floating toolbar (horizontal bottom + vertical left modes) with 7 tools: select, rectangle, circle, line, pen, sticky-note, text — each with keyboard shortcut hint.
- Structure Map sidebar with per-type object counts + object navigation list.
- Keyboard shortcut registration (V/R/C/L/P/N/T) — registered but `setCurrentTool` call commented out.
- Supabase client setup (`src/lib/supabase/client.ts`).
- Status bar with zoom (static "100%"), user ("You"), and online indicators.
- Zen Layout mode toggle button (🧘, UI only — no behavior).
- Show/Hide Structure Map button (🗂️, UI only).
- `crypto.randomUUID()` for object IDs.
- Object drawing: fill, stroke, strokeWidth, opacity, rotation, createdAt/updatedAt, createdBy.
- Sticky note shadow + text content rendering.
- Connector with arrowhead.
- Selection highlight (dashed border).


## 5. Missing / Incomplete Features

- Full CRDT sync (Yjs WebSocket/WebRTC providers not connected).
- Offline-first IndexedDB persistence.
- Auto-reconcile on reconnect.
- Native Action Engine (sticky notes → Kanban/PRD).
- Zen Layout mode (auto-snapping grids, collapsible sections) — button exists, no logic.
- Advanced shape tools (connectors with auto-routing, pen tool).
- Inline text editing on canvas.
- Color variants for sticky notes.
- Workspace invitation system + access control links.
- Guest access with cryptographic session tokens.
- Data export (JSON, Markdown, SVG).
- Custom quadtree for 100k+ objects.
- Sub-millisecond panning.
- Supabase auth fully wired (sign up, login, sessions).
- Database schema (workspaces, boards, canvas_objects tables).
- Real-time collaboration via WebRTC.
- Mouse selection actually working (commented out).
- Wheel zoom actually working (commented out).
- Keyboard shortcuts actually working (commented out).
- Rectangle creation works; other shapes do not.
- Panning via spacebar/middle-click not implemented.
- Trackpad pinch-to-zoom not implemented.


## 6. Known Bugs & Issues

- `src/lib/crdt/canvasStore.ts:115` — `clearSelection`: `set({ selectedObjectIds: [] })` reported as missing closing paren in some versions.
- `src/lib/crdt/yjsProvider.ts:111` — `.channel(`🎫board-`)` uses a smart-quote/backtick mix which would cause a syntax error.
- `src/app/page.tsx` — destructures `currentTool`, `objects`, `selectedObjectIds` but **not** `setCurrentTool`, so the keyboard shortcut handler calls a commented-out undefined function.
- `src/components/canvas/CanvasToolbar.tsx` — keyboard shortcut `setCurrentTool(...)` call is commented out (line 91).
- `src/components/layout/StructureMap.tsx` — close button `onClick` is empty; object navigation `onClick` is commented out (line 118).
- `src/components/canvas/ZenCanvas.tsx` — wheel zoom handler commented out (lines 129–131); mouse selection logic partially commented out (`clearSelection` line 79); only rectangle creation implemented (lines 101–120).
- `src/app/globals.css:25` — `body` uses fallback font `"Arial, Helvetica, sans-serif"` instead of Geist (the `--font-sans` CSS var is set but not applied to `body`).
- `src/app/layout.tsx:16` — metadata title still `"Create Next App"`.
- Two separate Next.js projects exist (root + `zen-flow-app/`) causing confusion about which is the source of truth.
- `tsconfig.json` has `strict: false` (should be `true` for production).


## 7. File-by-File Inventory

### Root project

| Path | Lines | Description |
|------|-------|-------------|
| `package.json` | 36 | Project manifest: dependencies, scripts (`dev`/`build`/`start`/`lint` with turbopack) |
| `tsconfig.json` | 35 | TypeScript config; `strict: false`, `jsx: preserve` |
| `IMPLEMENTATION_SUMMARY.md` | 90 | Implemented vs. remaining features summary |
| `next-env.d.ts` | 6 | Next.js type references |
| `src/app/layout.tsx` | 34 | Root layout; Geist fonts; metadata title "Create Next App" |
| `src/app/page.tsx` | 97 | Home page: canvas, toolbar, structure map, status bar, keyboard shortcuts |
| `src/app/globals.css` | 26 | Tailwind import, CSS variables, body fallback font |
| `src/app/favicon.ico` | — | Favicon (binary) |
| `src/components/canvas/ZenCanvas.tsx` | 461 | HTML5 canvas engine: render loop, zoom/pan/grid, object drawing, rectangle creation |
| `src/components/canvas/CanvasToolbar.tsx` | 155 | Floating toolbar (horizontal/vertical), tool selection, keyboard shortcuts (commented out) |
| `src/components/layout/StructureMap.tsx` | 143 | Sidebar: object type counts + object navigation list |
| `src/lib/crdt/yjsProvider.ts` | 125 | Simplified Yjs CRDT provider + stub Supabase realtime subscription |
| `src/lib/crdt/canvasStore.ts` | 221 | Zustand store: devtools + persist, object/viewport/tool/drawing actions |
| `src/lib/supabase/client.ts` | 6 | Supabase client singleton from env vars |
| `src/types/index.ts` | 143 | TypeScript types: User, Workspace, Board, CanvasObject (6 types), ToolType |

### `zen-flow-app/` (second project)

| Path | Lines | Description |
|------|-------|-------------|
| `zen-flow-app/package.json` | 27 | Minimal manifest: only next/react/react-dom |
| `zen-flow-app/tsconfig.json` | 27 | TypeScript config; `strict: true`, path alias `@/*` |
| `zen-flow-app/next.config.ts` | 7 | Empty Next.js config |
| `zen-flow-app/next-env.d.ts` | 6 | Next.js type references |
| `zen-flow-app/README.md` | 36 | Default create-next-app README |
| `zen-flow-app/eslint.config.mjs` | 25 | ESLint flat config (next/core-web-vitals, next/typescript) |
| `zen-flow-app/postcss.config.mjs` | 5 | PostCSS with `@tailwindcss/postcss` |


## 8. Environment

- **Node.js**: v24.15.0
- **npm**: 11.12.1
- **OS**: Windows
- **Dev server**: `http://localhost:3000` (bound to `0.0.0.0`)
- **Active project**: root directory (C:/Users/Kaust/Downloads/zen flow)
- **Build tool**: Turbopack (`next dev --turbopack`, `next build --turbopack`)


## 9. How to Run

From the workspace root (C:/Users/Kaust/Downloads/zen flow):

```bash
# Install dependencies (if node_modules is missing)
npm install

# Start development server (Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint
npm run lint
```

The dev server runs on `http://localhost:3000`.

> Note: `zen-flow-app/` is a separate, minimal project with its own `node_modules`; run commands there only if targeting that scaffold.


## 10. Key Code Snippets

### Zustand canvas store (`src/lib/crdt/canvasStore.ts`)

```ts
export const useCanvasStore = create<CanvasState>()(
  devtools(
    persist(
      (set, get) => ({
        objects: {},
        selectedObjectIds: [],
        zoomLevel: 1,
        offsetX: 0,
        offsetY: 0,
        currentTool: 'select',
        isDrawing: false,
        lastPoint: null,
        addObject: (object) => {
          set((state) => ({
            objects: { ...state.objects, [object.id]: object }
          }))
        },
        clearSelection: () => {
          set({ selectedObjectIds: [] })
        },
        setCurrentTool: (tool) => {
          set({ currentTool: tool })
        },
        // ...
      }),
      { name: 'zenflow-canvas-storage', partialize: (state) => ({ objects: state.objects, selectedObjectIds: state.selectedObjectIds }) }
    )
  )
)
```

### Canvas render loop + transform (`src/components/canvas/ZenCanvas.tsx`)

```ts
const animate = () => {
  drawCanvas(ctx)
  animationFrameRef.current = requestAnimationFrame(animate)
}

ctx.save()
ctx.translate(offsetX + ctx.canvas.width / 2, offsetY + ctx.canvas.height / 2)
ctx.scale(zoomLevel, zoomLevel)
ctx.translate(-ctx.canvas.width / 2, -ctx.canvas.height / 2)
// ... draw background, grid, objects ...
ctx.restore()
```

### Supabase client (`src/lib/supabase/client.ts`)

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Keyboard shortcut map (`src/app/page.tsx`, commented out)

```ts
const toolMap = {
  v: "select" as const,
  r: "rectangle" as const,
  c: "circle" as const,
  l: "line" as const,
  p: "pen" as const,
  n: "sticky-note" as const,
  t: "text" as const
}
// setCurrentTool(toolMap[key as keyof typeof toolMap]) // Would need to import setCurrentTool
```

### Rectangle creation (`src/components/canvas/ZenCanvas.tsx`)

```ts
if (currentTool === "rectangle" && lastPoint) {
  const width = Math.abs(point.x - lastPoint.x)
  const height = Math.abs(point.y - lastPoint.y)
  const newObject: CanvasObject = {
    id: crypto.randomUUID(),
    type: "rectangle",
    x: Math.min(point.x, lastPoint.x),
    y: Math.min(point.y, lastPoint.y),
    width,
    height,
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 2,
    opacity: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "user-id"
  }
  addObject(newObject)
}
```


---



