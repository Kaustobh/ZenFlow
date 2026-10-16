// Core types for ZenFlow application

export type UserId = string
export type WorkspaceId = string
export type BoardId = string
export type ObjectId = string

export interface User {
  id: UserId
  email: string
  name?: string | null
  image_url?: string | null
  created_at: string
  updated_at: string
}

export interface Workspace {
  id: WorkspaceId
  name: string
  owner_id: UserId
  created_at: string
  updated_at: string
}

export interface Board {
  id: BoardId
  workspace_id: WorkspaceId
  title: string
  description?: string | null
  created_by: UserId
  created_at: string
  updated_at: string
}

// Canvas object types
export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export type ToolType = 'select' | 'hand' | 'rectangle' | 'circle' | 'line' | 'pen' | 'sticky-note' | 'text' | 'connector' | 'frame'

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'pen' | 'frame'

export interface BaseObject {
  id: ObjectId
  type: ShapeType | 'sticky-note' | 'text' | 'connector' | 'frame'
  x: number
  y: number
  width: number
  height: number
  rotation?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  opacity?: number
  createdAt: string
  updatedAt: string
  createdBy: UserId
}

export interface RectangleObject extends BaseObject {
  type: 'rectangle'
  label?: string
}

export interface CircleObject extends BaseObject {
  type: 'circle'
  label?: string
}

export interface FrameObject extends BaseObject {
  type: 'frame'
  title: string
}

export interface LineObject extends BaseObject {
  type: 'line'
  points: Point[] // Array of points for the line
  fromId?: ObjectId
  toId?: ObjectId
  fromAnchor?: 'n' | 'e' | 's' | 'w'
  toAnchor?: 'n' | 'e' | 's' | 'w'
  label?: string
  curveStyle?: 'bezier' | 'straight' | 'elbow'
}

export interface PenObject extends BaseObject {
  type: 'pen'
  points: Point[]
}

export interface StickyNoteObject extends BaseObject {
  type: 'sticky-note'
  content: string
  color?: string // washi tone
}

export interface TextObject extends BaseObject {
  type: 'text'
  content: string
  fontSize: number
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
}

export interface ConnectorObject extends BaseObject {
  type: 'connector'
  startPoint: Point
  endPoint: Point
  startConnectedTo?: ObjectId
  endConnectedTo?: ObjectId
  startConnectionPoint?: Point
  endConnectionPoint?: Point
}

export type CanvasObject = 
  | RectangleObject 
  | CircleObject 
  | FrameObject
  | LineObject 
  | PenObject
  | StickyNoteObject 
  | TextObject 
  | ConnectorObject

// CRDT/Yjs types
export interface YWorkspaceState {
  boards: Map<string, YBoardState>
}

export interface YBoardState {
  objects: Map<string, any> // Yjs objects
  cursors: Map<string, any> // User cursors
}

// UI types
export interface ToolbarItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  tooltip?: string
  shortcut?: string
}

export interface ZenLayoutConfig {
  gridSize: number
  snapToGrid: boolean
  showStructureMap: boolean
  structureMapPosition: 'left' | 'right'
}

export interface BoardRecord {
  id: string
  title: string
  objects: Record<string, CanvasObject>
  past?: Record<string, CanvasObject>[]
  future?: Record<string, CanvasObject>[]
  zoomLevel: number
  offsetX: number
  offsetY: number
  atmosphere?: 'morning' | 'hearth'
  createdAt: string
  updatedAt: string
}