// ─── TabOverlayEditor — Visual overlay for verifying/correcting OCR results ───
//
// Shows the original tab image with detected string lines and note positions
// overlaid. Lines use polyline control points to handle curved/distorted scans.
// Users can adjust lines, add/remove/edit notes, then confirm.

import { useState, useRef, useEffect, useCallback, useReducer } from 'react'
import {
  imageToCanvas,
  detectStaffLines,
  detectNotePositions,
  canvasToBase64,
  callVisionModel,
  fingerForLine,
  type DetectedNote,
  type OcrProgress,
} from '../../engine/tabImageOcr'
import { getNoteAtFret, type FretNote } from '../../data/fretboardNotes'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ControlPoint {
  x: number // image-space
  y: number // image-space
}

interface EditorLine {
  lineNum: number          // 1-5
  points: ControlPoint[]   // sorted by x, defines the polyline path
  originalPoints: ControlPoint[]
}

interface EditorNote {
  id: string
  lineNum: number      // which string (1-5)
  centerX: number      // X in image space
  fret: number | null  // null = unknown
  clusterWidth: number
}

type Mode =
  | { type: 'idle' }
  | { type: 'dragging-cp'; lineNum: number; pointIdx: number; offsetY: number }
  | { type: 'dragging-note'; noteId: string; offsetX: number }
  | { type: 'editing-fret'; noteId: string }

interface EditorState {
  lines: EditorLine[]
  notes: EditorNote[]
  mode: Mode
}

type Action =
  | { type: 'INIT'; lines: EditorLine[]; notes: EditorNote[] }
  | { type: 'SET_MODE'; mode: Mode }
  | { type: 'MOVE_CP'; lineNum: number; pointIdx: number; y: number }
  | { type: 'ADD_CP'; lineNum: number; point: ControlPoint }
  | { type: 'DELETE_CP'; lineNum: number; pointIdx: number }
  | { type: 'MOVE_NOTE'; noteId: string; centerX: number }
  | { type: 'SET_FRET'; noteId: string; fret: number | null }
  | { type: 'ADD_NOTE'; note: EditorNote }
  | { type: 'DELETE_NOTE'; noteId: string }
  | { type: 'SET_FRETS_BATCH'; frets: (number | null)[] }
  | { type: 'RESET_LINES' }
  | { type: 'REDETECT_NOTES'; notes: EditorNote[] }

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'INIT':
      return { lines: action.lines, notes: action.notes, mode: { type: 'idle' } }
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'MOVE_CP':
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.lineNum === action.lineNum
            ? {
                ...l,
                points: l.points.map((p, i) =>
                  i === action.pointIdx ? { ...p, y: action.y } : p
                ),
              }
            : l
        ),
      }
    case 'ADD_CP': {
      return {
        ...state,
        lines: state.lines.map((l) => {
          if (l.lineNum !== action.lineNum) return l
          const pts = [...l.points, action.point].sort((a, b) => a.x - b.x)
          return { ...l, points: pts }
        }),
      }
    }
    case 'DELETE_CP':
      return {
        ...state,
        lines: state.lines.map((l) => {
          if (l.lineNum !== action.lineNum) return l
          if (l.points.length <= 2) return l // keep at least 2 points
          return { ...l, points: l.points.filter((_, i) => i !== action.pointIdx) }
        }),
      }
    case 'MOVE_NOTE':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.noteId ? { ...n, centerX: action.centerX } : n
        ),
      }
    case 'SET_FRET':
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.noteId ? { ...n, fret: action.fret } : n
        ),
      }
    case 'ADD_NOTE':
      return { ...state, notes: [...state.notes, action.note] }
    case 'DELETE_NOTE':
      return {
        ...state,
        notes: state.notes.filter((n) => n.id !== action.noteId),
        mode: state.mode.type === 'editing-fret' && state.mode.noteId === action.noteId
          ? { type: 'idle' }
          : state.mode,
      }
    case 'SET_FRETS_BATCH': {
      const sorted = [...state.notes].sort((a, b) => a.centerX - b.centerX)
      const updated = state.notes.map((n) => {
        const idx = sorted.indexOf(n)
        if (idx >= 0 && idx < action.frets.length && action.frets[idx] != null) {
          return { ...n, fret: action.frets[idx] }
        }
        return n
      })
      return { ...state, notes: updated }
    }
    case 'RESET_LINES':
      return {
        ...state,
        lines: state.lines.map((l) => ({
          ...l,
          points: l.originalPoints.map((p) => ({ ...p })),
        })),
      }
    case 'REDETECT_NOTES':
      return { ...state, notes: action.notes }
    default:
      return state
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Interpolate Y along a polyline at a given X position */
function getLineYAtX(points: ControlPoint[], x: number): number {
  if (points.length === 0) return 0
  if (points.length === 1) return points[0].y
  if (x <= points[0].x) return points[0].y
  if (x >= points[points.length - 1].x) return points[points.length - 1].y

  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) {
      const t = (x - points[i].x) / (points[i + 1].x - points[i].x)
      return points[i].y + t * (points[i + 1].y - points[i].y)
    }
  }
  return points[points.length - 1].y
}

/** Distance from point to nearest segment of a polyline */
function distToPolyline(points: ControlPoint[], px: number, py: number): number {
  let minDist = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const dist = distToSegment(points[i], points[i + 1], px, py)
    if (dist < minDist) minDist = dist
  }
  return minDist
}

function distToSegment(a: ControlPoint, b: ControlPoint, px: number, py: number): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.sqrt((px - a.x) ** 2 + (py - a.y) ** 2)
  let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = a.x + t * dx
  const cy = a.y + t * dy
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
}

/** Create initial control points for a line from a single Y value */
function makeLinePoints(y: number, imgW: number, numPoints: number = 5): ControlPoint[] {
  const pts: ControlPoint[] = []
  for (let i = 0; i < numPoints; i++) {
    const x = (i / (numPoints - 1)) * imgW
    pts.push({ x, y })
  }
  return pts
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STRING_COLORS: Record<number, string> = {
  1: '#e74c3c', // red    — string 1 (D4)
  2: '#f39c12', // orange — string 2 (B3)
  3: '#27ae60', // green  — string 3 (G3)
  4: '#3498db', // blue   — string 4 (D3)
  5: '#9b59b6', // purple — string 5 (G4)
}

const STRING_LABELS: Record<number, string> = { 1: 'D', 2: 'B', 3: 'G', 4: 'd', 5: 'g' }

const NOTE_RADIUS = 14
const CP_RADIUS = 6
const LINE_HIT_ZONE = 15
const NOTE_HIT_ZONE = NOTE_RADIUS + 4
const CP_HIT_ZONE = CP_RADIUS + 6

// ─── Component ────────────────────────────────────────────────────────────────

interface TabOverlayEditorProps {
  imageBlob: Blob
  onConfirm: (notes: FretNote[]) => void
  onCancel: () => void
}

export function TabOverlayEditor({ imageBlob, onConfirm, onCancel }: TabOverlayEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const ctxDataRef = useRef<{ ctx: CanvasRenderingContext2D; w: number; h: number } | null>(null)

  const [state, dispatch] = useReducer(reducer, {
    lines: [],
    notes: [],
    mode: { type: 'idle' },
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [adjustLines, setAdjustLines] = useState(false)
  const [readingFrets, setReadingFrets] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<string | null>(null)
  const [fretInput, setFretInput] = useState('')
  const [hoverNoteId, setHoverNoteId] = useState<string | null>(null)

  // Image dimensions in image-space
  const [imgDims, setImgDims] = useState({ w: 0, h: 0 })

  // ─── Initialize: load image, detect lines + notes ──────────────────────────

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const { ctx, w, h } = await imageToCanvas(imageBlob)
        if (cancelled) return

        ctxDataRef.current = { ctx, w, h }
        setImgDims({ w, h })

        // Load image for canvas background
        const img = new Image()
        const url = URL.createObjectURL(imageBlob)
        img.onload = () => {
          if (cancelled) return
          imgRef.current = img

          // Detect
          const lineYs = detectStaffLines(ctx, w, h)
          const editorLines: EditorLine[] = []
          let detectedNotes: DetectedNote[] = []

          if (lineYs) {
            for (let i = 0; i < lineYs.length; i++) {
              const pts = makeLinePoints(lineYs[i], w)
              editorLines.push({
                lineNum: i + 1,
                points: pts,
                originalPoints: pts.map((p) => ({ ...p })),
              })
            }
            detectedNotes = detectNotePositions(ctx, w, h, lineYs)
          } else {
            // No lines detected — create evenly spaced default lines
            const gap = Math.round(h / 6)
            for (let i = 0; i < 5; i++) {
              const y = gap + i * gap * 0.8
              const pts = makeLinePoints(y, w)
              editorLines.push({
                lineNum: i + 1,
                points: pts,
                originalPoints: pts.map((p) => ({ ...p })),
              })
            }
          }

          const editorNotes: EditorNote[] = detectedNotes.map((n) => ({
            id: crypto.randomUUID(),
            lineNum: n.lineNum,
            centerX: n.centerX,
            fret: null,
            clusterWidth: n.clusterWidth,
          }))

          dispatch({ type: 'INIT', lines: editorLines, notes: editorNotes })
          setLoading(false)
        }
        img.onerror = () => {
          if (!cancelled) setError('Failed to load image')
        }
        img.src = url
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Detection failed')
      }
    }

    init()
    return () => { cancelled = true }
  }, [imageBlob])

  // ─── Coordinate transforms ─────────────────────────────────────────────────

  const getScale = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || imgDims.w === 0) return 1
    return canvas.clientWidth / imgDims.w
  }, [imgDims.w])

  const canvasToImg = useCallback((cx: number, cy: number) => {
    const s = getScale()
    return { x: cx / s, y: cy / s }
  }, [getScale])

  const imgToCanvas = useCallback((ix: number, iy: number) => {
    const s = getScale()
    return { x: ix * s, y: iy * s }
  }, [getScale])

  // ─── Draw ───────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    const container = containerRef.current
    if (!canvas || !img || !container) return

    const dpr = window.devicePixelRatio || 1
    const displayW = container.clientWidth
    const displayH = Math.round(displayW * (imgDims.h / imgDims.w)) || 400

    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`
    canvas.width = displayW * dpr
    canvas.height = displayH * dpr

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const scale = displayW / imgDims.w

    // 1. Background image
    ctx.drawImage(img, 0, 0, imgDims.w * scale, imgDims.h * scale)

    // 2. String lines as polylines
    for (const line of state.lines) {
      const isDraggingThis = state.mode.type === 'dragging-cp' && state.mode.lineNum === line.lineNum
      const color = STRING_COLORS[line.lineNum]

      // Draw polyline
      ctx.strokeStyle = color
      ctx.globalAlpha = isDraggingThis ? 0.8 : 0.5
      ctx.lineWidth = isDraggingThis ? 3 : 2
      ctx.setLineDash(adjustLines ? [] : [8, 4])
      ctx.beginPath()
      for (let i = 0; i < line.points.length; i++) {
        const cx = line.points[i].x * scale
        const cy = line.points[i].y * scale
        if (i === 0) ctx.moveTo(cx, cy)
        else ctx.lineTo(cx, cy)
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Line label on left
      ctx.globalAlpha = 0.9
      ctx.fillStyle = color
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(STRING_LABELS[line.lineNum], 4, line.points[0].y * scale)

      // Control point handles (only in adjust mode)
      if (adjustLines) {
        for (let i = 0; i < line.points.length; i++) {
          const px = line.points[i].x * scale
          const py = line.points[i].y * scale
          const isActive = state.mode.type === 'dragging-cp'
            && state.mode.lineNum === line.lineNum
            && state.mode.pointIdx === i

          ctx.beginPath()
          ctx.arc(px, py, isActive ? CP_RADIUS + 2 : CP_RADIUS, 0, Math.PI * 2)
          ctx.fillStyle = isActive ? '#fff' : color
          ctx.globalAlpha = 0.9
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }
    }

    ctx.globalAlpha = 1

    // 3. Note circles
    const sortedNotes = [...state.notes].sort((a, b) => a.centerX - b.centerX)
    for (const note of sortedNotes) {
      const line = state.lines.find((l) => l.lineNum === note.lineNum)
      if (!line) continue

      const noteY = getLineYAtX(line.points, note.centerX)
      const cx = note.centerX * scale
      const cy = noteY * scale
      const r = NOTE_RADIUS * scale / (imgDims.w / 400)
      const radius = Math.max(10, Math.min(20, r))
      const isEditing = state.mode.type === 'editing-fret' && state.mode.noteId === note.id
      const isHover = hoverNoteId === note.id

      // Circle background
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = isEditing ? '#fff' : STRING_COLORS[note.lineNum]
      ctx.globalAlpha = isEditing ? 0.95 : 0.85
      ctx.fill()

      // Circle border
      ctx.strokeStyle = isEditing ? STRING_COLORS[note.lineNum] : '#fff'
      ctx.lineWidth = isEditing ? 2.5 : 1.5
      ctx.stroke()
      ctx.globalAlpha = 1

      // Fret number text
      ctx.fillStyle = isEditing ? STRING_COLORS[note.lineNum] : '#fff'
      ctx.font = `bold ${Math.round(radius * 0.9)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(note.fret != null ? String(note.fret) : '?', cx, cy + 1)

      // Delete button (top-right, on hover)
      if (isHover && state.mode.type !== 'dragging-note') {
        const dx = cx + radius * 0.7
        const dy = cy - radius * 0.7
        const dr = 7
        ctx.beginPath()
        ctx.arc(dx, dy, dr, 0, Math.PI * 2)
        ctx.fillStyle = '#e74c3c'
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 9px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('x', dx, dy)
      }
    }
  }, [state, imgDims, hoverNoteId, adjustLines])

  useEffect(() => { draw() }, [draw])

  // Resize observer
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => draw())
    observer.observe(container)
    return () => observer.disconnect()
  }, [draw])

  // ─── Hit testing ────────────────────────────────────────────────────────────

  function getPointerPos(e: React.PointerEvent): { x: number; y: number } {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function findNoteAtPos(imgX: number, imgY: number): EditorNote | null {
    const scale = getScale()
    const hitR = NOTE_HIT_ZONE / scale
    for (const note of state.notes) {
      const line = state.lines.find((l) => l.lineNum === note.lineNum)
      if (!line) continue
      const noteY = getLineYAtX(line.points, note.centerX)
      const dx = imgX - note.centerX
      const dy = imgY - noteY
      if (Math.sqrt(dx * dx + dy * dy) < hitR) return note
    }
    return null
  }

  function findCpAtPos(imgX: number, imgY: number): { lineNum: number; pointIdx: number } | null {
    const scale = getScale()
    const hitR = CP_HIT_ZONE / scale
    for (const line of state.lines) {
      for (let i = 0; i < line.points.length; i++) {
        const dx = imgX - line.points[i].x
        const dy = imgY - line.points[i].y
        if (Math.sqrt(dx * dx + dy * dy) < hitR) {
          return { lineNum: line.lineNum, pointIdx: i }
        }
      }
    }
    return null
  }

  function findLineAtPos(imgX: number, imgY: number): EditorLine | null {
    const scale = getScale()
    const hitZone = LINE_HIT_ZONE / scale
    let best: EditorLine | null = null
    let bestDist = Infinity
    for (const line of state.lines) {
      const dist = distToPolyline(line.points, imgX, imgY)
      if (dist < hitZone && dist < bestDist) {
        best = line
        bestDist = dist
      }
    }
    return best
  }

  function isDeleteButtonHit(note: EditorNote, imgX: number, imgY: number): boolean {
    const line = state.lines.find((l) => l.lineNum === note.lineNum)
    if (!line) return false
    const scale = getScale()
    const noteY = getLineYAtX(line.points, note.centerX)
    const radius = Math.max(10, Math.min(20, NOTE_RADIUS * scale / (imgDims.w / 400)))
    const r = radius / scale
    const dx = note.centerX + r * 0.7
    const dy = noteY - r * 0.7
    const dist = Math.sqrt((imgX - dx) ** 2 + (imgY - dy) ** 2)
    return dist < 10 / scale
  }

  // ─── Pointer handlers ──────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    const pos = getPointerPos(e)
    const img = canvasToImg(pos.x, pos.y)

    // Check delete button first (only in note mode)
    if (!adjustLines) {
      for (const note of state.notes) {
        if (hoverNoteId === note.id && isDeleteButtonHit(note, img.x, img.y)) {
          dispatch({ type: 'DELETE_NOTE', noteId: note.id })
          return
        }
      }
    }

    // In adjust mode: check control points first, then lines
    if (adjustLines) {
      const cpHit = findCpAtPos(img.x, img.y)
      if (cpHit) {
        const line = state.lines.find((l) => l.lineNum === cpHit.lineNum)
        if (line) {
          dispatch({
            type: 'SET_MODE',
            mode: {
              type: 'dragging-cp',
              lineNum: cpHit.lineNum,
              pointIdx: cpHit.pointIdx,
              offsetY: img.y - line.points[cpHit.pointIdx].y,
            },
          })
          canvasRef.current?.setPointerCapture(e.pointerId)
          return
        }
      }

      // Click on a line segment = add new control point
      const hitLine = findLineAtPos(img.x, img.y)
      if (hitLine) {
        const lineY = getLineYAtX(hitLine.points, img.x)
        dispatch({
          type: 'ADD_CP',
          lineNum: hitLine.lineNum,
          point: { x: img.x, y: lineY },
        })
        // Find the index of the new point and start dragging it
        // It will be at the position sorted by x
        const newPoints = [...hitLine.points, { x: img.x, y: lineY }].sort((a, b) => a.x - b.x)
        const newIdx = newPoints.findIndex((p) => Math.abs(p.x - img.x) < 1)
        if (newIdx >= 0) {
          dispatch({
            type: 'SET_MODE',
            mode: { type: 'dragging-cp', lineNum: hitLine.lineNum, pointIdx: newIdx, offsetY: 0 },
          })
          canvasRef.current?.setPointerCapture(e.pointerId)
        }
        return
      }
      return
    }

    // Note mode: check note hit
    const hitNote = findNoteAtPos(img.x, img.y)
    if (hitNote) {
      if (state.mode.type === 'editing-fret' && state.mode.noteId === hitNote.id) return
      dispatch({
        type: 'SET_MODE',
        mode: { type: 'dragging-note', noteId: hitNote.id, offsetX: img.x - hitNote.centerX },
      })
      canvasRef.current?.setPointerCapture(e.pointerId)
      return
    }

    // Close any open fret editor
    if (state.mode.type === 'editing-fret') {
      dispatch({ type: 'SET_MODE', mode: { type: 'idle' } })
    }

    // Click on line = add note
    const hitLine = findLineAtPos(img.x, img.y)
    if (hitLine) {
      const newNote: EditorNote = {
        id: crypto.randomUUID(),
        lineNum: hitLine.lineNum,
        centerX: img.x,
        fret: null,
        clusterWidth: 10,
      }
      dispatch({ type: 'ADD_NOTE', note: newNote })
      dispatch({ type: 'SET_MODE', mode: { type: 'editing-fret', noteId: newNote.id } })
      setFretInput('')
      return
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const pos = getPointerPos(e)
    const img = canvasToImg(pos.x, pos.y)

    if (state.mode.type === 'dragging-cp') {
      const newY = Math.max(0, Math.min(imgDims.h, img.y - state.mode.offsetY))
      dispatch({ type: 'MOVE_CP', lineNum: state.mode.lineNum, pointIdx: state.mode.pointIdx, y: newY })
      return
    }

    if (state.mode.type === 'dragging-note') {
      const newX = Math.max(0, Math.min(imgDims.w, img.x - state.mode.offsetX))
      dispatch({ type: 'MOVE_NOTE', noteId: state.mode.noteId, centerX: newX })
      return
    }

    // Hover detection
    if (!adjustLines) {
      const hitNote = findNoteAtPos(img.x, img.y)
      setHoverNoteId(hitNote?.id ?? null)
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (state.mode.type === 'dragging-note') {
      const note = state.notes.find((n) => n.id === state.mode.noteId)
      if (note) {
        const pos = getPointerPos(e)
        const img = canvasToImg(pos.x, pos.y)
        const dx = Math.abs(img.x - note.centerX)
        if (dx < 3) {
          dispatch({ type: 'SET_MODE', mode: { type: 'editing-fret', noteId: note.id } })
          setFretInput(note.fret != null ? String(note.fret) : '')
          return
        }
      }
    }
    if (state.mode.type === 'dragging-cp' || state.mode.type === 'dragging-note') {
      dispatch({ type: 'SET_MODE', mode: { type: 'idle' } })
    }
  }

  // ─── Re-detect notes along current lines ───────────────────────────────────

  function handleRedetect() {
    if (!ctxDataRef.current) return
    const { ctx, w, h } = ctxDataRef.current
    // Build flat lineYs from the center of each polyline for detection
    // Use a multi-sample approach: detect at several X positions
    const sampleCount = 10
    const allNotes: EditorNote[] = []

    for (let si = 0; si < sampleCount; si++) {
      const sampleX = (si + 0.5) / sampleCount * w
      const localLineYs = state.lines.map((l) => getLineYAtX(l.points, sampleX))

      // Detect notes in a vertical strip around this X
      const stripW = Math.ceil(w / sampleCount)
      const stripX0 = Math.max(0, Math.round(sampleX - stripW / 2))
      const stripX1 = Math.min(w, Math.round(sampleX + stripW / 2))

      // Use the existing detection on a narrow strip
      const detected = detectNotePositions(ctx, w, h, localLineYs)
      for (const n of detected) {
        if (n.centerX >= stripX0 && n.centerX < stripX1) {
          // Check for duplicates (within 10px)
          const isDupe = allNotes.some(
            (existing) => Math.abs(existing.centerX - n.centerX) < 10 && existing.lineNum === n.lineNum
          )
          if (!isDupe) {
            allNotes.push({
              id: crypto.randomUUID(),
              lineNum: n.lineNum,
              centerX: n.centerX,
              fret: null,
              clusterWidth: n.clusterWidth,
            })
          }
        }
      }
    }

    dispatch({ type: 'REDETECT_NOTES', notes: allNotes })
    setOcrStatus(`Re-detected ${allNotes.length} notes along adjusted lines`)
    setTimeout(() => setOcrStatus(null), 3000)
  }

  // ─── Fret editor position ──────────────────────────────────────────────────

  function getFretEditorPos(): { left: number; top: number } | null {
    if (state.mode.type !== 'editing-fret') return null
    const note = state.notes.find((n) => n.id === state.mode.noteId)
    if (!note) return null
    const line = state.lines.find((l) => l.lineNum === note.lineNum)
    if (!line) return null
    const noteY = getLineYAtX(line.points, note.centerX)
    const c = imgToCanvas(note.centerX, noteY)
    return { left: c.x, top: c.y - 32 }
  }

  function commitFretEdit() {
    if (state.mode.type !== 'editing-fret') return
    const val = parseInt(fretInput, 10)
    const fret = !isNaN(val) && val >= 0 && val <= 24 ? val : null
    dispatch({ type: 'SET_FRET', noteId: state.mode.noteId, fret })
    dispatch({ type: 'SET_MODE', mode: { type: 'idle' } })
  }

  // ─── Read Frets (Claude Vision) ────────────────────────────────────────────

  async function handleReadFrets() {
    if (!ctxDataRef.current || state.notes.length === 0) return

    setReadingFrets(true)
    setOcrStatus('Preparing annotated image...')

    try {
      const { ctx: origCtx, w, h } = await imageToCanvas(imageBlob)
      const sorted = [...state.notes].sort((a, b) => a.centerX - b.centerX)

      // Compute line gap from first line's control points
      const avgGaps: number[] = []
      for (let i = 0; i < state.lines.length - 1; i++) {
        const midX = imgDims.w / 2
        const y1 = getLineYAtX(state.lines[i].points, midX)
        const y2 = getLineYAtX(state.lines[i + 1].points, midX)
        avgGaps.push(Math.abs(y2 - y1))
      }
      const lineGap = avgGaps.length > 0 ? avgGaps.reduce((a, b) => a + b) / avgGaps.length : 30

      const arrowY = Math.max(0, getLineYAtX(state.lines[0].points, imgDims.w / 2) - lineGap)
      const fontSize = Math.max(10, Math.round(lineGap * 0.4))
      origCtx.font = `bold ${fontSize}px sans-serif`
      origCtx.textAlign = 'center'

      for (let i = 0; i < sorted.length; i++) {
        const note = sorted[i]
        const line = state.lines.find((l) => l.lineNum === note.lineNum)
        if (!line) continue
        const ny = getLineYAtX(line.points, note.centerX)

        origCtx.strokeStyle = '#FF0000'
        origCtx.lineWidth = 2
        origCtx.beginPath()
        origCtx.moveTo(note.centerX, arrowY + fontSize + 4)
        origCtx.lineTo(note.centerX, ny - lineGap * 0.3)
        origCtx.stroke()

        origCtx.fillStyle = '#FF0000'
        origCtx.beginPath()
        origCtx.moveTo(note.centerX, ny - lineGap * 0.25)
        origCtx.lineTo(note.centerX - 4, ny - lineGap * 0.4)
        origCtx.lineTo(note.centerX + 4, ny - lineGap * 0.4)
        origCtx.closePath()
        origCtx.fill()

        origCtx.fillStyle = '#FF0000'
        origCtx.textBaseline = 'top'
        origCtx.fillText(String(i + 1), note.centerX, arrowY)
      }

      setOcrStatus('Reading fret numbers...')
      const { base64, mediaType } = canvasToBase64(origCtx, w, h)

      const prompt = `This tablature image has ${sorted.length} notes marked with red numbered arrows (1 through ${sorted.length}) pointing down at each note.

For each numbered arrow, read the fret number written on the staff line where the arrow points (digits like 0, 1, 2, 3, etc.).

Output a JSON object with:
- "frets": array of fret numbers in order (e.g. [0,0,0,2,0,0,0,0])

Output ONLY the JSON object, nothing else.`

      const onProgress = (p: OcrProgress) => setOcrStatus(p.status)
      const resp = await callVisionModel(base64, mediaType, prompt, onProgress)

      const jsonMatch = resp.match(/\{[\s\S]*\}/)
      let frets: (number | null)[] = []

      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed.frets)) frets = parsed.frets
        } catch { /* */ }
      }

      if (frets.length === 0) {
        const arrMatch = resp.match(/\[[\s\S]*?\]/)
        if (arrMatch) {
          try { frets = JSON.parse(arrMatch[0]) } catch { /* */ }
        }
      }

      if (frets.length > 0) {
        dispatch({ type: 'SET_FRETS_BATCH', frets })
        setOcrStatus(`Read ${frets.length} fret numbers`)
      } else {
        setOcrStatus('Could not read fret numbers — set them manually')
      }
    } catch (err) {
      setOcrStatus(`Error: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      setReadingFrets(false)
      setTimeout(() => setOcrStatus(null), 4000)
    }
  }

  // ─── Confirm output ────────────────────────────────────────────────────────

  function handleConfirm() {
    const sorted = [...state.notes].sort((a, b) => a.centerX - b.centerX)
    const fretNotes: FretNote[] = sorted.map((n) => ({
      string: n.lineNum,
      fret: n.fret ?? 0,
      note: getNoteAtFret(n.lineNum, n.fret ?? 0),
      finger: fingerForLine(n.lineNum),
    }))
    onConfirm(fretNotes)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="tab-overlay-wrap">
        <div className="tab-overlay-modal">
          <div className="tab-overlay-error">
            <p>Detection failed: {error}</p>
            <button className="btn btn-sm" onClick={onCancel}>Back</button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="tab-overlay-wrap">
        <div className="tab-overlay-modal">
          <div className="tab-overlay-loading">
            <div className="loading-spinner" />
            <p>Detecting tab lines and notes...</p>
          </div>
        </div>
      </div>
    )
  }

  const fretPos = getFretEditorPos()
  const hasUnknownFrets = state.notes.some((n) => n.fret == null)
  const noteCount = state.notes.length

  return (
    <div className="tab-overlay-wrap">
      <div className="tab-overlay-modal">
        <div className="tab-overlay-header">
          <h3>Verify Tab Detection</h3>
          <p>
            {adjustLines
              ? 'Drag control points to bend lines to match the tab. Click a line to add more points.'
              : `${noteCount} notes detected. Click a note to set its fret. Click a line to add a note.`}
          </p>
        </div>

        <div className="tab-overlay-canvas-wrap" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="tab-overlay-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => setHoverNoteId(null)}
            style={{ touchAction: 'none', cursor: adjustLines ? 'grab' : 'pointer' }}
          />

          {/* Inline fret editor */}
          {state.mode.type === 'editing-fret' && fretPos && (
            <div
              className="tab-overlay-fret-editor"
              style={{ left: fretPos.left, top: fretPos.top }}
            >
              <input
                type="number"
                min={0}
                max={24}
                className="tab-overlay-fret-input"
                value={fretInput}
                onChange={(e) => setFretInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitFretEdit()
                  if (e.key === 'Escape') dispatch({ type: 'SET_MODE', mode: { type: 'idle' } })
                }}
                onBlur={commitFretEdit}
                autoFocus
              />
            </div>
          )}
        </div>

        {ocrStatus && (
          <div className="tab-overlay-status">{ocrStatus}</div>
        )}

        {/* Note summary strip */}
        {noteCount > 0 && !adjustLines && (
          <div className="tab-overlay-summary">
            {[...state.notes].sort((a, b) => a.centerX - b.centerX).map((n) => (
              <span
                key={n.id}
                className="tab-overlay-summary-note"
                style={{
                  borderColor: STRING_COLORS[n.lineNum],
                  color: STRING_COLORS[n.lineNum],
                }}
              >
                {STRING_LABELS[n.lineNum]}:{n.fret ?? '?'}
              </span>
            ))}
          </div>
        )}

        <div className="tab-overlay-toolbar">
          <div className="tab-overlay-toolbar-left">
            <button
              className={`btn btn-sm ${adjustLines ? 'btn-primary' : ''}`}
              onClick={() => setAdjustLines(!adjustLines)}
            >
              {adjustLines ? 'Done Adjusting' : 'Adjust Lines'}
            </button>
            {adjustLines && (
              <>
                <button
                  className="btn btn-sm"
                  onClick={() => dispatch({ type: 'RESET_LINES' })}
                >
                  Reset Lines
                </button>
                <button
                  className="btn btn-sm"
                  onClick={handleRedetect}
                >
                  Re-detect Notes
                </button>
              </>
            )}
            {!adjustLines && (
              <button
                className="btn btn-sm"
                onClick={handleReadFrets}
                disabled={readingFrets || noteCount === 0}
              >
                {readingFrets ? 'Reading...' : 'Read Frets (AI)'}
              </button>
            )}
          </div>
          <div className="tab-overlay-toolbar-right">
            <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
            <button
              className="btn btn-sm btn-primary"
              onClick={handleConfirm}
              disabled={noteCount === 0}
              title={hasUnknownFrets ? 'Some frets are unknown (?) — they will default to 0' : ''}
            >
              Confirm {noteCount} Notes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
