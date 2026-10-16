// Clean Vector SVG & Markdown Exporters for ZenFlow Atelier
import { CanvasObject, StickyNoteObject, TextObject, FrameObject, LineObject } from "../../types"

export function exportToMarkdown(objects: Record<string, CanvasObject>, boardTitle: string): string {
  const objectList = Object.values(objects)
  const frames = objectList.filter((o) => o.type === "frame") as FrameObject[]
  const notes = objectList.filter((o) => o.type === "sticky-note") as StickyNoteObject[]
  const texts = objectList.filter((o) => o.type === "text") as TextObject[]
  const lines = objectList.filter((o) => o.type === "line") as LineObject[]

  let md = `# ${boardTitle || "Zen Atelier Whiteboard"}\n\n`
  md += `*Exported on ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}*\n\n`

  // Group notes by frame if any
  const assignedNoteIds = new Set<string>()

  if (frames.length > 0) {
    frames.forEach((frame) => {
      md += `## Frame: ${frame.title || "Section"}\n\n`
      const containedNotes = notes.filter((n) => {
        return (
          n.x >= frame.x &&
          n.x + n.width <= frame.x + frame.width &&
          n.y >= frame.y &&
          n.y + n.height <= frame.y + frame.height
        )
      })

      if (containedNotes.length === 0) {
        md += `*(Empty section)*\n\n`
      } else {
        containedNotes.forEach((n) => {
          assignedNoteIds.add(n.id)
          const content = n.content?.trim() || "Empty note"
          md += `### Note\n`
          md += `${content}\n\n`
        })
      }
    })
  }

  // Unassigned Notes
  const unassignedNotes = notes.filter((n) => !assignedNoteIds.has(n.id))
  if (unassignedNotes.length > 0) {
    md += `## Notes & Thoughts\n\n`
    unassignedNotes.forEach((n) => {
      const content = n.content?.trim() || "Empty note"
      md += `### Note\n`
      md += `${content}\n\n`
    })
  }

  // Headings & Text Elements
  if (texts.length > 0) {
    md += `## Text & Callouts\n\n`
    texts.forEach((t) => {
      md += `- ${t.content?.trim() || "Empty text"}\n`
    })
    md += "\n"
  }

  // Connections
  if (lines.length > 0) {
    md += `## Connections & Relationships\n\n`
    lines.forEach((l) => {
      const fromObj = l.fromId ? objects[l.fromId] : null
      const toObj = l.toId ? objects[l.toId] : null
      if (fromObj && toObj) {
        const fromName = (fromObj as any).content?.slice(0, 20) || (fromObj as any).title || fromObj.type
        const toName = (toObj as any).content?.slice(0, 20) || (toObj as any).title || toObj.type
        const rel = l.label?.trim() ? ` --[${l.label.trim()}]--> ` : " ➔ "
        md += `- **${fromName}**${rel}**${toName}**\n`
      }
    })
  }

  return md
}

export function exportToSVG(objects: Record<string, CanvasObject>, atmosphere: "morning" | "hearth"): string {
  const objectList = Object.values(objects)
  if (objectList.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><text x="50%" y="50%" text-anchor="middle" fill="#78716c">Whiteboard is empty</text></svg>`
  }

  // Compute bounding box
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  objectList.forEach((obj) => {
    minX = Math.min(minX, obj.x)
    minY = Math.min(minY, obj.y)
    maxX = Math.max(maxX, obj.x + (obj.width || 100))
    maxY = Math.max(maxY, obj.y + (obj.height || 100))
  })

  const padding = 60
  minX -= padding
  minY -= padding
  maxX += padding
  maxY += padding

  const width = Math.max(maxX - minX, 400)
  const height = Math.max(maxY - minY, 300)

  const bgColor = atmosphere === "hearth" ? "#161615" : "#faf9f5"
  const defaultStroke = atmosphere === "hearth" ? "#e7e5e4" : "#1c1917"

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${width}" height="${height}">\n`
  svgContent += `  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bgColor}" />\n`

  objectList.forEach((obj) => {
    if (obj.type === "frame") {
      const frame = obj as FrameObject
      svgContent += `  <rect x="${frame.x}" y="${frame.y}" width="${frame.width}" height="${frame.height}" rx="12" fill="none" stroke="${frame.stroke || "#c25e3e"}" stroke-width="2" stroke-dasharray="6,6" opacity="0.8" />\n`
      svgContent += `  <text x="${frame.x + 16}" y="${frame.y + 24}" font-family="sans-serif" font-size="14" font-weight="bold" fill="${defaultStroke}">${frame.title || "Frame"}</text>\n`
    } else if (obj.type === "rectangle") {
      svgContent += `  <rect x="${obj.x}" y="${obj.y}" width="${obj.width}" height="${obj.height}" rx="8" fill="${obj.fill || "#ffffff"}" stroke="${obj.stroke || defaultStroke}" stroke-width="${obj.strokeWidth || 2}" />\n`
      if ((obj as any).label) {
        const textStr = escapeXml((obj as any).label)
        const approxW = Math.max(textStr.length * 7 + 16, 46)
        const badgeX = obj.x + Math.max(4, (obj.width - approxW) / 2)
        const badgeY = obj.y - 22
        svgContent += `  <rect x="${badgeX}" y="${badgeY}" width="${approxW}" height="18" rx="4" fill="${bgColor}" stroke="${obj.stroke || defaultStroke}" stroke-width="1" opacity="0.95" />\n`
        svgContent += `  <text x="${badgeX + approxW / 2}" y="${badgeY + 13}" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="${defaultStroke}">${textStr}</text>\n`
      }
    } else if (obj.type === "circle") {
      const rx = obj.width / 2
      const ry = obj.height / 2
      svgContent += `  <ellipse cx="${obj.x + rx}" cy="${obj.y + ry}" rx="${rx}" ry="${ry}" fill="${obj.fill || "#ffffff"}" stroke="${obj.stroke || defaultStroke}" stroke-width="${obj.strokeWidth || 2}" />\n`
      if ((obj as any).label) {
        const textStr = escapeXml((obj as any).label)
        const approxW = Math.max(textStr.length * 7 + 16, 46)
        const badgeX = obj.x + rx - approxW / 2
        const badgeY = obj.y - 22
        svgContent += `  <rect x="${badgeX}" y="${badgeY}" width="${approxW}" height="18" rx="4" fill="${bgColor}" stroke="${obj.stroke || defaultStroke}" stroke-width="1" opacity="0.95" />\n`
        svgContent += `  <text x="${badgeX + approxW / 2}" y="${badgeY + 13}" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle" fill="${defaultStroke}">${textStr}</text>\n`
      }
    } else if (obj.type === "sticky-note") {
      const note = obj as StickyNoteObject
      svgContent += `  <rect x="${note.x}" y="${note.y}" width="${note.width}" height="${note.height}" rx="8" fill="${note.color || note.fill || "#fefae0"}" stroke="rgba(0,0,0,0.08)" stroke-width="1" />\n`
      const lines = (note.content || "").split("\n")
      let lineY = note.y + 24
      lines.forEach((l) => {
        svgContent += `  <text x="${note.x + 14}" y="${lineY}" font-family="sans-serif" font-size="13" fill="#1c1917">${escapeXml(l)}</text>\n`
        lineY += 18
      })
    } else if (obj.type === "text") {
      const text = obj as TextObject
      svgContent += `  <text x="${text.x}" y="${text.y + 20}" font-family="${text.fontFamily || "sans-serif"}" font-size="${text.fontSize || 18}" fill="${text.fill || defaultStroke}">${escapeXml(text.content || "")}</text>\n`
    } else if (obj.type === "line") {
      const line = obj as LineObject
      let p1 = line.points?.[0] || { x: line.x, y: line.y }
      let p2 = line.points?.[1] || { x: line.x + line.width, y: line.y + line.height }

      if (line.fromId && objects[line.fromId]) {
        const fromObj = objects[line.fromId]
        const w = fromObj.width || 50
        const h = fromObj.height || 50
        if (line.fromAnchor === 'n') p1 = { x: fromObj.x + w / 2, y: fromObj.y }
        else if (line.fromAnchor === 's') p1 = { x: fromObj.x + w / 2, y: fromObj.y + h }
        else if (line.fromAnchor === 'e') p1 = { x: fromObj.x + w, y: fromObj.y + h / 2 }
        else if (line.fromAnchor === 'w') p1 = { x: fromObj.x, y: fromObj.y + h / 2 }
      }

      if (line.toId && objects[line.toId]) {
        const toObj = objects[line.toId]
        const w = toObj.width || 50
        const h = toObj.height || 50
        if (line.toAnchor === 'n') p2 = { x: toObj.x + w / 2, y: toObj.y }
        else if (line.toAnchor === 's') p2 = { x: toObj.x + w / 2, y: toObj.y + h }
        else if (line.toAnchor === 'e') p2 = { x: toObj.x + w, y: toObj.y + h / 2 }
        else if (line.toAnchor === 'w') p2 = { x: toObj.x, y: toObj.y + h / 2 }
      }

      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const dist = Math.hypot(dx, dy)
      const curvature = Math.max(32, Math.min(dist * 0.45, 170))

      let d1x = line.fromAnchor === 'e' ? 1 : line.fromAnchor === 'w' ? -1 : 0
      let d1y = line.fromAnchor === 's' ? 1 : line.fromAnchor === 'n' ? -1 : 0
      if (!d1x && !d1y) {
        if (Math.abs(dx) > Math.abs(dy)) d1x = dx >= 0 ? 1 : -1
        else d1y = dy >= 0 ? 1 : -1
      }

      let d2x = line.toAnchor === 'e' ? 1 : line.toAnchor === 'w' ? -1 : 0
      let d2y = line.toAnchor === 's' ? 1 : line.toAnchor === 'n' ? -1 : 0
      if (!d2x && !d2y) {
        if (Math.abs(dx) > Math.abs(dy)) d2x = dx >= 0 ? -1 : 1
        else d2y = dy >= 0 ? -1 : 1
      }

      const cp1x = p1.x + d1x * curvature
      const cp1y = p1.y + d1y * curvature
      const cp2x = p2.x + d2x * curvature
      const cp2y = p2.y + d2y * curvature

      svgContent += `  <path d="M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}" fill="none" stroke="${line.stroke || "#c25e3e"}" stroke-width="${line.strokeWidth || 2.5}" stroke-linecap="round" />\n`

      // Arrow head at p2
      const angle = Math.atan2(p2.y - cp2y, p2.x - cp2x)
      const headLen = 14
      const a1x = p2.x - headLen * Math.cos(angle - Math.PI / 6)
      const a1y = p2.y - headLen * Math.sin(angle - Math.PI / 6)
      const a2x = p2.x - headLen * Math.cos(angle + Math.PI / 6)
      const a2y = p2.y - headLen * Math.sin(angle + Math.PI / 6)
      svgContent += `  <polygon points="${p2.x},${p2.y} ${a1x},${a1y} ${a2x},${a2y}" fill="${line.stroke || "#c25e3e"}" />\n`

      // Midpoint badge
      if (line.label?.trim()) {
        const mx = 0.125 * p1.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * p2.x
        const my = 0.125 * p1.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * p2.y
        const labelW = Math.max(line.label.length * 7 + 16, 50)
        svgContent += `  <rect x="${mx - labelW / 2}" y="${my - 10}" width="${labelW}" height="20" rx="10" fill="${bgColor}" stroke="${line.stroke || "#c25e3e"}" stroke-width="1" />\n`
        svgContent += `  <text x="${mx}" y="${my + 4}" font-family="sans-serif" font-size="11" text-anchor="middle" fill="${defaultStroke}">${escapeXml(line.label.trim())}</text>\n`
      }
    } else if (obj.type === "pen") {
      const pen = obj as any
      if (pen.points && pen.points.length > 1) {
        let d = `M ${pen.points[0].x} ${pen.points[0].y}`
        for (let i = 1; i < pen.points.length; i++) {
          d += ` L ${pen.points[i].x} ${pen.points[i].y}`
        }
        svgContent += `  <path d="${d}" fill="none" stroke="${pen.stroke || defaultStroke}" stroke-width="${pen.strokeWidth || 2.5}" stroke-linecap="round" stroke-linejoin="round" />\n`
      }
    }
  })

  svgContent += `</svg>`
  return svgContent
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;"
      case ">":
        return "&gt;"
      case "&":
        return "&amp;"
      case "'":
        return "&apos;"
      case '"':
        return "&quot;"
      default:
        return c
    }
  })
}
