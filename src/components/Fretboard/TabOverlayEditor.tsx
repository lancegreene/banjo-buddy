// ─── TabOverlayEditor — Visual overlay for verifying/correcting OCR results ───
//
// Shows the original tab image with detected string lines and note positions
// overlaid. Users can adjust lines, add/remove/edit notes, then confirm.

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

interface EditorLine {
  lineNum: number   // 1-5
  y: number         // current Y in image space
  originalY: number // detected Y for reset
}

interface EditorNote {
  id: string
  lineNum: number   // which string (1-5)
  centerX: number   // X in image space
  fret: number | null // null = unknown
  clusterWidth: number
}

type Mode =
  | { type: 'idle' }
  | { type: 'dragging-line'; lineNum: number; offsetY: number }
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
  | { type: 'MOVE_LINE'; lineNum: number; y: number }
  | { type: 'MOVE_NOTE'; noteId: string; centerX: number }
  | { type: 'SET_FRET'; noteId: string; fret: number | null }
  | { type: 'ADD_NOTE'; note: EditorNote }
  | { type: 'DELETE_NOTE'; noteId: string }
  | { type: 'SET_FRETS_BATCH'; frets: (number | null)[] }
  | { type: 'RESET_LINES' }

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'INIT':
      return { lines: action.lines, notes: action.notes, mode: { type: 'idle' } }
    case 'SET_MODE':
      return { ...state, mode: action.mode }
    case 'MOVE_LINE':
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.lineNum === action.lineNum ? { ...l, y: action.y } : l
        ),
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
        mode: state.mode.type === 'editing-fret' && (state.mode as any).noteId === action.noteId
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
        lines: state.lines.map((l) => ({ ...l, y: l.originalY })),
      }
    default:
      return state
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STRING_COLORS: Record<number, string> = {
  1: '#e74c3c', // red    — string 1 (D4)
  2: '#f39c12', // orange — string 2 (B3)
  3: '#27ae60', // green  — string 3 (G3)
  4: '#3498db', // blue   — string 4 (D3)
  5: '#9b59b6', // purple — string 5 (G4)
}

const NOTE_RADIUS = 14
const LINE_HIT_ZONE = 10
const NOTE_HIT_ZONE = NOTE_RADIUS + 4

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
              editorLines.push({ lineNum: i + 1, y: lineYs[i], originalY: lineYs[i] })
            }
            detectedNotes = detectNotePositions(ctx, w, h, lineYs)
          } else {
            // No lines detected — create evenly spaced default lines
            const gap = Math.round(h / 6)
            for (let i = 0; i < 5; i++) {
              const y = gap + i * gap * 0.8
              editorLines.push({ lineNum: i + 1, y, originalY: y })
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

    // 2. String lines
    for (const line of state.lines) {
      const cy = line.y * scale
      const isDragging = state.mode.type === 'dragging-line' && state.mode.lineNum === line.lineNum

      ctx.strokeStyle = STRING_COLORS[line.lineNum]
      ctx.globalAlpha = isDragging ? 0.8 : 0.45
      ctx.lineWidth = isDragging ? 3 : 2
      ctx.setLineDash(isDragging ? [] : [8, 4])
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(displayW, cy)
      ctx.stroke()
      ctx.setLineDash([])

      // Line label on left
      ctx.globalAlpha = 0.9
      ctx.fillStyle = STRING_COLORS[line.lineNum]
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const labels: Record<number, string> = { 1: 'D', 2: 'B', 3: 'G', 4: 'd', 5: 'g' }
      ctx.fillText(labels[line.lineNum], 4, cy)
    }

    ctx.globalAlpha = 1

    // 3. Note circles
    const sortedNotes = [...state.notes].sort((a, b) => a.centerX - b.centerX)
    for (const note of sortedNotes) {
      const line = state.lines.find((l) => l.lineNum === note.lineNum)
      if (!line) continue

      const cx = note.centerX * scale
      const cy = line.y * scale
      const r = NOTE_RADIUS * scale / (imgDims.w / 400) // scale radius relative to image size
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
  }, [state, imgDims, hoverNoteId])

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
      const dx = imgX - note.centerX
      const dy = imgY - line.y
      if (Math.sqrt(dx * dx + dy * dy) < hitR) return note
    }
    return null
  }

  function findLineAtY(imgY: number): EditorLine | null {
    const hitZone = LINE_HIT_ZONE / getScale() * 2
    for (const line of state.lines) {
      if (Math.abs(imgY - line.y) < hitZone) return line
    }
    return null
  }

  function isDeleteButtonHit(note: EditorNote, imgX: number, imgY: number): boolean {
    const line = state.lines.find((l) => l.lineNum === note.lineNum)
    if (!line) return false
    const scale = getScale()
    const radius = Math.max(10, Math.min(20, NOTE_RADIUS * scale / (imgDims.w / 400)))
    const r = radius / scale
    const dx = note.centerX + r * 0.7
    const dy = line.y - r * 0.7
    const dist = Math.sqrt((imgX - dx) ** 2 + (imgY - dy) ** 2)
    return dist < 10 / scale
  }

  // ─── Pointer handlers ──────────────────────────────────────────────────────

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    const pos = getPointerPos(e)
    const img = canvasToImg(pos.x, pos.y)

    // Check delete button first
    for (const note of state.notes) {
      if (hoverNoteId === note.id && isDeleteButtonHit(note, img.x, img.y)) {
        dispatch({ type: 'DELETE_NOTE', noteId: note.id })
        return
      }
    }

    // Check note hit
    const hitNote = findNoteAtPos(img.x, img.y)
    if (hitNote) {
      if (state.mode.type === 'editing-fret' && state.mode.noteId === hitNote.id) return
      // Start dragging or editing
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

    // Check line hit
    const hitLine = findLineAtY(img.y)
    if (hitLine) {
      if (adjustLines) {
        // Drag line
        dispatch({
          type: 'SET_MODE',
          mode: { type: 'dragging-line', lineNum: hitLine.lineNum, offsetY: img.y - hitLine.y },
        })
        canvasRef.current?.setPointerCapture(e.pointerId)
      } else {
        // Add note
        const newNote: EditorNote = {
          id: crypto.randomUUID(),
          lineNum: hitLine.lineNum,
          centerX: img.x,
          fret: null,
          clusterWidth: 10,
        }
        dispatch({ type: 'ADD_NOTE', note: newNote })
        // Open fret editor immediately
        dispatch({ type: 'SET_MODE', mode: { type: 'editing-fret', noteId: newNote.id } })
        setFretInput('')
      }
      return
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const pos = getPointerPos(e)
    const img = canvasToImg(pos.x, pos.y)

    if (state.mode.type === 'dragging-line') {
      const newY = Math.max(0, Math.min(imgDims.h, img.y - state.mode.offsetY))
      dispatch({ type: 'MOVE_LINE', lineNum: state.mode.lineNum, y: newY })
      return
    }

    if (state.mode.type === 'dragging-note') {
      const newX = Math.max(0, Math.min(imgDims.w, img.x - state.mode.offsetX))
      dispatch({ type: 'MOVE_NOTE', noteId: state.mode.noteId, centerX: newX })
      return
    }

    // Hover detection for delete button
    const hitNote = findNoteAtPos(img.x, img.y)
    setHoverNoteId(hitNote?.id ?? null)
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (state.mode.type === 'dragging-note') {
      // If barely moved, treat as a click → open fret editor
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
    if (state.mode.type === 'dragging-line' || state.mode.type === 'dragging-note') {
      dispatch({ type: 'SET_MODE', mode: { type: 'idle' } })
    }
  }

  // ─── Fret editor position ──────────────────────────────────────────────────

  function getFretEditorPos(): { left: number; top: number } | null {
    if (state.mode.type !== 'editing-fret') return null
    const note = state.notes.find((n) => n.id === state.mode.noteId)
    if (!note) return null
    const line = state.lines.find((l) => l.lineNum === note.lineNum)
    if (!line) return null
    const c = imgToCanvas(note.centerX, line.y)
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
      // Create a fresh canvas with the image for annotation
      const { ctx: origCtx, w, h } = await imageToCanvas(imageBlob)

      // Sort notes left-to-right
      const sorted = [...state.notes].sort((a, b) => a.centerX - b.centerX)

      // Draw arrows at note positions (same as extractTabFromImage)
      const lineGap = state.lines.length >= 2
        ? Math.abs(state.lines[1].y - state.lines[0].y)
        : 30
      const arrowY = Math.max(0, state.lines[0].y - lineGap)
      const fontSize = Math.max(10, Math.round(lineGap * 0.4))
      origCtx.font = `bold ${fontSize}px sans-serif`
      origCtx.textAlign = 'center'

      for (let i = 0; i < sorted.length; i++) {
        const note = sorted[i]
        const line = state.lines.find((l) => l.lineNum === note.lineNum)
        if (!line) continue
        const ny = line.y

        // Red arrow
        origCtx.strokeStyle = '#FF0000'
        origCtx.lineWidth = 2
        origCtx.beginPath()
        origCtx.moveTo(note.centerX, arrowY + fontSize + 4)
        origCtx.lineTo(note.centerX, ny - lineGap * 0.3)
        origCtx.stroke()

        // Arrowhead
        origCtx.fillStyle = '#FF0000'
        origCtx.beginPath()
        origCtx.moveTo(note.centerX, ny - lineGap * 0.25)
        origCtx.lineTo(note.centerX - 4, ny - lineGap * 0.4)
        origCtx.lineTo(note.centerX + 4, ny - lineGap * 0.4)
        origCtx.closePath()
        origCtx.fill()

        // Number label
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

      // Parse response
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
            {state.lines.length > 0
              ? `Detected ${state.lines.length} string lines and ${noteCount} notes. `
              : 'No lines detected — adjust manually. '}
            {adjustLines
              ? 'Drag lines to adjust positions.'
              : 'Click a note to set its fret number. Click a line to add a note.'}
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
            style={{ touchAction: 'none' }}
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
        {noteCount > 0 && (
          <div className="tab-overlay-summary">
            {[...state.notes].sort((a, b) => a.centerX - b.centerX).map((n) => {
              const labels: Record<number, string> = { 1: 'D', 2: 'B', 3: 'G', 4: 'd', 5: 'g' }
              return (
                <span
                  key={n.id}
                  className="tab-overlay-summary-note"
                  style={{
                    borderColor: STRING_COLORS[n.lineNum],
                    color: STRING_COLORS[n.lineNum],
                  }}
                >
                  {labels[n.lineNum]}:{n.fret ?? '?'}
                </span>
              )
            })}
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
            <button
              className="btn btn-sm"
              onClick={() => dispatch({ type: 'RESET_LINES' })}
            >
              Reset Lines
            </button>
            <button
              className="btn btn-sm"
              onClick={handleReadFrets}
              disabled={readingFrets || noteCount === 0}
            >
              {readingFrets ? 'Reading...' : 'Read Frets (AI)'}
            </button>
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
