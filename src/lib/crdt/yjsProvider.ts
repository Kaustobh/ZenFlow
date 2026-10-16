// CRDT Provider using Yjs for real-time collaboration
import * as Y from 'yjs'
import { supabase } from '../supabase/client'

export class YjsProvider {
  public boardId: string
  private doc: Y.Doc
  private boardObjects: Y.Map<any>
  private boardCursors: Y.Map<any>
  
  constructor(boardId: string) {
    this.boardId = boardId
    this.doc = new Y.Doc()
    this.boardObjects = this.doc.getMap(`board-${boardId}-objects`)
    this.boardCursors = this.doc.getMap(`board-${boardId}-cursors`)
    
    // Setup event listeners
    this.boardObjects.observe(this.handleObjectsChange.bind(this))
    this.boardCursors.observe(this.handleCursorsChange.bind(this))
  }
  
  private handleObjectsChange(event: Y.YMapEvent<any>) {
    event.changes.keys.forEach((change, key) => {
      if (change.action === 'add' || change.action === 'update') {
        const newValue = this.boardObjects.get(key)
        console.log('Object changed:', key, newValue, change.action)
      } else if (change.action === 'delete') {
        console.log('Object deleted:', key)
      }
    })
  }
  
  private handleCursorsChange(event: Y.YMapEvent<any>) {
    event.changes.keys.forEach((change, key) => {
      if (change.action === 'add' || change.action === 'update') {
        const newValue = this.boardCursors.get(key)
        console.log('Cursor changed:', key, newValue, change.action)
      } else if (change.action === 'delete') {
        console.log('Cursor removed:', key)
      }
    })
  }
  
  // Add an object to the board
  addObject(objectId: string, objectData: any) {
    this.boardObjects.set(objectId, objectData)
  }
  
  // Update an object
  updateObject(objectId: string, objectData: any) {
    this.boardObjects.set(objectId, objectData)
  }
  
  // Delete an object
  deleteObject(objectId: string) {
    this.boardObjects.delete(objectId)
  }
  
  // Update cursor position
  updateCursor(userId: string, cursorData: any) {
    this.boardCursors.set(userId, cursorData)
  }
  
  // Get all objects
  getObjects(): Map<string, any> {
    return new Map(this.boardObjects)
  }
  
  // Get all cursors
  getCursors(): Map<string, any> {
    return new Map(this.boardCursors)
  }
  
  // Destroy the provider
  destroy() {
    this.doc.destroy()
  }
}

// Factory function to create or get a provider for a board
let providerInstance: YjsProvider | null = null

export function getYjsProvider(boardId: string): YjsProvider {
  if (!providerInstance || providerInstance.boardId !== boardId) {
    providerInstance = new YjsProvider(boardId)
  }
  return providerInstance
}

export function setupRealtimeSubscription(boardId: string, callback: (changes: any) => void) {
  try {
    const channel = supabase
      .channel(`board-${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'canvas_objects' },
        (payload) => {
          callback(payload)
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  } catch (err) {
    console.warn('Realtime subscription not available:', err)
    return () => {}
  }
}